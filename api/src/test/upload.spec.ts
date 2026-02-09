'use server'

process.env.NODE_ENV = 'test'

import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { MemoryRedis, createTestToken, injectTestRedis } from './helpers'
import { setTestRedis } from '../lib/redis'

// Mock file system operations - track file operations
const mockFiles = new Map<string, Buffer>()
const mockExistsSync = mock((path: string) => {
  // For uploads directory, always return true (exists)
  if (path.includes('uploads')) {
    return true
  }
  return mockFiles.has(path)
})
const mockWriteFile = mock(async (path: string, data: Buffer) => {
  mockFiles.set(path, data)
})
const mockUnlink = mock(async (path: string) => {
  mockFiles.delete(path)
})
const mockMkdir = mock(async (_path: string, _options?: { recursive?: boolean }) => {
  // Mock directory creation - no-op for tests
})

// Mock fs/promises module before importing routes
mock.module('fs/promises', () => ({
  writeFile: mockWriteFile,
  unlink: mockUnlink,
  mkdir: mockMkdir
}))

// Mock fs module
mock.module('fs', () => ({
  existsSync: mockExistsSync
}))

async function buildApp() {
  const { Elysia } = await import('elysia')
  const { uploadRoutes } = await import('../routes/upload')
  const { authPlugin } = await import('../lib/auth')
  return new Elysia().use(authPlugin).use(uploadRoutes)
}

function authHeader() {
  const token = createTestToken(
    { id: 1, username: 'tester', role: 'OWNER', storeId: 1 },
    process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
  )
  return { authorization: `Bearer ${token}` }
}

// Helper to create a mock File object
function createMockFile(
  name: string,
  type: string,
  size: number,
  content: string = 'test content'
) {
  const blob = new Blob([content], { type })
  return new File([blob], name, { type })
}

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

describe('upload safeguards', () => {
  beforeEach(() => {
    // Reset mocks
    mockFiles.clear()
    mockWriteFile.mockClear()
    mockUnlink.mockClear()
    mockMkdir.mockClear()
    mockExistsSync.mockClear()

    // Inject fresh Redis
    injectTestRedis(new MemoryRedis())
    setTestRedis((globalThis as any).__TEST_REDIS__ as any)
  })

  it('single upload succeeds for valid image', async () => {
    const freshRedis = new MemoryRedis()
    injectTestRedis(freshRedis)
    setTestRedis(freshRedis as any)
    await freshRedis.del('rate:upload:single:1')

    const app = await buildApp()
    const headers = authHeader()
    const file = createMockFile('test.jpg', 'image/jpeg', 1024)

    const formData = new FormData()
    formData.append('file', file)

    const resp = await app.handle(
      new Request('http://localhost/api/upload/image', {
        method: 'POST',
        headers,
        body: formData
      })
    )
    const json = await parseJson(resp)

    expect(json.code).toBe(200)
    expect(json.data).toBeDefined()
    expect((json.data as any)?.url).toContain('/uploads/')
    expect(mockWriteFile).toHaveBeenCalledTimes(1)
  })

  it('rejects upload with invalid file type', async () => {
    const freshRedis = new MemoryRedis()
    injectTestRedis(freshRedis)
    setTestRedis(freshRedis as any)
    await freshRedis.del('rate:upload:single:1')

    const app = await buildApp()
    const headers = authHeader()
    const file = createMockFile('test.pdf', 'application/pdf', 1024)

    const formData = new FormData()
    formData.append('file', file)

    const resp = await app.handle(
      new Request('http://localhost/api/upload/image', {
        method: 'POST',
        headers,
        body: formData
      })
    )
    const json = await parseJson(resp)

    expect(json.code).toBe(400)
    expect(mockWriteFile).not.toHaveBeenCalled()
  })

  it('rejects upload with file size exceeding limit', async () => {
    const freshRedis = new MemoryRedis()
    injectTestRedis(freshRedis)
    setTestRedis(freshRedis as any)
    await freshRedis.del('rate:upload:single:1')

    const app = await buildApp()
    const headers = authHeader()
    // Create a file larger than 5MB
    const largeContent = 'x'.repeat(6 * 1024 * 1024)
    const file = createMockFile('test.jpg', 'image/jpeg', 6 * 1024 * 1024, largeContent)

    const formData = new FormData()
    formData.append('file', file)

    const resp = await app.handle(
      new Request('http://localhost/api/upload/image', {
        method: 'POST',
        headers,
        body: formData
      })
    )
    const json = await parseJson(resp)

    expect(json.code).toBe(400)
    expect(mockWriteFile).not.toHaveBeenCalled()
  })

  it('rejects batch upload exceeding max files limit', async () => {
    const freshRedis = new MemoryRedis()
    injectTestRedis(freshRedis)
    setTestRedis(freshRedis as any)
    await freshRedis.del('rate:upload:batch:1')

    const app = await buildApp()
    const headers = authHeader()
    // Create 21 files (exceeds MAX_BATCH_FILES = 20)
    const files: File[] = []
    for (let i = 0; i < 21; i++) {
      files.push(createMockFile(`test${i}.jpg`, 'image/jpeg', 1024))
    }

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    const resp = await app.handle(
      new Request('http://localhost/api/upload/images', {
        method: 'POST',
        headers,
        body: formData
      })
    )
    const json = await parseJson(resp)

    expect(json.code).toBe(400)
    expect(mockWriteFile).not.toHaveBeenCalled()
  })

  it('rejects delete with path traversal attempt', async () => {
    const freshRedis = new MemoryRedis()
    injectTestRedis(freshRedis)
    setTestRedis(freshRedis as any)
    await freshRedis.del('rate:upload:delete:1')

    const app = await buildApp()
    const headers = authHeader()

    // Test with .. in fileName parameter (path traversal)
    const resp = await app.handle(
      new Request('http://localhost/api/upload/%2e%2e%2fetc%2fpasswd', {
        method: 'DELETE',
        headers
      })
    )
    const json = await parseJson(resp)

    // The route should reject it with 400 before checking file existence
    expect(json.code).toBe(400)
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('rate limits repeated upload calls', async () => {
    const app = await buildApp()
    const headers = authHeader()
    const file = createMockFile('test.jpg', 'image/jpeg', 1024)

    const codes: number[] = []
    for (let i = 0; i < 35; i++) {
      const formData = new FormData()
      formData.append('file', file)

      const resp = await app.handle(
        new Request('http://localhost/api/upload/image', {
          method: 'POST',
          headers,
          body: formData
        })
      )
      const json = await parseJson(resp)
      codes.push(json.code)
    }

    expect(codes).toContain(429)
  })

  it('batch upload succeeds for valid images', async () => {
    const freshRedis = new MemoryRedis()
    injectTestRedis(freshRedis)
    setTestRedis(freshRedis as any)
    await freshRedis.del('rate:upload:batch:1')

    const app = await buildApp()
    const headers = authHeader()
    const files = [
      createMockFile('test1.jpg', 'image/jpeg', 1024),
      createMockFile('test2.png', 'image/png', 2048)
    ]

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    const resp = await app.handle(
      new Request('http://localhost/api/upload/images', {
        method: 'POST',
        headers,
        body: formData
      })
    )
    const json = await parseJson(resp)

    expect(json.code).toBe(200)
    expect(Array.isArray(json.data)).toBe(true)
    expect((json.data as any[]).length).toBe(2)
    expect(mockWriteFile).toHaveBeenCalledTimes(2)
  })
})
