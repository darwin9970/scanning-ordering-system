/**
 * 订单 Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createOrder, getOrderDetail, getTableOrders, addOrderItems } from '@/api'
import { useTableStore } from './table'
import { useCartStore } from './cart'

export const useOrderStore = defineStore('order', () => {
  // ==================== State ====================
  
  // 当前桌台的订单列表
  const orders = ref([])
  
  // 当前查看的订单详情
  const currentOrder = ref(null)
  
  // 加载状态
  const loading = ref(false)
  
  // 提交中
  const submitting = ref(false)
  
  // ==================== Getters ====================
  
  // 未完成的订单
  const pendingOrders = computed(() => {
    return orders.value.filter(order => 
      ['PENDING', 'CONFIRMED', 'PREPARING'].includes(order.status)
    )
  })
  
  // 已完成的订单
  const completedOrders = computed(() => {
    return orders.value.filter(order => 
      ['COMPLETED', 'CANCELLED'].includes(order.status)
    )
  })
  
  // 是否有进行中的订单
  const hasActiveOrder = computed(() => pendingOrders.value.length > 0)
  
  // ==================== Actions ====================
  
  /**
   * 获取当前桌台的订单列表
   */
  const fetchOrders = async () => {
    const tableStore = useTableStore()
    
    if (!tableStore.storeId || !tableStore.tableId) {
      return
    }
    
    loading.value = true
    
    try {
      const data = await getTableOrders(tableStore.storeId, tableStore.tableId)
      orders.value = data.list || data || []
    } catch (error) {
      console.error('获取订单列表失败:', error)
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 获取订单详情
   * @param {number} orderId - 订单ID
   */
  const fetchOrderDetail = async (orderId) => {
    loading.value = true
    
    try {
      const data = await getOrderDetail(orderId)
      currentOrder.value = data
      return data
    } catch (error) {
      console.error('获取订单详情失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 提交订单 (下单)
   * @param {object} options - 可选参数
   * @param {string} options.remark - 订单备注
   * @param {number} options.peopleCount - 用餐人数
   */
  const submitOrder = async (options = {}) => {
    const tableStore = useTableStore()
    const cartStore = useCartStore()
    
    if (cartStore.isEmpty) {
      uni.showToast({
        title: '购物车是空的',
        icon: 'none'
      })
      return null
    }
    
    submitting.value = true
    
    try {
      const orderData = {
        storeId: tableStore.storeId,
        tableId: tableStore.tableId,
        tableNo: tableStore.tableNo,
        items: cartStore.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          skuId: item.skuId,
          skuName: item.skuName,
          attributes: item.attributes,
          price: item.price,
          quantity: item.quantity,
          remark: item.remark
        })),
        totalAmount: cartStore.totalPrice,
        remark: options.remark || '',
        peopleCount: options.peopleCount || 1
      }
      
      const result = await createOrder(orderData)
      
      // 清空购物车
      await cartStore.clear()
      
      // 刷新订单列表
      await fetchOrders()
      
      uni.showToast({
        title: '下单成功',
        icon: 'success'
      })
      
      return result
    } catch (error) {
      console.error('提交订单失败:', error)
      uni.showToast({
        title: error.message || '下单失败',
        icon: 'none'
      })
      throw error
    } finally {
      submitting.value = false
    }
  }
  
  /**
   * 加菜
   * @param {number} orderId - 订单ID
   * @param {array} items - 加菜商品列表
   */
  const addItems = async (orderId, items) => {
    submitting.value = true
    
    try {
      await addOrderItems(orderId, items)
      
      // 刷新订单详情
      await fetchOrderDetail(orderId)
      
      uni.showToast({
        title: '加菜成功',
        icon: 'success'
      })
      
      return true
    } catch (error) {
      console.error('加菜失败:', error)
      uni.showToast({
        title: error.message || '加菜失败',
        icon: 'none'
      })
      throw error
    } finally {
      submitting.value = false
    }
  }
  
  /**
   * 清除订单数据
   */
  const clear = () => {
    orders.value = []
    currentOrder.value = null
  }
  
  /**
   * 获取订单状态文本
   */
  const getStatusText = (status) => {
    const statusMap = {
      'PENDING': '待确认',
      'CONFIRMED': '已确认',
      'PREPARING': '制作中',
      'COMPLETED': '已完成',
      'CANCELLED': '已取消'
    }
    return statusMap[status] || status
  }
  
  /**
   * 获取订单状态类型 (用于样式)
   */
  const getStatusType = (status) => {
    const typeMap = {
      'PENDING': 'warning',
      'CONFIRMED': 'info',
      'PREPARING': 'warning',
      'COMPLETED': 'success',
      'CANCELLED': 'error'
    }
    return typeMap[status] || 'info'
  }
  
  return {
    // State
    orders,
    currentOrder,
    loading,
    submitting,
    
    // Getters
    pendingOrders,
    completedOrders,
    hasActiveOrder,
    
    // Actions
    fetchOrders,
    fetchOrderDetail,
    submitOrder,
    addItems,
    clear,
    getStatusText,
    getStatusType
  }
})
