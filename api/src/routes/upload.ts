import { Elysia, t } from 'elysia'
import { mkdir, writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { success, error } from '../lib/utils'
import { requirePermission } from '../lib/auth'
import { getRedis } from '../lib/redis'

// 上传目录
const UPLOAD_DIR = join(process.cwd(), 'uploads')
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_BATCH_FILES = 20
const UPLOAD_RATE_PREFIX = 'rate:upload:'
const UPLOAD_RATE_LIMIT = { limit: 30, ttl: 60 } // 每分钟 30 次

// 确保上传目录存在
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

// 生成唯一文件名
function generateFileName(originalName: string): string {
  const ext = originalName.split('.').pop() || 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}.${ext}`
}

function hasAllowedExt(name: string) {
  const lower = name.toLowerCase()
  return ALLOWED_EXTS.some((ext) => lower.endsWith(ext))
}

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
  if (count === 1) await redis.expire(key, UPLOAD_RATE_LIMIT.ttl)
  return count <= UPLOAD_RATE_LIMIT.limit
}

export const uploadRoutes = new Elysia({ prefix: '/api/upload' })
  .use(requirePermission('upload:write'))
  // 上传图片
  .post(
    '/image',
    async ({ body, headers, user }) => {
      const { file } = body

      const ip = getClientIp(headers as Record<string, string | undefined>)
      const rateKey = `${UPLOAD_RATE_PREFIX}single:${user?.id || ip}`
      if (!(await checkRateLimit(rateKey))) {
        return error('操作过于频繁，请稍后重试', 429)
      }

      if (!file) {
        return error('请选择文件', 400)
      }

      if (!hasAllowedExt(file.name)) {
        return error('不支持的文件扩展名', 400)
      }

      // 检查文件类型
      if (!ALLOWED_TYPES.includes(file.type || '')) {
        return error('只支持 JPG、PNG、GIF、WEBP 格式', 400)
      }

      // 检查文件大小
      if (file.size > MAX_SIZE) {
        return error('文件大小不能超过 5MB', 400)
      }

      try {
        await ensureUploadDir()

        const fileName = generateFileName(file.name)
        const filePath = join(UPLOAD_DIR, fileName)

        // 将文件写入磁盘
        const arrayBuffer = await file.arrayBuffer()
        await writeFile(filePath, Buffer.from(arrayBuffer))

        // 返回相对路径
        const url = `/uploads/${fileName}`

        return success({ url, fileName }, '上传成功')
      } catch (e) {
        console.error('Upload error:', e)
        return error('上传失败', 500)
      }
    },
    {
      body: t.Object({
        file: t.File()
      }),
      detail: { tags: ['Upload'], summary: '上传图片' }
    }
  )

  // 批量上传图片
  .post(
    '/images',
    async ({ body, headers, user }) => {
      const { files } = body

      const ip = getClientIp(headers as Record<string, string | undefined>)
      const rateKey = `${UPLOAD_RATE_PREFIX}batch:${user?.id || ip}`
      if (!(await checkRateLimit(rateKey))) {
        return error('操作过于频繁，请稍后重试', 429)
      }

      if (!files || files.length === 0) {
        return error('请选择文件', 400)
      }

      if (files.length > MAX_BATCH_FILES) {
        return error(`单次最多上传 ${MAX_BATCH_FILES} 个文件`, 400)
      }

      try {
        await ensureUploadDir()

        const results = []

        for (const file of files) {
          // 检查扩展名
          if (!hasAllowedExt(file.name)) {
            results.push({ name: file.name, error: '不支持的扩展名' })
            continue
          }

          // 检查文件类型
          if (!ALLOWED_TYPES.includes(file.type || '')) {
            results.push({ name: file.name, error: '不支持的格式' })
            continue
          }

          // 检查文件大小
          if (file.size > MAX_SIZE) {
            results.push({ name: file.name, error: '文件过大' })
            continue
          }

          const fileName = generateFileName(file.name)
          const filePath = join(UPLOAD_DIR, fileName)

          const arrayBuffer = await file.arrayBuffer()
          await writeFile(filePath, Buffer.from(arrayBuffer))

          results.push({
            name: file.name,
            url: `/uploads/${fileName}`,
            fileName
          })
        }

        return success(results, '上传完成')
      } catch (e) {
        console.error('Upload error:', e)
        return error('上传失败', 500)
      }
    },
    {
      body: t.Object({
        files: t.Files()
      }),
      detail: { tags: ['Upload'], summary: '批量上传图片' }
    }
  )

  // 删除图片
  .delete(
    '/:fileName',
    async ({ params, headers, user }) => {
      const ip = getClientIp(headers as Record<string, string | undefined>)
      const rateKey = `${UPLOAD_RATE_PREFIX}delete:${user?.id || ip}`
      if (!(await checkRateLimit(rateKey))) {
        return error('操作过于频繁，请稍后重试', 429)
      }

      if (
        params.fileName.includes('..') ||
        params.fileName.includes('/') ||
        params.fileName.includes('\\')
      ) {
        return error('非法文件名', 400)
      }

      const filePath = join(UPLOAD_DIR, params.fileName)

      if (!existsSync(filePath)) {
        return error('文件不存在', 404)
      }

      try {
        await unlink(filePath)
        return success(null, '删除成功')
      } catch (e) {
        console.error('Delete error:', e)
        return error('删除失败', 500)
      }
    },
    {
      params: t.Object({ fileName: t.String() }),
      detail: { tags: ['Upload'], summary: '删除图片' }
    }
  )
