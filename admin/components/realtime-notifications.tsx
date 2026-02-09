'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWebSocket, WS_EVENTS, type WSEvent } from '@/lib/websocket'
import { Bell, X, CheckCircle, AlertCircle, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'

type Notification = {
  id: string
  type: 'order' | 'status' | 'refund' | 'info'
  title: string
  message: string
  timestamp: number
}

export function RealtimeNotifications({ storeId }: { storeId: number }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showPanel, setShowPanel] = useState(false)

  const handleEvent = useCallback((event: WSEvent) => {
    let notification: Notification | null = null

    switch (event.event) {
      case WS_EVENTS.NEW_ORDER: {
        const data = event.data as {
          order: { orderNo: string; payAmount: string }
          itemCount: number
        }
        notification = {
          id: `${event.timestamp}`,
          type: 'order',
          title: '新订单',
          message: `订单 ${data.order.orderNo}，${formatPrice(Number(data.order.payAmount))}，${data.itemCount} 件商品`,
          timestamp: event.timestamp
        }
        // 播放提示音
        playNotificationSound()
        break
      }
      case WS_EVENTS.ORDER_STATUS_CHANGED: {
        const data = event.data as { order: { orderNo: string }; newStatus: string }
        const statusText = getStatusText(data.newStatus)
        notification = {
          id: `${event.timestamp}`,
          type: 'status',
          title: '订单状态变更',
          message: `订单 ${data.order.orderNo} 已${statusText}`,
          timestamp: event.timestamp
        }
        break
      }
      case WS_EVENTS.ORDER_REFUNDED: {
        const data = event.data as { order: { orderNo: string } }
        notification = {
          id: `${event.timestamp}`,
          type: 'refund',
          title: '订单退款',
          message: `订单 ${data.order.orderNo} 已退款`,
          timestamp: event.timestamp
        }
        break
      }
    }

    if (notification) {
      setNotifications((prev) => [notification!, ...prev].slice(0, 20))
    }
  }, [])

  const { isConnected } = useWebSocket(storeId, handleEvent)

  const clearNotifications = () => {
    setNotifications([])
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setShowPanel(!showPanel)}
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
        {isConnected && (
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500"></span>
        )}
      </Button>

      {showPanel && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <h3 className="font-medium">实时通知</h3>
            <div className="flex gap-2">
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearNotifications}>
                  清空
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setShowPanel(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">暂无通知</div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="flex gap-3 border-b p-3 hover:bg-gray-50">
                  <div className="flex-shrink-0">
                    {notification.type === 'order' && (
                      <ShoppingCart className="h-5 w-5 text-blue-500" />
                    )}
                    {notification.type === 'status' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {notification.type === 'refund' && (
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-sm text-gray-500 truncate">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(notification.timestamp)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-6 w-6"
                    onClick={() => removeNotification(notification.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    PENDING: '待支付',
    PAID: '支付',
    PREPARING: '开始制作',
    COMPLETED: '完成',
    CANCELLED: '取消',
    REFUNDED: '退款'
  }
  return map[status] || status
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function playNotificationSound() {
  try {
    const audio = new Audio('/notification.mp3')
    audio.volume = 0.5
    audio.play().catch(() => {
      // 忽略自动播放限制错误
    })
  } catch {
    // 忽略错误
  }
}
