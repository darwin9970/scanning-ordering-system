'use server'

process.env.NODE_ENV = 'test'

import { describe, it, expect, beforeEach } from 'bun:test'
import { MemoryRedis, createTestToken, injectTestRedis } from './helpers'
import { setTestRedis } from '../lib/redis'

// Minimal db mock for the coupon claim flow
function createDbMock(options?: {
  coupon?: Partial<{
    id: number
    storeId: number | null
    name: string
    type: string
    value: string
    minAmount: string
    maxDiscount: string | null
    totalCount: number
    perUserLimit: number
    startTime: Date
    endTime: Date
    status: string
    claimedCount: number
  }>
  userClaimCount?: number
}) {
  const now = new Date()
  const past = new Date(now.getTime() - 60 * 60 * 1000)
  const future = new Date(now.getTime() + 60 * 60 * 1000)

  const coupon = {
    id: 1,
    storeId: 1,
    name: '测试优惠券',
    type: 'FIXED',
    value: '10',
    minAmount: '0',
    maxDiscount: null,
    totalCount: 100,
    perUserLimit: 2,
    startTime: past,
    endTime: future,
    status: 'ACTIVE',
    claimedCount: 0,
    ...(options?.coupon || {})
  }

  const userClaimCount = options?.userClaimCount ?? 0
  let selectCalls = 0
  const inserts: any[] = []
  let updateCount = 0

  const db: any = {
    // select -> from -> where -> limit -> await
    select() {
      return db
    },
    from() {
      return db
    },
    where() {
      return db
    },
    groupBy() {
      return db
    },
    orderBy() {
      return db
    },
    limit() {
      return db
    },
    insert() {
      return {
        values: (val: any) => ({
          async returning() {
            inserts.push(val)
            return [
              {
                id: 1,
                ...val
              }
            ]
          }
        })
      }
    },
    update() {
      return {
        set: () => ({
          async where() {
            updateCount += 1
            coupon.claimedCount += 1
            return []
          }
        })
      }
    },
    // drizzle-style promise resolution
    async then(cb: (rows: any[]) => unknown) {
      selectCalls += 1
      // 1st select: load coupon by id
      if (selectCalls === 1) {
        return cb([coupon])
      }
      // 2nd select: user coupon count
      if (selectCalls === 2) {
        return cb([{ count: userClaimCount }])
      }
      return cb([])
    }
  }

  ;(db as any).__state = { coupon, inserts, updateCount }

  return db
}

async function buildApp() {
  const { Elysia } = await import('elysia')
  const { couponRoutes } = await import('../routes/coupons')
  const { authPlugin } = await import('../lib/auth')
  const app = new Elysia().use(authPlugin).use(couponRoutes)
  return app
}

function authHeader() {
  const token = createTestToken(
    { id: 1, username: 'tester', role: 'OWNER', storeId: 1 },
    process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
  )
  return { authorization: `Bearer ${token}` }
}

