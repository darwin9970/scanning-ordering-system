/**
 * 订单状态通知工具
 * 支持订单状态变更时的推送通知
 */

// 订单状态变更通知
export function notifyOrderStatusChange(order) {
  const statusMap = {
    PAID: { title: '订单已支付', icon: 'success' },
    PREPARING: { title: '开始制作', icon: 'none' },
    COMPLETED: { title: '订单已完成', icon: 'success' },
    CANCELLED: { title: '订单已取消', icon: 'none' }
  }
  
  const statusInfo = statusMap[order.status]
  if (!statusInfo) return
  
  // 显示通知
  uni.showToast({
    title: statusInfo.title,
    icon: statusInfo.icon,
    duration: 2000
  })
  
  // 触觉反馈
  // #ifdef MP-WEIXIN
  uni.vibrateShort({
    type: 'medium'
  })
  // #endif
  
  // 发送订阅消息（如果用户已授权）
  // #ifdef MP-WEIXIN
  if (order.status === 'PREPARING') {
    sendSubscribeMessage({
      templateId: 'ORDER_PREPARING',
      orderNo: order.orderNo,
      storeName: order.storeName
    })
  } else if (order.status === 'COMPLETED') {
    sendSubscribeMessage({
      templateId: 'ORDER_COMPLETED',
      orderNo: order.orderNo,
      storeName: order.storeName
    })
  }
  // #endif
}

// 发送订阅消息
function sendSubscribeMessage(data) {
  // 这里需要调用后端接口发送订阅消息
  // 暂时只做占位
  console.log('发送订阅消息:', data)
}

// 检查订单状态（轮询方式）
export function startOrderStatusPolling(orderId, onStatusChange) {
  let pollingInterval = null
  let lastStatus = null
  
  const poll = async () => {
    try {
      // 调用订单详情接口
      const res = await uni.request({
        url: `/api/orders/${orderId}`,
        method: 'GET'
      })
      
      if (res.data && res.data.status) {
        const currentStatus = res.data.status
        
        // 状态变更时触发回调
        if (lastStatus && lastStatus !== currentStatus) {
          notifyOrderStatusChange(res.data)
          if (onStatusChange) {
            onStatusChange(res.data)
          }
        }
        
        lastStatus = currentStatus
        
        // 如果订单已完成或取消，停止轮询
        if (['COMPLETED', 'CANCELLED'].includes(currentStatus)) {
          stopOrderStatusPolling()
        }
      }
    } catch (error) {
      console.error('轮询订单状态失败:', error)
    }
  }
  
  // 立即执行一次
  poll()
  
  // 每 5 秒轮询一次
  pollingInterval = setInterval(poll, 5000)
  
  // 返回停止函数
  return () => {
    stopOrderStatusPolling()
  }
  
  function stopOrderStatusPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }
}

// 监听 WebSocket 订单状态变更（如果使用 WebSocket）
export function listenOrderStatus(orderId, callback) {
  // 这里需要连接 WebSocket 并监听订单状态变更
  // 暂时只做占位
  console.log('监听订单状态:', orderId)
  
  // 示例：假设有 WebSocket 连接
  // ws.on('order_status_changed', (data) => {
  //   if (data.orderId === orderId) {
  //     notifyOrderStatusChange(data.order)
  //     if (callback) callback(data.order)
  //   }
  // })
}

