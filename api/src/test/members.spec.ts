'use server'

process.env.NODE_ENV = 'test'

import { describe, it, expect, beforeEach } from 'bun:test'
import { MemoryRedis, createTestToken, injectTestRedis } from './helpers'
import { setTestRedis, getRedis } from '../lib/redis'

async function parseJson(
  resp: Response
): Promise<{ code: number; data?: unknown; message?: string }> {
  try {
    return (await resp.json()) as { code: number; data?: unknown; message?: string }
  } catch {
    try {
      const text = await resp.text()
      return { code: resp.status || 500, data: { raw: text } }
    } catch {
      return { code: resp.status || 500 }
    }
  }
}

// Minimal db mock for the points use flow
function createDbMock() {
  const member = { id: 1, userId: 10, points: 5, level: 1 }
  let selectCallCount = 0

  const db: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            selectCallCount += 1
            // First select call (checking if member exists) returns the member
            if (selectCallCount === 1) {
              return [member]
            }
            return []
          }
        })
      })
    }),
    update: () => ({
      set: (_data: any) => ({
        where: () => ({
          returning: async () => {
            // Return updated member with points deducted
            const updated = { ...member, points: member.points - 1 }
            return [updated]
          }
        })
      })
    })
  }
  return db
}

async function buildApp() {
  // Dynamic import after test doubles are set, so redis/db stubs are picked up
  const { Elysia } = await import('elysia')
  const { memberRoutes } = await import('../routes/members')
  const { authPlugin } = await import('../lib/auth')
  const app = new Elysia().use(authPlugin).use(memberRoutes)
  return app
}

function authHeader() {
  const token = createTestToken(
    { id: 1, username: 'tester', role: 'OWNER', storeId: 1 },
    process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
  )
  return { authorization: `Bearer ${token}` }
}

describe('members points use', () => {
  beforeEach(() => {
    // inject in-memory redis
    injectTestRedis(new MemoryRedis())
    setTestRedis((globalThis as any).__TEST_REDIS__)
    // inject db mock for this test run
    ;(globalThis as any).__TEST_DB__ = createDbMock()
  })

  it('rate limits repeated calls', async () => {
    ;(globalThis as any).__TEST_DB__ = createDbMock()
    const app = await buildApp()
    const body = { userId: 10, points: 1 }
    const headers = { ...authHeader(), 'content-type': 'application/json' }

    // Pre-fill rate key to hit limit on next call
    const rateKey = 'rate:member:use:1'
    const client: any = getRedis()
    await client.set(rateKey, '10', 'EX', 60)

    const resp = await app.handle(
      new Request('http://localhost/api/members/points/use', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
    )
    const json = (await resp.json()) as { code: number }
    expect(json.code).toBe(429)
  })

  it('rejects duplicate idempotency key', async () => {
    const freshRedis = new MemoryRedis()
    injectTestRedis(freshRedis)
    setTestRedis(freshRedis as any)
    await freshRedis.del('rate:member:use:1')
    await freshRedis.del('idem:member:use:dup-key')

    const { setTestDb } = await import('../db')
    // Create fresh DB mock for this test
    const dbMock1 = createDbMock()
    ;(globalThis as any).__TEST_DB__ = dbMock1
    setTestDb(dbMock1)
    const app1 = await buildApp()
    const headers = {
      ...authHeader(),
      'content-type': 'application/json',
      'idempotency-key': 'dup-key'
    }
    const body = { userId: 10, points: 1 }

    const first = await app1.handle(
      new Request('http://localhost/api/members/points/use', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
    )
    const firstJson = await parseJson(first)
    expect(firstJson.code).toBe(200)

    // Create a new DB mock for the second request to reset select call count
    const dbMock2 = createDbMock()
    ;(globalThis as any).__TEST_DB__ = dbMock2
    setTestDb(dbMock2)
    const app2 = await buildApp()
    const second = await app2.handle(
      new Request('http://localhost/api/members/points/use', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
    )
    const secondJson = await parseJson(second)
    expect(secondJson.code).toBe(409)
  })
})