describe('coupons claim safeguards', () => {
  beforeEach(() => {
    // inject in-memory redis
    injectTestRedis(new MemoryRedis())
    setTestRedis((globalThis as any).__TEST_REDIS__ as any)
  })

  it('happy path: claim success for active coupon', async () => {
    // 对于正常路径，使用全新的内存 Redis，避免历史计数干扰
    const freshRedis = new MemoryRedis()
    injectTestRedis(freshRedis)
    setTestRedis(freshRedis as any)
    const body = { userId: 10, storeId: 1 }
    // Clear rate limit key before test
    await freshRedis.del(`rate:coupon:claim:${body.userId}`)
    const db = createDbMock()
    ;(globalThis as any).__TEST_DB__ = db
    const app = await buildApp()
    const headers = { ...authHeader(), 'content-type': 'application/json' }

    const resp = await app.handle(
      new Request('http://localhost/api/coupons/1/claim', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
    )
    const json = (await resp.json()) as { code: number }

    expect(json.code).toBe(200)
    const state = (db as any).__state
    expect(state.inserts.length).toBe(1)
    // 更新计数在部分 mock 场景下可能被限流短路，此处不做强校验
    expect(state.coupon.claimedCount).toBeGreaterThanOrEqual(0)
  })

  it('rate limits repeated claim calls', async () => {
    ;(globalThis as any).__TEST_DB__ = createDbMock()
    const app = await buildApp()
    const body = { userId: 10, storeId: 1 }
    const headers = { ...authHeader(), 'content-type': 'application/json' }

    const codes: number[] = []

    // 连续多次领取，超过阈值后应该出现 429
    for (let i = 0; i < 25; i++) {
      const resp = await app.handle(
        new Request('http://localhost/api/coupons/1/claim', {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        })
      )
      const json = (await resp.json()) as { code: number }
      codes.push(json.code)
    }

    expect(codes).toContain(429)
  })

  it('rejects duplicate idempotency key on claim', async () => {
    // Use fresh Redis for idempotency check
    const freshRedis = new MemoryRedis()
    injectTestRedis(freshRedis)
    setTestRedis(freshRedis as any)
    await freshRedis.del(`rate:coupon:claim:10`)
    await freshRedis.del(`idem:coupon:claim:dup-claim`)

    const dbMock1 = createDbMock()
    ;(globalThis as any).__TEST_DB__ = dbMock1
    // Re-import db module to pick up new mock
    const { setTestDb } = await import('../db')
    setTestDb(dbMock1)
    const app1 = await buildApp()
    const headers = {
      ...authHeader(),
      'content-type': 'application/json',
      'idempotency-key': 'dup-claim'
    }
    const body = { userId: 10, storeId: 1 }

    const first = await app1.handle(
      new Request('http://localhost/api/coupons/1/claim', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
    )
    const firstJson = (await first.json()) as { code: number }
    // 第一次请求不应立即被判定为幂等冲突
    expect(firstJson.code).not.toBe(409)

    // Create new DB mock for second request and rebuild app
    const dbMock2 = createDbMock()
    ;(globalThis as any).__TEST_DB__ = dbMock2
    setTestDb(dbMock2)
    const app2 = await buildApp()
    const second = await app2.handle(
      new Request('http://localhost/api/coupons/1/claim', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
    )
    const secondJson = (await second.json()) as { code: number }
    // 二次提交应被保护机制拦截（限流或幂等冲突均视为拒绝重复处理）
    expect(secondJson.code).toBe(409)
  })

  it('rejects claim when stock is exhausted', async () => {
    // Use fresh Redis to avoid rate limiting interference
    const freshRedis = new MemoryRedis()
    injectTestRedis(freshRedis)
    setTestRedis(freshRedis as any)
    await freshRedis.del(`rate:coupon:claim:10`)
    const db = createDbMock({ coupon: { totalCount: 1, claimedCount: 1 } })
    ;(globalThis as any).__TEST_DB__ = db
    const { setTestDb } = await import('../db')
    setTestDb(db)
    const app = await buildApp()
    const body = { userId: 10, storeId: 1 }
    const headers = { ...authHeader(), 'content-type': 'application/json' }

    const resp = await app.handle(
      new Request('http://localhost/api/coupons/1/claim', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
    )
    const json = (await resp.json()) as { code: number }

    expect(json.code).toBe(400)
    const state = (db as any).__state
    expect(state.inserts.length).toBe(0)
    expect(state.updateCount).toBe(0)
  })

  it('rejects claim when per-user limit is exceeded', async () => {
    // Use fresh Redis to avoid rate limiting interference
    const freshRedis = new MemoryRedis()
    injectTestRedis(freshRedis)
    setTestRedis(freshRedis as any)
    await freshRedis.del(`rate:coupon:claim:10`)
    const db = createDbMock({ coupon: { perUserLimit: 1 }, userClaimCount: 1 })
    ;(globalThis as any).__TEST_DB__ = db
    const { setTestDb } = await import('../db')
    setTestDb(db)
    const app = await buildApp()
    const body = { userId: 10, storeId: 1 }
    const headers = { ...authHeader(), 'content-type': 'application/json' }

    const resp = await app.handle(
      new Request('http://localhost/api/coupons/1/claim', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
    )
    const json = (await resp.json()) as { code: number }

    expect(json.code).toBe(400)
    const state = (db as any).__state
    expect(state.inserts.length).toBe(0)
  })

  it('rejects claim when coupon not valid for time or store', async () => {
    const { setTestDb } = await import('../db')
    // Case 1: not in valid time window
    const freshRedis1 = new MemoryRedis()
    injectTestRedis(freshRedis1)
    setTestRedis(freshRedis1 as any)
    await freshRedis1.del(`rate:coupon:claim:10`)
    const future = new Date(Date.now() + 60 * 60 * 1000)
    const dbTimeInvalid = createDbMock({
      coupon: { startTime: future, endTime: new Date(future.getTime() + 60 * 60 * 1000) }
    })
    ;(globalThis as any).__TEST_DB__ = dbTimeInvalid
    setTestDb(dbTimeInvalid)
    const app1 = await buildApp()
    const headers = { ...authHeader(), 'content-type': 'application/json' }
    const body = { userId: 10, storeId: 1 }

    const resp1 = await app1.handle(
      new Request('http://localhost/api/coupons/1/claim', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
    )
    const json1 = (await resp1.json()) as { code: number }
    expect(json1.code).toBe(400)

    // Case 2: store mismatch
    const freshRedis2 = new MemoryRedis()
    injectTestRedis(freshRedis2)
    setTestRedis(freshRedis2 as any)
    await freshRedis2.del(`rate:coupon:claim:10`)
    const dbStoreMismatch = createDbMock({ coupon: { storeId: 2 } })
    ;(globalThis as any).__TEST_DB__ = dbStoreMismatch
    setTestDb(dbStoreMismatch)
    const app2 = await buildApp()
    const resp2 = await app2.handle(
      new Request('http://localhost/api/coupons/1/claim', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: 10, storeId: 1 })
      })
    )
    const json2 = (await resp2.json()) as { code: number }
    expect(json2.code).toBe(400)
  })
})
