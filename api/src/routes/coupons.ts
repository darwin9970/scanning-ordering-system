import { Elysia, t } from 'elysia'
import { eq, and, gte, lte, count, desc, sql } from 'drizzle-orm'
import { db, coupons, userCoupons } from '../db'
import { success, error, pagination } from '../lib/utils'
import { requirePermission, hasPermission } from '../lib/auth'
import { getRedis } from '../lib/redis'
import { logOperation } from '../lib/operation-log'

const COUPON_RATE_PREFIX = 'rate:coupon:'
const COUPON_IDEM_PREFIX = 'idem:coupon:'
const COUPON_RATE_LIMIT = { limit: 20, ttl: 60 } // 每分钟 20 次

type IdempotencyResult = { ok: false; message: string } | { ok: true; redisKey?: string }

function getClientIp(headers: Record<string, string | undefined>) {
  return (
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['x-real-ip'] ||
    headers['cf-connecting-ip'] ||
    'unknown'
  )
}

async function checkRateLimit(key: string) {
  const redis = getRedis()
  if (!redis) return true
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, COUPON_RATE_LIMIT.ttl)
  return count <= COUPON_RATE_LIMIT.limit
}

async function ensureIdempotent(key?: string): Promise<IdempotencyResult> {
  const redis = getRedis()
  if (!key || !redis) return { ok: true }
  const existing = await redis.get(key)
  if (existing) return { ok: false, message: '重复请求，请勿重复提交' }
  await redis.set(key, 'processing', 'EX', 600, 'NX')
  return { ok: true, redisKey: key }
}

async function finalizeIdempotent(redisKey?: string) {
  const redis = getRedis()
  if (redis && redisKey) {
    await redis.set(redisKey, 'done', 'EX', 600)
  }
}

async function releaseIdempotent(redisKey?: string) {
  const redis = getRedis()
  if (redis && redisKey) {
    await redis.del(redisKey)
  }
}

