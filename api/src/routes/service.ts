import { Elysia, t } from 'elysia'
import { eq, and, desc, count, gte } from 'drizzle-orm'
import { db, serviceCalls, tables, orders } from '../db'
import { success, error, pagination } from '../lib/utils'
import { broadcastToStore, WS_EVENTS } from '../ws'
import { requirePermission } from '../lib/auth'

// 扩展 WS 事件
const SERVICE_EVENTS = {
  ...WS_EVENTS,
  SERVICE_CALL: 'service_call',
  SERVICE_CALL_HANDLED: 'service_call_handled'
}

export const serviceRoutes = new Elysia({ prefix: '/api/service' })
  // 服务呼叫读取需要 service:read 权限
  .use(requirePermission('service:read'))
  // 获取服务呼叫列表（管理端）
  .get(
    '/calls',
    async ({ query }) => {
      const { page, pageSize, storeId, status, type } = query
      const { take, skip } = pagination(page, pageSize)

      const conditions = []
      if (storeId) conditions.push(eq(serviceCalls.storeId, storeId))
      if (status)
        conditions.push(
          eq(serviceCalls.status, status as 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED')
        )
      if (type)
        conditions.push(
          eq(serviceCalls.type, type as 'CALL_SERVICE' | 'URGE_ORDER' | 'REQUEST_BILL' | 'OTHER')
        )

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const [callList, totalResult] = await Promise.all([
        db
          .select({
            call: serviceCalls,
            table: tables,
            order: orders
          })
          .from(serviceCalls)
          .leftJoin(tables, eq(serviceCalls.tableId, tables.id))
          .leftJoin(orders, eq(serviceCalls.orderId, orders.id))
          .where(whereClause)
          .orderBy(desc(serviceCalls.createdAt))
          .limit(take)
          .offset(skip),
        db.select({ count: count() }).from(serviceCalls).where(whereClause)
      ])

      return success({
        list: callList.map(
          (r: {
            call: typeof serviceCalls.$inferSelect
            table: typeof tables.$inferSelect | null
            order: typeof orders.$inferSelect | null
          }) => ({
            ...r.call,
            table: r.table,
            order: r.order
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
        status: t.Optional(t.String()),
        type: t.Optional(t.String())
      }),
      detail: { tags: ['Service'], summary: '获取服务呼叫列表' }
    }
  )

  // 获取待处理的服务呼叫数量
  .get(
    '/calls/pending-count',
    async ({ query }) => {
      const { storeId } = query

      const conditions = [eq(serviceCalls.status, 'PENDING')]
      if (storeId) conditions.push(eq(serviceCalls.storeId, storeId))

      const [result] = await db
        .select({ count: count() })
        .from(serviceCalls)
        .where(and(...conditions))

      return success({ count: result?.count ?? 0 })
    },
    {
      query: t.Object({
        storeId: t.Optional(t.Number())
      }),
      detail: { tags: ['Service'], summary: '获取待处理呼叫数量' }
    }
  )

  // 呼叫服务员（用户端）
  .post(
    '/call',
    async ({ body }) => {
      const { storeId, tableId, message } = body

      // 检查是否有未处理的呼叫
      const [existingCall] = await db
        .select()
        .from(serviceCalls)
        .where(
          and(
            eq(serviceCalls.storeId, storeId),
            eq(serviceCalls.tableId, tableId),
            eq(serviceCalls.type, 'CALL_SERVICE'),
            eq(serviceCalls.status, 'PENDING')
          )
        )
        .limit(1)

      if (existingCall) {
        return error('您已呼叫服务员，请稍候', 400)
      }

      const [call] = await db
        .insert(serviceCalls)
        .values({
          storeId,
          tableId,
          type: 'CALL_SERVICE',
          message
        })
        .returning()

      // 获取桌台信息
      const [table] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1)

      // 广播到管理端
      broadcastToStore(storeId, SERVICE_EVENTS.SERVICE_CALL, {
        call,
        table,
        type: 'CALL_SERVICE'
      })

      return success(call, '已呼叫服务员')
    },
    {
      body: t.Object({
        storeId: t.Number(),
        tableId: t.Number(),
        message: t.Optional(t.String())
      }),
      detail: { tags: ['Service'], summary: '呼叫服务员' }
    }
  )

  // 催单（用户端）
  .post(
    '/urge',
    async ({ body }) => {
      const { storeId, tableId, orderId, message } = body

      // 检查订单是否存在
      if (orderId) {
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)

        if (!order) return error('订单不存在', 404)
        if (order.status !== 'PAID' && order.status !== 'PREPARING') {
          return error('该订单状态不支持催单', 400)
        }
      }

      // 检查5分钟内是否已催单
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const [recentUrge] = await db
        .select()
        .from(serviceCalls)
        .where(
          and(
            eq(serviceCalls.storeId, storeId),
            eq(serviceCalls.tableId, tableId),
            eq(serviceCalls.type, 'URGE_ORDER'),
            gte(serviceCalls.createdAt, fiveMinutesAgo)
          )
        )
        .limit(1)

      if (recentUrge) {
        return error('您已催单，请稍候再试', 400)
      }

      const [call] = await db
        .insert(serviceCalls)
        .values({
          storeId,
          tableId,
          orderId,
          type: 'URGE_ORDER',
          message: message || '顾客催单'
        })
        .returning()

      // 获取桌台和订单信息
      const [table] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1)

      // 广播到管理端
      broadcastToStore(storeId, SERVICE_EVENTS.SERVICE_CALL, {
        call,
        table,
        orderId,
        type: 'URGE_ORDER'
      })

      return success(call, '催单成功')
    },
    {
      body: t.Object({
        storeId: t.Number(),
        tableId: t.Number(),
        orderId: t.Optional(t.Number()),
        message: t.Optional(t.String())
      }),
      detail: { tags: ['Service'], summary: '催单' }
    }
  )

  // 请求结账（用户端）
  .post(
    '/request-bill',
    async ({ body }) => {
      const { storeId, tableId, message } = body

      const [call] = await db
        .insert(serviceCalls)
        .values({
          storeId,
          tableId,
          type: 'REQUEST_BILL',
          message
        })
        .returning()

      // 获取桌台信息
      const [table] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1)

      // 广播到管理端
      broadcastToStore(storeId, SERVICE_EVENTS.SERVICE_CALL, {
        call,
        table,
        type: 'REQUEST_BILL'
      })

      return success(call, '已通知服务员')
    },
    {
      body: t.Object({
        storeId: t.Number(),
        tableId: t.Number(),
        message: t.Optional(t.String())
      }),
      detail: { tags: ['Service'], summary: '请求结账' }
    }
  )

  // 处理服务呼叫（管理端）
  .put(
    '/calls/:id/handle',
    async ({ params, body }) => {
      const { status, handledBy } = body

      const [call] = await db
        .update(serviceCalls)
        .set({
          status: status as 'ACCEPTED' | 'COMPLETED' | 'CANCELLED',
          handledBy,
          handledAt: new Date()
        })
        .where(eq(serviceCalls.id, params.id))
        .returning()

      if (!call) return error('呼叫记录不存在', 404)

      // 广播状态更新
      broadcastToStore(call.storeId, SERVICE_EVENTS.SERVICE_CALL_HANDLED, {
        call,
        newStatus: status
      })

      return success(call, '处理成功')
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        status: t.Union([t.Literal('ACCEPTED'), t.Literal('COMPLETED'), t.Literal('CANCELLED')]),
        handledBy: t.Optional(t.Number())
      }),
      detail: { tags: ['Service'], summary: '处理服务呼叫' }
    }
  )

  // 批量完成服务呼叫
  .put(
    '/calls/batch-complete',
    async ({ body }) => {
      const { ids, handledBy } = body

      await db
        .update(serviceCalls)
        .set({
          status: 'COMPLETED',
          handledBy,
          handledAt: new Date()
        })
        .where(
          and(
            eq(serviceCalls.status, 'PENDING')
            // 使用 in 操作符需要特殊处理
          )
        )

      // 逐个更新
      for (const id of ids) {
        await db
          .update(serviceCalls)
          .set({
            status: 'COMPLETED',
            handledBy,
            handledAt: new Date()
          })
          .where(eq(serviceCalls.id, id))
      }

      return success(null, `已完成 ${ids.length} 个呼叫`)
    },
    {
      body: t.Object({
        ids: t.Array(t.Number()),
        handledBy: t.Optional(t.Number())
      }),
      detail: { tags: ['Service'], summary: '批量完成服务呼叫' }
    }
  )
