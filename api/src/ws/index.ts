import { Elysia } from 'elysia'

// 存储 WebSocket 连接
const connections = new Map<string, Set<{ send(data: string): void }>>()

// 获取门店房间的所有连接
function getStoreConnections(storeId: number) {
  const key = `store:${storeId}`
  if (!connections.has(key)) {
    connections.set(key, new Set())
  }
  return connections.get(key)!
}

// 广播消息到门店
export function broadcastToStore(storeId: number, event: string, data: unknown) {
  const storeConnections = getStoreConnections(storeId)
  const message = JSON.stringify({ event, data, timestamp: Date.now() })

  storeConnections.forEach((ws) => {
    try {
      ws.send(message)
    } catch (e) {
      console.error('WebSocket send error:', e)
    }
  })

  console.log(`📡 Broadcast to store ${storeId}: ${event} (${storeConnections.size} clients)`)
}

// 广播消息到桌台
export function broadcastToTable(storeId: number, tableId: number, event: string, data: unknown) {
  const key = `table:${storeId}:${tableId}`
  const tableConnections = connections.get(key)

  if (!tableConnections) return

  const message = JSON.stringify({ event, data, timestamp: Date.now() })

  tableConnections.forEach((ws) => {
    try {
      ws.send(message)
    } catch (e) {
      console.error('WebSocket send error:', e)
    }
  })

  console.log(`📡 Broadcast to table ${storeId}:${tableId}: ${event}`)
}

// WebSocket 路由
export const wsRoutes = new Elysia({ prefix: '/ws' })
  .ws('/store/:storeId', {
    open(ws) {
      const storeId = Number(ws.data.params.storeId)
      const storeConnections = getStoreConnections(storeId)
      storeConnections.add(ws)
      console.log(`🔗 Store ${storeId} connected (${storeConnections.size} clients)`)

      ws.send(
        JSON.stringify({
          event: 'connected',
          data: { storeId, message: '已连接到门店实时通知' }
        })
      )
    },
    message(ws, message) {
      // 处理心跳
      if (message === 'ping') {
        ws.send('pong')
      }
    },
    close(ws) {
      const storeId = Number(ws.data.params.storeId)
      const storeConnections = getStoreConnections(storeId)
      storeConnections.delete(ws)
      console.log(`🔌 Store ${storeId} disconnected (${storeConnections.size} clients)`)
    }
  })
  .ws('/table/:storeId/:tableId', {
    open(ws) {
      const { storeId, tableId } = ws.data.params
      const key = `table:${storeId}:${tableId}`

      if (!connections.has(key)) {
        connections.set(key, new Set())
      }
      connections.get(key)!.add(ws)

      console.log(`🔗 Table ${storeId}:${tableId} connected`)

      ws.send(
        JSON.stringify({
          event: 'connected',
          data: { storeId, tableId, message: '已连接到桌台' }
        })
      )
    },
    message(ws, message) {
      if (message === 'ping') {
        ws.send('pong')
      }
    },
    close(ws) {
      const { storeId, tableId } = ws.data.params
      const key = `table:${storeId}:${tableId}`
      const tableConnections = connections.get(key)
      if (tableConnections) {
        tableConnections.delete(ws)
      }
      console.log(`🔌 Table ${storeId}:${tableId} disconnected`)
    }
  })

// WebSocket 事件类型
export const WS_EVENTS = {
  // 订单事件
  NEW_ORDER: 'new_order',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  ORDER_PAID: 'order_paid',
  ORDER_COMPLETED: 'order_completed',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_REFUNDED: 'order_refunded',

  // 桌台事件
  TABLE_STATUS_CHANGED: 'table_status_changed',
  CART_UPDATED: 'cart_updated',

  // 打印事件
  PRINT_JOB_CREATED: 'print_job_created',
  PRINT_JOB_COMPLETED: 'print_job_completed',
  PRINT_JOB_FAILED: 'print_job_failed'
} as const
