import { Elysia, t } from 'elysia'
import { eq, and, isNull } from 'drizzle-orm'
import { db, settings } from '../db'
import { success, error } from '../lib/utils'
import { requireManager } from '../lib/auth'
import { logOperation } from '../lib/operation-log'

// 默认设置
const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  order_timeout: { value: '15', description: '订单超时时间（分钟）' },
  cart_expire: { value: '120', description: '购物车有效期（分钟）' },
  gps_fence: { value: '1000', description: 'GPS围栏距离（米）' },
  stock_warning: { value: '10', description: '库存预警阈值' },
  print_copies: { value: '1', description: '默认打印份数' },
  auto_confirm: { value: 'false', description: '是否自动确认订单' },
  notification_sound: { value: 'true', description: '是否开启新订单提示音' }
}

export const settingsRoutes = new Elysia({ prefix: '/api/settings' })
  // 获取所有设置
  .get(
    '/',
    async ({ query }) => {
      const { storeId } = query

      // 查询数据库中的设置
      const whereClause = storeId ? eq(settings.storeId, storeId) : isNull(settings.storeId)

      const dbSettings = await db.select().from(settings).where(whereClause)

      // 合并默认设置和数据库设置
      const result: Record<string, { value: string; description: string }> = {
        ...DEFAULT_SETTINGS
      }

      for (const setting of dbSettings) {
        result[setting.key] = {
          value: setting.value,
          description: setting.description || DEFAULT_SETTINGS[setting.key]?.description || ''
        }
      }

      return success(result)
    },
    {
      query: t.Object({
        storeId: t.Optional(t.Number())
      }),
      detail: { tags: ['Settings'], summary: '获取设置' }
    }
  )
  // 获取单个设置
  .get(
    '/:key',
    async ({ params, query }) => {
      const { storeId } = query

      const whereClause = storeId
        ? and(eq(settings.key, params.key), eq(settings.storeId, storeId))
        : and(eq(settings.key, params.key), isNull(settings.storeId))

      const [setting] = await db.select().from(settings).where(whereClause).limit(1)

      if (setting) {
        return success({
          key: setting.key,
          value: setting.value,
          description: setting.description
        })
      }

      // 返回默认值
      const defaultSetting = DEFAULT_SETTINGS[params.key]
      if (defaultSetting) {
        return success({
          key: params.key,
          ...defaultSetting
        })
      }

      return error('设置项不存在', 404)
    },
    {
      params: t.Object({ key: t.String() }),
      query: t.Object({
        storeId: t.Optional(t.Number())
      }),
      detail: { tags: ['Settings'], summary: '获取单个设置' }
    }
  )
  // 更新设置 - 需要店长权限
  .use(requireManager)
  .put(
    '/:key',
    async ({ params, body, query }) => {
      const { storeId } = query
      const { value } = body

      const whereClause = storeId
        ? and(eq(settings.key, params.key), eq(settings.storeId, storeId))
        : and(eq(settings.key, params.key), isNull(settings.storeId))

      // 先尝试更新
      const [updated] = await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(whereClause)
        .returning()

      if (updated) {
        return success(updated, '设置更新成功')
      }

      // 不存在则插入
      const defaultSetting = DEFAULT_SETTINGS[params.key]
      const [created] = await db
        .insert(settings)
        .values({
          storeId: storeId || null,
          key: params.key,
          value,
          description: defaultSetting?.description || params.key
        })
        .returning()

      return success(created, '设置保存成功')
    },
    {
      params: t.Object({ key: t.String() }),
      query: t.Object({
        storeId: t.Optional(t.Number())
      }),
      body: t.Object({
        value: t.String()
      }),
      detail: { tags: ['Settings'], summary: '更新设置' }
    }
  )
  // 批量更新设置
  .put(
    '/',
    async ({ body, query }) => {
      const { storeId } = query
      const { items } = body

      const results = []

      for (const item of items) {
        const whereClause = storeId
          ? and(eq(settings.key, item.key), eq(settings.storeId, storeId))
          : and(eq(settings.key, item.key), isNull(settings.storeId))

        // 尝试更新
        const [updated] = await db
          .update(settings)
          .set({ value: item.value, updatedAt: new Date() })
          .where(whereClause)
          .returning()

        if (updated) {
          results.push(updated)
        } else {
          // 插入新设置
          const defaultSetting = DEFAULT_SETTINGS[item.key]
          const [created] = await db
            .insert(settings)
            .values({
              storeId: storeId || null,
              key: item.key,
              value: item.value,
              description: defaultSetting?.description || item.key
            })
            .returning()
          results.push(created)
        }
      }

      return success(results, '设置批量更新成功')
    },
    {
      query: t.Object({
        storeId: t.Optional(t.Number())
      }),
      body: t.Object({
        items: t.Array(
          t.Object({
            key: t.String(),
            value: t.String()
          })
        )
      }),
      detail: { tags: ['Settings'], summary: '批量更新设置' }
    }
  )
  // 重置设置为默认值
  .delete(
    '/:key',
    async ({ params, query, user }) => {
      const { storeId } = query

      const whereClause = storeId
        ? and(eq(settings.key, params.key), eq(settings.storeId, storeId))
        : and(eq(settings.key, params.key), isNull(settings.storeId))

      await db.delete(settings).where(whereClause)

      await logOperation({
        adminId: user?.id,
        action: 'settings_reset',
        targetType: 'setting',
        targetId: params.key,
        storeId: storeId ?? null,
        details: {}
      })

      return success(null, '设置已重置为默认值')
    },
    {
      params: t.Object({ key: t.String() }),
      query: t.Object({
        storeId: t.Optional(t.Number())
      }),
      detail: { tags: ['Settings'], summary: '重置设置' }
    }
  )
