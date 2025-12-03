/**
 * 购物车 Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '@/api'
import { useTableStore } from './table'

export const useCartStore = defineStore('cart', () => {
  // ==================== State ====================
  
  // 购物车商品列表
  const items = ref([])
  
  // 加载状态
  const loading = ref(false)
  
  // 是否正在提交
  const submitting = ref(false)
  
  // ==================== Getters ====================
  
  // 商品总数量
  const totalCount = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0)
  })
  
  // 商品总价
  const totalPrice = computed(() => {
    return items.value.reduce((sum, item) => {
      return sum + (item.price * item.quantity)
    }, 0)
  })
  
  // 是否为空
  const isEmpty = computed(() => items.value.length === 0)
  
  // 格式化总价 (保留两位小数)
  const formattedTotalPrice = computed(() => {
    return totalPrice.value.toFixed(2)
  })
  
  // ==================== Actions ====================
  
  /**
   * 获取购物车商品
   */
  const fetchCart = async () => {
    const tableStore = useTableStore()
    
    if (!tableStore.storeId || !tableStore.tableId) {
      return
    }
    
    loading.value = true
    
    try {
      const data = await getCart(tableStore.storeId, tableStore.tableId)
      items.value = data.items || data || []
    } catch (error) {
      console.error('获取购物车失败:', error)
      // 如果获取失败，使用本地缓存
      const cached = uni.getStorageSync('cart_items')
      if (cached) {
        items.value = cached
      }
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 添加商品到购物车
   * @param {object} product - 商品信息
   * @param {object} sku - SKU信息
   * @param {array} attributes - 属性选择
   * @param {number} quantity - 数量
   * @param {string} remark - 备注
   */
  const add = async (product, sku, attributes = [], quantity = 1, remark = '') => {
    const tableStore = useTableStore()
    
    // 生成唯一标识
    const itemKey = generateItemKey(product.id, sku?.id, attributes)
    
    // 查找是否已存在
    const existingIndex = items.value.findIndex(item => item.itemKey === itemKey)
    
    // 乐观更新
    const cartItem = {
      itemKey,
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      skuId: sku?.id,
      skuName: sku?.name || '',
      attributes,
      price: sku?.price || product.price,
      quantity,
      remark
    }
    
    if (existingIndex > -1) {
      // 已存在，增加数量
      items.value[existingIndex].quantity += quantity
    } else {
      // 新增
      items.value.push(cartItem)
    }
    
    // 保存到本地
    saveToLocal()
    
    // 同步到服务器 (不阻塞)
    if (tableStore.storeId && tableStore.tableId) {
      try {
        await addToCart(tableStore.storeId, tableStore.tableId, cartItem)
      } catch (error) {
        console.error('同步购物车失败:', error)
      }
    }
    
    return true
  }
  
  /**
   * 更新商品数量
   * @param {string} itemKey - 商品唯一标识
   * @param {number} quantity - 新数量
   */
  const updateQuantity = async (itemKey, quantity) => {
    const tableStore = useTableStore()
    const index = items.value.findIndex(item => item.itemKey === itemKey)
    
    if (index === -1) return false
    
    if (quantity <= 0) {
      // 数量为0，删除
      return await remove(itemKey)
    }
    
    // 乐观更新
    const oldQuantity = items.value[index].quantity
    items.value[index].quantity = quantity
    saveToLocal()
    
    // 同步到服务器
    if (tableStore.storeId && tableStore.tableId) {
      try {
        await updateCartItem(tableStore.storeId, tableStore.tableId, {
          itemKey,
          quantity
        })
      } catch (error) {
        // 回滚
        items.value[index].quantity = oldQuantity
        saveToLocal()
        console.error('更新购物车失败:', error)
      }
    }
    
    return true
  }
  
  /**
   * 删除商品
   * @param {string} itemKey - 商品唯一标识
   */
  const remove = async (itemKey) => {
    const tableStore = useTableStore()
    const index = items.value.findIndex(item => item.itemKey === itemKey)
    
    if (index === -1) return false
    
    // 乐观更新
    const removedItem = items.value.splice(index, 1)[0]
    saveToLocal()
    
    // 同步到服务器
    if (tableStore.storeId && tableStore.tableId) {
      try {
        await removeFromCart(tableStore.storeId, tableStore.tableId, itemKey)
      } catch (error) {
        // 回滚
        items.value.splice(index, 0, removedItem)
        saveToLocal()
        console.error('删除购物车商品失败:', error)
      }
    }
    
    return true
  }
  
  /**
   * 清空购物车
   */
  const clear = async () => {
    const tableStore = useTableStore()
    
    // 乐观更新
    const backup = [...items.value]
    items.value = []
    saveToLocal()
    
    // 同步到服务器
    if (tableStore.storeId && tableStore.tableId) {
      try {
        await clearCart(tableStore.storeId, tableStore.tableId)
      } catch (error) {
        // 回滚
        items.value = backup
        saveToLocal()
        console.error('清空购物车失败:', error)
      }
    }
    
    return true
  }
  
  /**
   * 获取商品在购物车中的数量
   * @param {number} productId - 商品ID
   */
  const getProductQuantity = (productId) => {
    return items.value
      .filter(item => item.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0)
  }
  
  /**
   * 生成商品唯一标识
   */
  const generateItemKey = (productId, skuId, attributes) => {
    const attrStr = attributes
      .map(a => `${a.name}:${a.value}`)
      .sort()
      .join('|')
    return `${productId}-${skuId || 0}-${attrStr}`
  }
  
  /**
   * 保存到本地存储
   */
  const saveToLocal = () => {
    uni.setStorageSync('cart_items', items.value)
  }
  
  /**
   * 从本地存储恢复
   */
  const restoreFromLocal = () => {
    const cached = uni.getStorageSync('cart_items')
    if (cached) {
      items.value = cached
    }
  }
  
  return {
    // State
    items,
    loading,
    submitting,
    
    // Getters
    totalCount,
    totalPrice,
    isEmpty,
    formattedTotalPrice,
    
    // Actions
    fetchCart,
    add,
    updateQuantity,
    remove,
    clear,
    getProductQuantity,
    restoreFromLocal
  }
})
