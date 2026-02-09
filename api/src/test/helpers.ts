'use server'

import { createHmac } from 'crypto'
import type { JWTPayload } from '../lib/auth'

// Minimal HS256 JWT signer for tests; avoids pulling extra deps.
export function createTestToken(payload: JWTPayload, secret: string) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const data = `${b64(header)}.${b64(payload)}`
  const hmac = createHmac('sha256', secret)
  hmac.update(data)
  const signature = hmac.digest('base64url')
  return `${data}.${signature}`
}

// Very small in-memory Redis stub to satisfy rate-limit/idempotency paths.
export class MemoryRedis {
  store = new Map<string, { value: string; expireAt: number | null }>()

  private now() {
    return Date.now()
  }

  async incr(key: string) {
    const current = this.store.get(key)
    const value = current ? Number(current.value) + 1 : 1
    this.store.set(key, { value: value.toString(), expireAt: current?.expireAt ?? null })
    return value
  }

  async expire(key: string, ttlSeconds: number) {
    const current = this.store.get(key)
    if (!current) return 0
    this.store.set(key, { ...current, expireAt: this.now() + ttlSeconds * 1000 })
    return 1
  }

  async get(key: string) {
    const current = this.store.get(key)
    if (!current) return null
    if (current.expireAt && current.expireAt < this.now()) {
      this.store.delete(key)
      return null
    }
    return current.value
  }

  async set(key: string, value: string, mode?: string, ttl?: number, nx?: string) {
    const existing = await this.get(key)
    if (nx === 'NX' && existing !== null) {
      return null
    }

    let expireAt: number | null = null
    if (mode === 'EX' && ttl) {
      expireAt = this.now() + ttl * 1000
    }
    this.store.set(key, { value, expireAt })
    return 'OK'
  }

  async del(key: string) {
    return this.store.delete(key) ? 1 : 0
  }
}

// Helper to expose MemoryRedis via global for tests
export function injectTestRedis(instance: MemoryRedis) {
  ;(globalThis as unknown as { __TEST_REDIS__: MemoryRedis }).__TEST_REDIS__ = instance
}
