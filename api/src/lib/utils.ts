import { createHash } from 'crypto'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import type { ApiResponse } from '../types'

// 配置 dayjs
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/**
 * 生成订单号
 * 格式: 年月日时分秒 + 4位随机数
 */
export function generateOrderNo(): string {
  const now = new Date()
  const dateStr = now
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14)
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')
  return `${dateStr}${random}`
}

/**
 * 生成桌台二维码 Token
 */
export function generateQrToken(storeId: number, tableId: number): string {
  const timestamp = Date.now()
  const data = `${storeId}-${tableId}-${timestamp}`
  return createHash('sha256').update(data).digest('hex').slice(0, 32)
}

/**
 * 密码加密 (简单实现，生产环境建议使用 bcrypt)
 */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

/**
 * 计算两点之间的距离 (Haversine 公式)
 * @returns 距离，单位：米
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // 地球半径，单位：米
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * 分页参数处理
 */
export function pagination(page: number = 1, pageSize: number = 10) {
  const take = Math.min(Math.max(pageSize, 1), 100)
  const skip = (Math.max(page, 1) - 1) * take
  return { take, skip }
}

/**
 * 成功响应
 */
export function success<T>(data: T, message = 'success'): ApiResponse<T> {
  return { code: 200, message, data }
}

/**
 * 错误响应
 */
export function error(message: string, code = 400): ApiResponse<null> {
  return { code, message, data: null }
}

/**
 * 日期格式化
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: 'date' | 'datetime' | 'time' = 'datetime'
): string {
  if (!date) return '-'
  const formatMap = {
    date: 'YYYY-MM-DD',
    datetime: 'YYYY-MM-DD HH:mm:ss',
    time: 'HH:mm:ss'
  }
  return dayjs(date).format(formatMap[format])
}

/**
 * 相对时间
 */
export function fromNow(date: string | Date | null | undefined): string {
  if (!date) return '-'
  return dayjs(date).fromNow()
}

// 导出 dayjs 实例供直接使用
export { dayjs }
