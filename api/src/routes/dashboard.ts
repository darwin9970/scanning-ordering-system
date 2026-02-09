import { Elysia, t } from 'elysia'
import { eq, and, gte, lte, desc, count, sum, sql } from 'drizzle-orm'
import { db, orders, products, tables, categories } from '../db'
import { success } from '../lib/utils'

export const dashboardRoutes = new Elysia({ prefix: '/api/dashboard' })
  .get(
    '/overview',
    async ({ query }) => {
      const storeId = query.storeId
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const conditions = storeId ? [eq(orders.storeId, storeId)] : []

      // 今日数据
      const [todayStats] = await db
        .select({
          orders: count(),
          revenue: sum(orders.payAmount)
        })
        .from(orders)
        .where(
          and(
            ...conditions,
            gte(orders.createdAt, today),
            sql`${orders.status} IN ('PAID', 'PREPARING', 'COMPLETED')`
          )
        )

      // 今日待处理订单
      const [pendingCount] = await db
        .select({ count: count() })
        .from(orders)
        .where(and(...conditions, gte(orders.createdAt, today), eq(orders.status, 'PENDING')))

      // 昨日数据
      const [yesterdayStats] = await db
        .select({
          orders: count(),
          revenue: sum(orders.payAmount)
        })
        .from(orders)
        .where(
          and(
            ...conditions,
            gte(orders.createdAt, yesterday),
            lte(orders.createdAt, today),
            sql`${orders.status} IN ('PAID', 'PREPARING', 'COMPLETED')`
          )
        )

      // 总商品数和桌台数
      const productConditions = storeId ? eq(products.storeId, storeId) : undefined
      const tableConditions = storeId ? eq(tables.storeId, storeId) : undefined

      const [productCount] = await db
        .select({ count: count() })
        .from(products)
        .where(productConditions)
      const [tableCount] = await db.select({ count: count() }).from(tables).where(tableConditions)

      return success({
        today: {
          orders: todayStats?.orders ?? 0,
          revenue: Number(todayStats?.revenue || 0),
          pendingOrders: pendingCount?.count ?? 0
        },
        yesterday: {
          orders: yesterdayStats?.orders ?? 0,
          revenue: Number(yesterdayStats?.revenue || 0)
        },
        total: {
          products: productCount?.count ?? 0,
          tables: tableCount?.count ?? 0
        }
      })
    },
    {
      query: t.Object({ storeId: t.Optional(t.Number()) }),
      detail: { tags: ['Dashboard'], summary: '获取概览数据' }
    }
  )
  .get(
    '/sales-chart',
    async ({ query }) => {
      const storeId = query.storeId
      const days = query.days || 7

      const result = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)

        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)

        const conditions = [
          gte(orders.createdAt, date),
          lte(orders.createdAt, nextDate),
          sql`${orders.status} IN ('PAID', 'PREPARING', 'COMPLETED')`
        ]
        if (storeId) conditions.push(eq(orders.storeId, storeId))

        const [stats] = await db
          .select({
            orders: count(),
            revenue: sum(orders.payAmount)
          })
          .from(orders)
          .where(and(...conditions))

        result.push({
          date: date.toISOString().split('T')[0],
          orders: stats?.orders ?? 0,
          revenue: Number(stats?.revenue || 0)
        })
      }

      return success(result)
    },
    {
      query: t.Object({
        storeId: t.Optional(t.Number()),
        days: t.Optional(t.Number())
      }),
      detail: { tags: ['Dashboard'], summary: '获取销售趋势' }
    }
  )
  .get(
    '/top-products',
    async ({ query }) => {
      const storeId = query.storeId
      const limit = query.limit || 10

      const conditions = storeId ? eq(products.storeId, storeId) : undefined

      const productList = await db
        .select()
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(conditions)
        .orderBy(desc(products.sales))
        .limit(limit)

      return success(
        productList.map(
          (r: {
            products: typeof products.$inferSelect
            categories: typeof categories.$inferSelect | null
          }) => ({
            ...r.products,
            category: r.categories
          })
        )
      )
    },
    {
      query: t.Object({
        storeId: t.Optional(t.Number()),
        limit: t.Optional(t.Number())
      }),
      detail: { tags: ['Dashboard'], summary: '获取热销商品' }
    }
  )
  .get(
    '/recent-orders',
    async ({ query }) => {
      const storeId = query.storeId
      const limit = query.limit || 10

      const conditions = storeId ? eq(orders.storeId, storeId) : undefined

      const orderList = await db
        .select()
        .from(orders)
        .leftJoin(tables, eq(orders.tableId, tables.id))
        .where(conditions)
        .orderBy(desc(orders.createdAt))
        .limit(limit)

      return success(
        orderList.map(
          (r: {
            orders: typeof orders.$inferSelect
            tables: typeof tables.$inferSelect | null
          }) => ({
            ...r.orders,
            table: r.tables
          })
        )
      )
    },
    {
      query: t.Object({
        storeId: t.Optional(t.Number()),
        limit: t.Optional(t.Number())
      }),
      detail: { tags: ['Dashboard'], summary: '获取最近订单' }
    }
  )
  .get(
    '/category-stats',
    async ({ query }) => {
      const storeId = query.storeId
      const conditions = storeId ? eq(categories.storeId, storeId) : undefined

      const categoryList = await db.select().from(categories).where(conditions)

      const result = await Promise.all(
        categoryList.map(async (cat: typeof categories.$inferSelect) => {
          const [productCount] = await db
            .select({ count: count() })
            .from(products)
            .where(eq(products.categoryId, cat.id))

          const [salesSum] = await db
            .select({ total: sum(products.sales) })
            .from(products)
            .where(eq(products.categoryId, cat.id))

          return {
            id: cat.id,
            name: cat.name,
            productCount: productCount?.count ?? 0,
            totalSales: Number(salesSum?.total || 0)
          }
        })
      )

      return success(result)
    },
    {
      query: t.Object({ storeId: t.Optional(t.Number()) }),
      detail: { tags: ['Dashboard'], summary: '获取分类统计' }
    }
  )
