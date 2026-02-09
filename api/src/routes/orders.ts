import { Elysia, t } from 'elysia'
import { eq, and, desc, gte, count, sum, sql } from 'drizzle-orm'
import {
  db,
  orders,
  orderItems,
  tables,
  products,
  productVariants,
  categories,
  storeMembers,
  pointLogs,
  operationLogs,
  userCoupons,
  coupons
} from '../db'
import { success, error, pagination, generateOrderNo } from '../lib/utils'
import { broadcastToStore, broadcastToTable, WS_EVENTS } from '../ws'
import { requirePermission, hasPermission } from '../lib/auth'
import redis from '../lib/redis'

const POINTS_PER_YUAN = 1 // 每元积1分
const POINTS_TO_YUAN = 100 // 100 分抵 1 元
const MAX_REDEEM_PERCENT = 0.5 // 最高抵扣 50%
const IDEM_PREFIX = 'idem:refund:'
const RATE_PREFIX = 'rate:refund:'
const RATE_LIMIT = { short: { limit: 5, ttl: 60 }, long: { limit: 20, ttl: 600 } }

function getClientIp(headers: Record<string, string | undefined>) {
  return (
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['x-real-ip'] ||
    headers['cf-connecting-ip'] ||
    'unknown'
  )
}

async function checkRateLimit(key: string, limit: number, ttl: number) {
  if (!redis) return true
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, ttl)
  return count <= limit
}

async function ensureIdempotent(refundKey: string) {
  if (!redis) return { ok: true }
  const exists = await redis.get(refundKey)
  if (exists) return { ok: false, message: '重复提交，请勿重复操作' }
  await redis.set(refundKey, 'processing', 'EX', 1800, 'NX')
  return { ok: true }
}

async function finalizeIdempotent(refundKey: string | null) {
  if (redis && refundKey) {
    await redis.set(refundKey, 'done', 'EX', 1800)
  }
}

async function ensureStoreMember(storeId: number, userId: number) {
  const [existing] = await db
    .select()
    .from(storeMembers)
    .where(and(eq(storeMembers.storeId, storeId), eq(storeMembers.userId, userId)))
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(storeMembers)
    .values({ storeId, userId, level: 1, points: 0 })
    .returning()
  return created
}