export const couponRoutes = new Elysia({ prefix: '/api/coupons' })
  // 优惠券读取需要 coupon:read 权限
  .use(requirePermission('coupon:read'))
  // ==================== 管理端接口 ====================

  // 获取优惠券列表（管理端）
  .get(
    '/',
    async ({ query }) => {
      const { page, pageSize, storeId, status, type } = query
      const { take, skip } = pagination(page, pageSize)

      const conditions = []
      if (storeId) conditions.push(eq(coupons.storeId, storeId))
      if (status) conditions.push(eq(coupons.status, status as 'ACTIVE' | 'INACTIVE' | 'EXPIRED'))
      if (type) conditions.push(eq(coupons.type, type as 'FIXED' | 'PERCENT' | 'NO_THRESHOLD'))

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const [couponList, totalResult] = await Promise.all([
        db
          .select()
          .from(coupons)
          .where(whereClause)
          .orderBy(desc(coupons.createdAt))
          .limit(take)
          .offset(skip),
        db.select({ count: count() }).from(coupons).where(whereClause)
      ])

      return success({
        list: couponList,
        total: totalResult[0]?.count ?? 0,
        page: page || 1,
        pageSize: take
      })
    },
    {
      query: t.Object({
        page: t.Optional(t.Number()),
        pageSize: t.Optional(t.Number()),
        storeId: t.Optional(t.Number()),
        status: t.Optional(t.String()),
        type: t.Optional(t.String())
      }),
      detail: { tags: ['Coupons'], summary: '获取优惠券列表' }
    }
  )

  // 获取优惠券详情
  .get(
    '/:id',
    async ({ params }) => {
      const [coupon] = await db.select().from(coupons).where(eq(coupons.id, params.id)).limit(1)

      if (!coupon) return error('优惠券不存在', 404)

      // 获取领取统计
      const [stats] = await db
        .select({
          claimed: count(),
          used: sql<number>`count(case when ${userCoupons.status} = 'USED' then 1 end)`
        })
        .from(userCoupons)
        .where(eq(userCoupons.couponId, params.id))

      return success({
        ...coupon,
        stats: {
          claimed: stats?.claimed ?? 0,
          used: stats?.used ?? 0
        }
      })
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ['Coupons'], summary: '获取优惠券详情' }
    }
  )

  // 创建优惠券
  .post(
    '/',
    async ({ body, user, headers }) => {
      if (!user || !hasPermission(user.role, 'coupon:write')) {
        return error('权限不足，需要 coupon:write', 403)
      }

      const ip = getClientIp(headers as Record<string, string | undefined>)
      const rateKey = `${COUPON_RATE_PREFIX}create:${user.id || ip}`
      if (!(await checkRateLimit(rateKey))) {
        return error('操作过于频繁，请稍后重试', 429)
      }

      const idempotencyKey = headers['idempotency-key'] as string | undefined
      const idemKey = idempotencyKey ? `${COUPON_IDEM_PREFIX}create:${idempotencyKey}` : undefined
      const idemResult = await ensureIdempotent(idemKey)
      if (!idemResult.ok) {
        return error(idemResult.message || '重复请求', 409)
      }

      const [coupon] = await db
        .insert(coupons)
        .values({
          storeId: body.storeId,
          name: body.name,
          type: body.type as 'FIXED' | 'PERCENT' | 'NO_THRESHOLD',
          value: body.value.toString(),
          minAmount: (body.minAmount || 0).toString(),
          maxDiscount: body.maxDiscount?.toString(),
          totalCount: body.totalCount ?? -1,
          perUserLimit: body.perUserLimit ?? 1,
          startTime: new Date(body.startTime),
          endTime: new Date(body.endTime),
          description: body.description
        })
        .returning()

      if (!coupon) {
        await releaseIdempotent(idemResult.redisKey)
        return error('优惠券创建失败', 500)
      }

      await logOperation({
        adminId: user.id,
        action: 'coupon_create',
        targetType: 'coupon',
        targetId: coupon.id,
        storeId: coupon.storeId ?? null,
        details: { name: coupon.name, type: coupon.type }
      })

      await finalizeIdempotent(idemResult.redisKey)

      return success(coupon, '优惠券创建成功')
    },
    {
      body: t.Object({
        storeId: t.Optional(t.Number()),
        name: t.String({ minLength: 1, maxLength: 100 }),
        type: t.Union([t.Literal('FIXED'), t.Literal('PERCENT'), t.Literal('NO_THRESHOLD')]),
        value: t.Number({ minimum: 0 }),
        minAmount: t.Optional(t.Number({ minimum: 0 })),
        maxDiscount: t.Optional(t.Number({ minimum: 0 })),
        totalCount: t.Optional(t.Number()),
        perUserLimit: t.Optional(t.Number({ minimum: 1 })),
        startTime: t.String(),
        endTime: t.String(),
        description: t.Optional(t.String())
      }),
      detail: { tags: ['Coupons'], summary: '创建优惠券' }
    }
  )

  // 更新优惠券
  .put(
    '/:id',
    async ({ params, body, user, headers }) => {
      if (!user || !hasPermission(user.role, 'coupon:write')) {
        return error('权限不足，需要 coupon:write', 403)
      }

      const ip = getClientIp(headers as Record<string, string | undefined>)
      const rateKey = `${COUPON_RATE_PREFIX}update:${user.id || ip}`
      if (!(await checkRateLimit(rateKey))) {
        return error('操作过于频繁，请稍后重试', 429)
      }

      const idempotencyKey = headers['idempotency-key'] as string | undefined
      const idemKey = idempotencyKey ? `${COUPON_IDEM_PREFIX}update:${idempotencyKey}` : undefined
      const idemResult = await ensureIdempotent(idemKey)
      if (!idemResult.ok) {
        return error(idemResult.message || '重复请求', 409)
      }

      const updateData: Record<string, unknown> = {}

      if (body.name !== undefined) updateData.name = body.name
      if (body.type !== undefined) updateData.type = body.type
      if (body.value !== undefined) updateData.value = body.value.toString()
      if (body.minAmount !== undefined) updateData.minAmount = body.minAmount.toString()
      if (body.maxDiscount !== undefined) updateData.maxDiscount = body.maxDiscount.toString()
      if (body.totalCount !== undefined) updateData.totalCount = body.totalCount
      if (body.perUserLimit !== undefined) updateData.perUserLimit = body.perUserLimit
      if (body.startTime !== undefined) updateData.startTime = new Date(body.startTime)
      if (body.endTime !== undefined) updateData.endTime = new Date(body.endTime)
      if (body.description !== undefined) updateData.description = body.description
      if (body.status !== undefined) updateData.status = body.status

      const [coupon] = await db
        .update(coupons)
        .set(updateData)
        .where(eq(coupons.id, params.id))
        .returning()

      if (!coupon) {
        await releaseIdempotent(idemResult.redisKey)
        return error('优惠券不存在', 404)
      }

      await logOperation({
        adminId: user.id,
        action: 'coupon_update',
        targetType: 'coupon',
        targetId: coupon.id,
        storeId: coupon.storeId ?? null,
        details: { name: coupon.name, status: coupon.status }
      })

      await finalizeIdempotent(idemResult.redisKey)

      return success(coupon, '优惠券更新成功')
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        name: t.Optional(t.String()),
        type: t.Optional(t.String()),
        value: t.Optional(t.Number()),
        minAmount: t.Optional(t.Number()),
        maxDiscount: t.Optional(t.Number()),
        totalCount: t.Optional(t.Number()),
        perUserLimit: t.Optional(t.Number()),
        startTime: t.Optional(t.String()),
        endTime: t.Optional(t.String()),
        description: t.Optional(t.String()),
        status: t.Optional(t.String())
      }),
      detail: { tags: ['Coupons'], summary: '更新优惠券' }
    }
  )

  // 删除优惠券
  .delete(
    '/:id',
    async ({ params, user, headers }) => {
      if (!user || !hasPermission(user.role, 'coupon:write')) {
        return error('权限不足，需要 coupon:write', 403)
      }

      const ip = getClientIp(headers as Record<string, string | undefined>)
      const rateKey = `${COUPON_RATE_PREFIX}delete:${user.id || ip}`
      if (!(await checkRateLimit(rateKey))) {
        return error('操作过于频繁，请稍后重试', 429)
      }

      const idempotencyKey = headers['idempotency-key'] as string | undefined
      const idemKey = idempotencyKey ? `${COUPON_IDEM_PREFIX}delete:${idempotencyKey}` : undefined
      const idemResult = await ensureIdempotent(idemKey)
      if (!idemResult.ok) {
        return error(idemResult.message || '重复请求', 409)
      }

      // 检查是否有已领取的优惠券
      const [usedCount] = await db
        .select({ count: count() })
        .from(userCoupons)
        .where(eq(userCoupons.couponId, params.id))

      if (usedCount && usedCount.count > 0) {
        return error('该优惠券已有用户领取，无法删除', 400)
      }

      const [existing] = await db.select().from(coupons).where(eq(coupons.id, params.id)).limit(1)
      await db.delete(coupons).where(eq(coupons.id, params.id))

      await logOperation({
        adminId: user?.id,
        action: 'delete',
        targetType: 'coupon',
        targetId: params.id,
        storeId: existing?.storeId ?? null,
        details: { name: existing?.name }
      })
      await finalizeIdempotent(idemResult.redisKey)
      return success(null, '优惠券删除成功')
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ['Coupons'], summary: '删除优惠券' }
    }
  )
  // ==================== 用户端接口 ====================
  // 获取可领取的优惠券列表（用户端）
  .get(
    '/available',
    async ({ query }) => {
      const { storeId, userId } = query
      const now = new Date()

      const conditions = [
        eq(coupons.status, 'ACTIVE'),
        lte(coupons.startTime, now),
        gte(coupons.endTime, now)
      ]
      if (storeId) conditions.push(eq(coupons.storeId, storeId))

      const couponList = await db
        .select()
        .from(coupons)
        .where(and(...conditions))
        .orderBy(desc(coupons.createdAt))

      // 如果有用户ID，标记已领取状态
      let result = couponList
      if (userId) {
        const userCouponList = await db
          .select({ couponId: userCoupons.couponId, count: count() })
          .from(userCoupons)
          .where(eq(userCoupons.userId, userId))
          .groupBy(userCoupons.couponId)

        const userCouponMap = new Map(
          userCouponList.map((uc: { couponId: number; count: number }) => [uc.couponId, uc.count])
        )

        result = couponList.map((coupon) => ({
          ...coupon,
          claimed: userCouponMap.get(coupon.id) || 0,
          canClaim: (userCouponMap.get(coupon.id) || 0) < coupon.perUserLimit
        }))
      }

      return success(result)
    },
    {
      query: t.Object({
        storeId: t.Optional(t.Number()),
        userId: t.Optional(t.Number())
      }),
      detail: { tags: ['Coupons'], summary: '获取可领取的优惠券' }
    }
  )

  // 领取优惠券
  .post(
    '/:id/claim',
    async ({ params, body, headers }) => {
      const { userId, storeId } = body
      const couponId = params.id

      const ip = getClientIp(headers as Record<string, string | undefined>)
      const rateKey = `${COUPON_RATE_PREFIX}claim:${userId || ip}`
      if (!(await checkRateLimit(rateKey))) {
        return error('操作过于频繁，请稍后重试', 429)
      }

      const idempotencyKey = headers['idempotency-key'] as string | undefined
      const idemKey = idempotencyKey ? `${COUPON_IDEM_PREFIX}claim:${idempotencyKey}` : undefined
      const idemResult = await ensureIdempotent(idemKey)
      if (!idemResult.ok) {
        return error(idemResult.message || '重复请求', 409)
      }

      // 获取优惠券信息
      const [coupon] = await db.select().from(coupons).where(eq(coupons.id, couponId)).limit(1)

      if (!coupon) {
        await releaseIdempotent(idemResult.redisKey)
        return error('优惠券不存在', 404)
      }

      if (storeId && coupon.storeId && coupon.storeId !== storeId) {
        await releaseIdempotent(idemResult.redisKey)
        return error('该优惠券不适用于当前门店', 400)
      }

      // 检查状态
      if (coupon.status !== 'ACTIVE') {
        await releaseIdempotent(idemResult.redisKey)
        return error('优惠券已失效', 400)
      }

      // 检查时间
      const now = new Date()
      if (now < coupon.startTime || now > coupon.endTime) {
        await releaseIdempotent(idemResult.redisKey)
        return error('优惠券不在有效期内', 400)
      }

      // 检查库存
      if (coupon.totalCount !== -1 && coupon.claimedCount >= coupon.totalCount) {
        await releaseIdempotent(idemResult.redisKey)
        return error('优惠券已被领完', 400)
      }

      // 检查用户领取数量
      const [userClaimedCount] = await db
        .select({ count: count() })
        .from(userCoupons)
        .where(and(eq(userCoupons.userId, userId), eq(userCoupons.couponId, couponId)))

      if (userClaimedCount && userClaimedCount.count >= coupon.perUserLimit) {
        await releaseIdempotent(idemResult.redisKey)
        return error('您已达到领取上限', 400)
      }

      // 创建用户优惠券
      const [userCoupon] = await db
        .insert(userCoupons)
        .values({
          storeId: coupon.storeId,
          userId,
          couponId,
          expireAt: coupon.endTime
        })
        .returning()

      // 更新已领取数量
      await db
        .update(coupons)
        .set({ claimedCount: sql`${coupons.claimedCount} + 1` })
        .where(eq(coupons.id, couponId))

      await finalizeIdempotent(idemResult.redisKey)
      return success(userCoupon, '领取成功')
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        userId: t.Number(),
        storeId: t.Optional(t.Number())
      }),
      detail: { tags: ['Coupons'], summary: '领取优惠券' }
    }
  )

  // 获取用户的优惠券列表
  .get(
    '/user/:userId',
    async ({ params, query }) => {
      const { status, storeId } = query

      const conditions = [eq(userCoupons.userId, params.userId)]
      if (status) {
        conditions.push(eq(userCoupons.status, status as 'UNUSED' | 'USED' | 'EXPIRED'))
      }

      const userCouponList = await db
        .select({
          userCoupon: userCoupons,
          coupon: coupons
        })
        .from(userCoupons)
        .leftJoin(coupons, eq(userCoupons.couponId, coupons.id))
        .where(and(...conditions))
        .orderBy(desc(userCoupons.claimedAt))

      // 过滤门店
      let result = userCouponList
      if (storeId) {
        result = userCouponList.filter(
          (uc: {
            userCoupon: typeof userCoupons.$inferSelect
            coupon: typeof coupons.$inferSelect | null
          }) => uc.coupon?.storeId === storeId || uc.coupon?.storeId === null
        )
      }

      return success(
        result.map(
          (r: {
            userCoupon: typeof userCoupons.$inferSelect
            coupon: typeof coupons.$inferSelect | null
          }) => ({
            ...r.userCoupon,
            coupon: r.coupon
          })
        )
      )
    },
    {
      params: t.Object({ userId: t.Number() }),
      query: t.Object({
        status: t.Optional(t.String()),
        storeId: t.Optional(t.Number())
      }),
      detail: { tags: ['Coupons'], summary: '获取用户优惠券列表' }
    }
  )

  // 获取用户可用优惠券（结算时使用）
  .get(
    '/user/:userId/usable',
    async ({ params, query }) => {
      const { storeId, amount } = query
      const now = new Date()

      // 获取用户未使用的优惠券
      const userCouponList = await db
        .select({
          userCoupon: userCoupons,
          coupon: coupons
        })
        .from(userCoupons)
        .leftJoin(coupons, eq(userCoupons.couponId, coupons.id))
        .where(
          and(
            eq(userCoupons.userId, params.userId),
            eq(userCoupons.status, 'UNUSED'),
            gte(userCoupons.expireAt, now)
          )
        )
        .orderBy(desc(coupons.value))

      // 过滤：门店匹配 + 满足最低消费
      const usableCoupons = userCouponList.filter(
        (uc: {
          userCoupon: typeof userCoupons.$inferSelect
          coupon: typeof coupons.$inferSelect | null
        }) => {
          if (!uc.coupon) return false

          // 门店匹配（null表示全店通用）
          if (uc.coupon.storeId !== null && uc.coupon.storeId !== storeId) {
            return false
          }

          // 满足最低消费
          if (amount && Number(uc.coupon.minAmount) > amount) {
            return false
          }

          return true
        }
      )

      // 计算优惠金额
      const result = usableCoupons.map(
        (uc: {
          userCoupon: typeof userCoupons.$inferSelect
          coupon: typeof coupons.$inferSelect | null
        }) => {
          let discount = 0
          if (uc.coupon) {
            if (uc.coupon.type === 'FIXED' || uc.coupon.type === 'NO_THRESHOLD') {
              discount = Number(uc.coupon.value)
            } else if (uc.coupon.type === 'PERCENT' && amount) {
              discount = amount * (1 - Number(uc.coupon.value))
              // 限制最大优惠
              if (uc.coupon.maxDiscount && discount > Number(uc.coupon.maxDiscount)) {
                discount = Number(uc.coupon.maxDiscount)
              }
            }
          }

          return {
            ...uc.userCoupon,
            coupon: uc.coupon,
            discount: Math.round(discount * 100) / 100
          }
        }
      )

      return success(result)
    },
    {
      params: t.Object({ userId: t.Number() }),
      query: t.Object({
        storeId: t.Optional(t.Number()),
        amount: t.Optional(t.Number())
      }),
      detail: { tags: ['Coupons'], summary: '获取用户可用优惠券' }
    }
  )

  // 使用优惠券（标记为已使用）
  .post(
    '/user-coupon/:id/use',
    async ({ params, body }) => {
      const { orderId } = body

      const [userCoupon] = await db
        .select()
        .from(userCoupons)
        .where(eq(userCoupons.id, params.id))
        .limit(1)

      if (!userCoupon) return error('优惠券不存在', 404)

      if (userCoupon.status !== 'UNUSED') {
        return error('优惠券已使用或已过期', 400)
      }

      // 更新状态
      const [updated] = await db
        .update(userCoupons)
        .set({
          status: 'USED',
          orderId,
          usedAt: new Date()
        })
        .where(eq(userCoupons.id, params.id))
        .returning()

      // 更新优惠券使用数量
      await db
        .update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(eq(coupons.id, userCoupon.couponId))

      return success(updated, '优惠券使用成功')
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        orderId: t.Number()
      }),
      detail: { tags: ['Coupons'], summary: '使用优惠券' }
    }
  )
