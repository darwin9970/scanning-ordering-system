'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'

export type WSEvent = {
  event: string
  data: unknown
  timestamp: number
}

export type WSEventHandler = (event: WSEvent) => void

export function useWebSocket(storeId: number | null, onEvent?: WSEventHandler) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!storeId || wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_URL}/ws/store/${storeId}`)

    ws.onopen = () => {
      console.log('🔗 WebSocket connected')
      setIsConnected(true)

      // 启动心跳
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping')
        }
      }, 30000)
    }

    ws.onmessage = (event) => {
      if (event.data === 'pong') return

      try {
        const data = JSON.parse(event.data) as WSEvent
        setLastEvent(data)
        onEvent?.(data)
      } catch (e) {
        console.error('WebSocket message parse error:', e)
      }
    }

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected')
      setIsConnected(false)

      // 清理心跳
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }

      // 自动重连
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('🔄 WebSocket reconnecting...')
        connect()
      }, 3000)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    wsRef.current = ws
  }, [storeId, onEvent])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return { isConnected, lastEvent, reconnect: connect }
}

// WebSocket 事件类型
export const WS_EVENTS = {
  NEW_ORDER: 'new_order',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  ORDER_PAID: 'order_paid',
  ORDER_COMPLETED: 'order_completed',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_REFUNDED: 'order_refunded',
  TABLE_STATUS_CHANGED: 'table_status_changed',
  CART_UPDATED: 'cart_updated',
  PRINT_JOB_CREATED: 'print_job_created',
  PRINT_JOB_COMPLETED: 'print_job_completed',
  PRINT_JOB_FAILED: 'print_job_failed'
} as const