export const orderRoutes = new Elysia({ prefix: '/api/orders' })
  // 订单读取需要 order:read 权限
  .use(requirePermission('order:read'))
  .get(
    '/',
    async ({ query }) => {
      const { page, pageSize, storeId, tableId, status, orderNo } = query
      const { take, skip } = pagination(page, pageSize)

      const conditions = []
      if (storeId) conditions.push(eq(orders.storeId, storeId))
      if (tableId) conditions.push(eq(orders.tableId, tableId))
      if (status) {
        conditions.push(
          eq(
            orders.status,
            status as 'PENDING' | 'PAID' | 'PREPARING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
          )
        )
      }
      if (orderNo) conditions.push(eq(orders.orderNo, orderNo))

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const [orderList, totalResult] = await Promise.all([
        db
          .select()
          .from(orders)
          .leftJoin(tables, eq(orders.tableId, tables.id))
          .where(whereClause)
          .orderBy(desc(orders.createdAt))
          .limit(take)
          .offset(skip),
        db.select({ count: count() }).from(orders).where(whereClause)
      ])

      return success({
        list: orderList.map(
          (r: {
            orders: typeof orders.$inferSelect
            tables: typeof tables.$inferSelect | null
          }) => ({
            ...r.orders,
            table: r.tables
          })
        ),
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
        tableId: t.Optional(t.Number()),
        status: t.Optional(t.String()),
        orderNo: t.Optional(t.String())
      }),
      detail: { tags: ['Orders'], summary: '获取订单列表' }
    }
  )
  .get(
    '/:id',
    async ({ params }) => {
      const [order] = await db
        .select()
        .from(orders)
        .leftJoin(tables, eq(orders.tableId, tables.id))
        .where(eq(orders.id, params.id))
        .limit(1)

      if (!order) return error('订单不存在', 404)

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, params.id))

      return success({ ...order.orders, table: order.tables, items })
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ['Orders'], summary: '获取订单详情' }
    }
  )
  .post(
    '/',
    async ({ body }) => {
      const { storeId, tableId, userId, items, remark, usePoints, couponId } = body

      // 校验桌台归属
      const [table] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1)
      if (!table || table.storeId !== storeId) {
        return error('桌台与门店不匹配', 400)
      }

      let totalAmount = 0
      const orderItemsData = []

      for (const item of items) {
        const [variant] = await db
          .select()
          .from(productVariants)
          .leftJoin(products, eq(productVariants.productId, products.id))
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(eq(productVariants.id, item.variantId))
          .limit(1)

        if (!variant) continue

        if (variant.products?.storeId !== storeId) {
          return error('商品不属于该门店', 400)
        }

        const price = Number(variant.product_variants.price)
        totalAmount += price * item.quantity

        orderItemsData.push({
          productVariantId: item.variantId,
          quantity: item.quantity,
          price: price.toString(),
          snapshot: {
            name: variant.products?.name || '',
            categoryName: variant.categories?.name || '',
            specs: variant.product_variants.specs || {}
          },
          attributes: item.attributes || null
        })
      }

      // 处理优惠券
      let couponDiscount = 0
      let usedCouponId = null

      if (couponId && userId) {
        // 查询用户优惠券
        const [userCoupon] = await db
          .select({
            uc: userCoupons,
            c: coupons
          })
          .from(userCoupons)
          .innerJoin(coupons, eq(userCoupons.couponId, coupons.id))
          .where(and(eq(userCoupons.id, couponId), eq(userCoupons.userId, userId)))
          .limit(1)

        if (!userCoupon) {
          return error('优惠券不存在', 400)
        }

        if (userCoupon.uc.status !== 'UNUSED') {
          return error('优惠券已使用或过期', 400)
        }

        if (new Date(userCoupon.uc.expireAt) < new Date()) {
          return error('优惠券已过期', 400)
        }

        if (totalAmount < Number(userCoupon.c.minAmount)) {
          return error(`未满足优惠券使用门槛 (满${userCoupon.c.minAmount}可用)`, 400)
        }

        // 计算优惠券优惠
        if (userCoupon.c.type === 'FIXED' || userCoupon.c.type === 'NO_THRESHOLD') {
          couponDiscount = Number(userCoupon.c.value)
        } else if (userCoupon.c.type === 'PERCENT') {
          // 折扣券 (value 是折扣比例，如 0.8)
          let discountRate = Number(userCoupon.c.value)
          if (discountRate > 1 && discountRate <= 10) discountRate = discountRate / 10

          let discountAmt = totalAmount * (1 - discountRate)

          if (userCoupon.c.maxDiscount) {
            discountAmt = Math.min(discountAmt, Number(userCoupon.c.maxDiscount))
          }
          couponDiscount = discountAmt
        }

        // 确保不超过总金额
        couponDiscount = Math.min(couponDiscount, totalAmount)
        usedCouponId = userCoupon.uc.id
      }

      // 处理积分抵扣 (在优惠券之后计算，抵扣剩余金额)
      let pointsUsed = 0
      let pointsDiscount = 0
      const amountAfterCoupon = Math.max(totalAmount - couponDiscount, 0)

      if (usePoints && userId && amountAfterCoupon > 0) {
        const storeMember = await ensureStoreMember(storeId, userId)
        const availablePoints = storeMember?.points ?? 0
        const maxDiscountAmount = amountAfterCoupon * MAX_REDEEM_PERCENT
        const maxPointsAllow = Math.floor(maxDiscountAmount * POINTS_TO_YUAN)
        pointsUsed = Math.min(usePoints, availablePoints, maxPointsAllow)
        pointsDiscount = pointsUsed / POINTS_TO_YUAN
      }

      const payAmount = Math.max(amountAfterCoupon - pointsDiscount, 0)

      const [order] = await db
        .insert(orders)
        .values({
          orderNo: generateOrderNo(),
          storeId,
          tableId,
          userId,
          totalAmount: totalAmount.toString(),
          payAmount: payAmount.toString(),
          remark,
          pointsUsed,
          pointsDiscount: pointsDiscount.toString(),
          couponId: usedCouponId,
          couponDiscount: couponDiscount.toString()
        })
        .returning()

      if (orderItemsData.length > 0) {
        await db.insert(orderItems).values(
          orderItemsData.map((item) => ({
            orderId: order!.id,
            ...item
          }))
        )
      }

      // 核销优惠券
      if (usedCouponId) {
        await db
          .update(userCoupons)
          .set({
            status: 'USED',
            usedAt: new Date(),
            orderId: order!.id
          })
          .where(eq(userCoupons.id, usedCouponId))
      }

      // 扣减积分并记录流水（抵扣）
      if (pointsUsed > 0 && userId) {
        await db
          .update(storeMembers)
          .set({ points: sql`${storeMembers.points} - ${pointsUsed}` })
          .where(and(eq(storeMembers.storeId, storeId), eq(storeMembers.userId, userId)))

        await db.insert(pointLogs).values({
          storeId,
          userId,
          orderId: order!.id,
          change: -pointsUsed,
          reason: 'REDEEM_ORDER',
          meta: { orderNo: order!.orderNo }
        })
      }

      // 广播新订单通知
      broadcastToStore(storeId, WS_EVENTS.NEW_ORDER, {
        order,
        itemCount: orderItemsData.length
      })

      return success(order, '订单创建成功')
    },
    {
      body: t.Object({
        storeId: t.Number(),
        tableId: t.Number(),
        userId: t.Optional(t.Number()),
        items: t.Array(
          t.Object({
            variantId: t.Number(),
            quantity: t.Number(),
            attributes: t.Optional(t.Array(t.Any()))
          })
        ),
        remark: t.Optional(t.String()),
        usePoints: t.Optional(t.Number()),
        couponId: t.Optional(t.Number())
      }),
      detail: { tags: ['Orders'], summary: '创建订单' }
    }
  )
  .put(
    '/:id/status',
    async ({ params, body }) => {
      const updateData: Record<string, unknown> = {
        status: body.status as
          | 'PENDING'
          | 'PAID'
          | 'PREPARING'
          | 'COMPLETED'
          | 'CANCELLED'
          | 'REFUNDED'
      }
      if (body.status === 'PAID') {
        updateData.payTime = new Date()
      }

      const [order] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, params.id))
        .returning()

      // 广播状态变更通知
      if (order) {
        broadcastToStore(order.storeId, WS_EVENTS.ORDER_STATUS_CHANGED, {
          order,
          newStatus: body.status
        })

        // 同时通知桌台
        broadcastToTable(order.storeId, order.tableId, WS_EVENTS.ORDER_STATUS_CHANGED, {
          order,
          newStatus: body.status
        })

        // 订单支付成功发放积分（幂等：若已有流水则跳过）
        if (body.status === 'PAID' && order.userId) {
          const [existingLog] = await db
            .select()
            .from(pointLogs)
            .where(and(eq(pointLogs.orderId, order.id), eq(pointLogs.reason, 'EARN_ORDER')))
            .limit(1)

          if (!existingLog) {
            const earnPoints = Math.floor(Number(order.payAmount) * POINTS_PER_YUAN)
            if (earnPoints > 0) {
              await ensureStoreMember(order.storeId, order.userId)
              await db
                .update(storeMembers)
                .set({ points: sql`${storeMembers.points} + ${earnPoints}` })
                .where(
                  and(
                    eq(storeMembers.storeId, order.storeId),
                    eq(storeMembers.userId, order.userId)
                  )
                )

              await db.insert(pointLogs).values({
                storeId: order.storeId,
                userId: order.userId,
                orderId: order.id,
                change: earnPoints,
                reason: 'EARN_ORDER',
                meta: { orderNo: order.orderNo }
              })
            }
          }
        }
      }

      return success(order, '状态更新成功')
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({ status: t.String() }),
      detail: { tags: ['Orders'], summary: '更新订单状态' }
    }
  )
  .post(
    '/:id/refund',
    async ({ params, body, user, headers }) => {
      if (!user || !hasPermission(user.role, 'order:refund')) {
        return error('权限不足，需 order:refund', 403)
      }

      const ip = getClientIp(headers as Record<string, string | undefined>)
      const rateKeyShort = `${RATE_PREFIX}short:${user.id || ip}`
      const rateKeyLong = `${RATE_PREFIX}long:${user.id || ip}`
      const allowedShort = await checkRateLimit(
        rateKeyShort,
        RATE_LIMIT.short.limit,
        RATE_LIMIT.short.ttl
      )
      const allowedLong = await checkRateLimit(
        rateKeyLong,
        RATE_LIMIT.long.limit,
        RATE_LIMIT.long.ttl
      )
      if (!allowedShort || !allowedLong) {
        return error('操作过于频繁，请稍后重试', 429)
      }

      const idemHeader = headers['idempotency-key'] as string | undefined
      const idemKey = idemHeader ? `${IDEM_PREFIX}${params.id}:${idemHeader}` : undefined
      if (idemKey) {
        const idem = await ensureIdempotent(idemKey)
        if (!idem.ok) return error(idem.message || '重复请求', 409)
      }

      const [existing] = await db.select().from(orders).where(eq(orders.id, params.id)).limit(1)
      if (!existing) return error('订单不存在', 404)
      if (existing.status === 'REFUNDED') return success(existing, '订单已退款')
      if (existing.status === 'CANCELLED') return error('已取消的订单无法退款', 400)

      const [order] = await db
        .update(orders)
        .set({ status: 'REFUNDED', updatedAt: new Date() })
        .where(eq(orders.id, params.id))
        .returning()

      if (order) {
        broadcastToStore(order.storeId, WS_EVENTS.ORDER_REFUNDED, { order })

        await db.insert(operationLogs).values({
          adminId: user.id,
          action: 'refund_full',
          targetType: 'order',
          targetId: params.id,
          storeId: order.storeId,
          details: { reason: body.reason }
        })
      }

      if (idemKey) {
        await finalizeIdempotent(idemKey)
      }

      return success(order, '退款成功')
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({ reason: t.Optional(t.String()) }),
      detail: { tags: ['Orders'], summary: '订单退款' }
    }
  )
  // 部分退款（单品退款）
  .post(
    '/:id/partial-refund',
    async ({ params, body, user, headers }) => {
      if (!user || !hasPermission(user.role, 'order:refund')) {
        return error('权限不足，需 order:refund', 403)
      }
      const { itemId, quantity, reason } = body

      const ip = getClientIp(headers as Record<string, string | undefined>)
      const rateKeyShort = `${RATE_PREFIX}short:${user.id || ip}`
      const rateKeyLong = `${RATE_PREFIX}long:${user.id || ip}`
      const allowedShort = await checkRateLimit(
        rateKeyShort,
        RATE_LIMIT.short.limit,
        RATE_LIMIT.short.ttl
      )
      const allowedLong = await checkRateLimit(
        rateKeyLong,
        RATE_LIMIT.long.limit,
        RATE_LIMIT.long.ttl
      )
      if (!allowedShort || !allowedLong) {
        return error('操作过于频繁，请稍后重试', 429)
      }

      const idemHeader = headers['idempotency-key'] as string | undefined
      const idemKey = idemHeader ? `${IDEM_PREFIX}${params.id}:${itemId}:${idemHeader}` : undefined
      if (idemKey) {
        const idem = await ensureIdempotent(idemKey)
        if (!idem.ok) return error(idem.message || '重复请求', 409)
      }

      // 获取订单
      const [order] = await db.select().from(orders).where(eq(orders.id, params.id)).limit(1)
      if (!order) return error('订单不存在', 404)
      if (order.status === 'REFUNDED') return error('该订单已全额退款', 400)
      if (order.status === 'CANCELLED') return error('已取消的订单无法退款', 400)

      // 获取订单项
      const [item] = await db.select().from(orderItems).where(eq(orderItems.id, itemId)).limit(1)

      if (!item) return error('订单项不存在', 404)
      if (item.orderId !== params.id) return error('订单项不属于此订单', 400)

      const refundableQty = item.quantity - (item.refundedQuantity || 0)
      if (quantity > refundableQty) {
        return error(`最多可退 ${refundableQty} 件`, 400)
      }

      const refundAmount = Number(item.price) * quantity

      // 更新订单项
      await db
        .update(orderItems)
        .set({
          refundedQuantity: (item.refundedQuantity || 0) + quantity,
          refundedAmount: (Number(item.refundedAmount || 0) + refundAmount).toString(),
          refundReason: reason
        })
        .where(eq(orderItems.id, itemId))

      // 获取更新后的订单
      const [updatedOrder] = await db.select().from(orders).where(eq(orders.id, params.id)).limit(1)

      // 广播退款通知
      if (updatedOrder) {
        broadcastToStore(updatedOrder.storeId, WS_EVENTS.ORDER_REFUNDED, {
          order: updatedOrder,
          itemId,
          refundAmount,
          isPartial: true
        })

        await db.insert(operationLogs).values({
          adminId: user.id,
          action: 'refund_partial',
          targetType: 'order',
          targetId: params.id,
          storeId: updatedOrder.storeId,
          details: { itemId, quantity, refundAmount, reason }
        })
      }

      if (idemKey) {
        await finalizeIdempotent(idemKey)
      }

      return success({ itemId, refundedQuantity: quantity, refundAmount }, '部分退款成功')
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        itemId: t.Number(),
        quantity: t.Number({ minimum: 1 }),
        reason: t.Optional(t.String())
      }),
      detail: { tags: ['Orders'], summary: '部分退款' }
    }
  )
  // 加菜（创建关联订单）
  .post(
    '/:id/add-items',
    async ({ params, body }) => {
      const { items, remark } = body

      // 获取主订单
      const [parentOrder] = await db.select().from(orders).where(eq(orders.id, params.id)).limit(1)

      if (!parentOrder) return error('订单不存在', 404)
      if (parentOrder.status !== 'PAID' && parentOrder.status !== 'PREPARING') {
        return error('该订单状态不支持加菜', 400)
      }

      let totalAmount = 0
      const orderItemsData = []

      for (const item of items) {
        const [variant] = await db
          .select()
          .from(productVariants)
          .leftJoin(products, eq(productVariants.productId, products.id))
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(eq(productVariants.id, item.variantId))
          .limit(1)

        if (!variant) continue

        const price = Number(variant.product_variants.price)
        totalAmount += price * item.quantity

        orderItemsData.push({
          productVariantId: item.variantId,
          quantity: item.quantity,
          price: price.toString(),
          snapshot: {
            name: variant.products?.name || '',
            categoryName: variant.categories?.name || '',
            specs: variant.product_variants.specs || {}
          },
          attributes: item.attributes || null
        })
      }

      // 创建加菜订单
      const [addOrder] = await db
        .insert(orders)
        .values({
          orderNo: generateOrderNo(),
          storeId: parentOrder.storeId,
          tableId: parentOrder.tableId,
          userId: parentOrder.userId,
          totalAmount: totalAmount.toString(),
          payAmount: totalAmount.toString(),
          remark: remark || '加菜',
          isAddition: true,
          parentOrderId: params.id,
          status: 'PAID' // 加菜默认已支付（合并结账）
        })
        .returning()

      if (orderItemsData.length > 0) {
        await db.insert(orderItems).values(
          orderItemsData.map((item) => ({
            orderId: addOrder!.id,
            ...item
          }))
        )
      }

      // 广播加菜通知
      broadcastToStore(parentOrder.storeId, WS_EVENTS.NEW_ORDER, {
        order: addOrder,
        itemCount: orderItemsData.length,
        isAddition: true,
        parentOrderId: params.id
      })

      // 同时通知桌台
      broadcastToTable(parentOrder.storeId, parentOrder.tableId, WS_EVENTS.NEW_ORDER, {
        order: addOrder,
        isAddition: true
      })

      return success(addOrder, '加菜成功')
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        items: t.Array(
          t.Object({
            variantId: t.Number(),
            quantity: t.Number(),
            attributes: t.Optional(t.Array(t.Any()))
          })
        ),
        remark: t.Optional(t.String())
      }),
      detail: { tags: ['Orders'], summary: '加菜' }
    }
  )
  // 获取订单及其加菜单
  .get(
    '/:id/with-additions',
    async ({ params }) => {
      const [order] = await db
        .select()
        .from(orders)
        .leftJoin(tables, eq(orders.tableId, tables.id))
        .where(eq(orders.id, params.id))
        .limit(1)

      if (!order) return error('订单不存在', 404)

      // 获取订单项
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, params.id))

      // 获取加菜单
      const additions = await db.select().from(orders).where(eq(orders.parentOrderId, params.id))

      // 获取加菜单的订单项
      const additionItems = await Promise.all(
        additions.map(async (add: typeof orders.$inferSelect) => {
          const addItems = await db.select().from(orderItems).where(eq(orderItems.orderId, add.id))
          return { ...add, items: addItems }
        })
      )

      return success({
        ...order.orders,
        table: order.tables,
        items,
        additions: additionItems,
        totalWithAdditions:
          Number(order.orders.payAmount) +
          additions.reduce(
            (sum: number, a: typeof orders.$inferSelect) => sum + Number(a.payAmount),
            0
          )
      })
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ['Orders'], summary: '获取订单及加菜单' }
    }
  )
  .get(
    '/today/stats',
    async ({ query }) => {
      const storeId = query.storeId
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const conditions = [gte(orders.createdAt, today)]
      if (storeId) conditions.push(eq(orders.storeId, storeId))

      const paidConditions = [...conditions, eq(orders.status, 'PAID')]

      const [stats] = await db
        .select({
          orderCount: count(),
          revenue: sum(orders.payAmount)
        })
        .from(orders)
        .where(and(...paidConditions))

      const pendingOrders = await db
        .select()
        .from(orders)
        .where(and(...conditions, eq(orders.status, 'PENDING')))

      return success({
        orderCount: stats?.orderCount ?? 0,
        revenue: Number(stats?.revenue || 0),
        pendingOrders
      })
    },
    {
      query: t.Object({ storeId: t.Optional(t.Number()) }),
      detail: { tags: ['Orders'], summary: '今日订单统计' }
    }
  )
