/**
 * 桌台信息 Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getTableInfo, getStoreInfo, getCategories, getProducts } from '@/api'

export const useTableStore = defineStore('table', () => {
  // ==================== State ====================
  
  // 门店信息
  const store = ref(null)
  
  // 桌台信息
  const table = ref(null)
  
  // 分类列表
  const categories = ref([])
  
  // 商品列表 (按分类分组)
  const productsByCategory = ref({})
  
  // 加载状态
  const loading = ref(false)
  
  // ==================== Getters ====================
  
  // 门店ID
  const storeId = computed(() => store.value?.id || null)
  
  // 桌台ID
  const tableId = computed(() => table.value?.id || null)
  
  // 桌台号
  const tableNo = computed(() => table.value?.tableNo || '')
  
  // 门店名称
  const storeName = computed(() => store.value?.name || '')
  
  // 是否已初始化
  const isInitialized = computed(() => !!store.value && !!table.value)
  
  // 所有商品 (扁平化)
  const allProducts = computed(() => {
    const products = []
    Object.values(productsByCategory.value).forEach(list => {
      products.push(...list)
    })
    return products
  })
  
  // ==================== Actions ====================
  
  /**
   * 初始化桌台 (扫码后调用)
   * @param {number} storeIdParam - 门店ID
   * @param {number} tableIdParam - 桌台ID
   */
  const initTable = async (storeIdParam, tableIdParam) => {
    loading.value = true
    
    try {
      // 并行加载门店、桌台、分类信息
      const [storeData, tableData, categoryData] = await Promise.all([
        getStoreInfo(storeIdParam),
        getTableInfo(storeIdParam, tableIdParam),
        getCategories(storeIdParam)
      ])
      
      store.value = storeData
      table.value = tableData
      categories.value = categoryData.list || categoryData || []
      
      // 保存到本地存储
      uni.setStorageSync('storeId', storeIdParam)
      uni.setStorageSync('tableId', tableIdParam)
      
      // 加载商品
      await loadProducts(storeIdParam)
      
      return true
    } catch (error) {
      console.error('初始化桌台失败:', error)
      uni.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
      return false
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 加载商品列表
   */
  const loadProducts = async (storeIdParam) => {
    try {
      const data = await getProducts({ storeId: storeIdParam })
      const products = data.list || data || []
      
      // 按分类分组
      const grouped = {}
      categories.value.forEach(cat => {
        grouped[cat.id] = []
      })
      
      products.forEach(product => {
        if (grouped[product.categoryId]) {
          grouped[product.categoryId].push(product)
        }
      })
      
      productsByCategory.value = grouped
    } catch (error) {
      console.error('加载商品失败:', error)
    }
  }
  
  /**
   * 从本地存储恢复
   */
  const restoreFromStorage = async () => {
    const storedStoreId = uni.getStorageSync('storeId')
    const storedTableId = uni.getStorageSync('tableId')
    
    if (storedStoreId && storedTableId) {
      return await initTable(storedStoreId, storedTableId)
    }
    
    return false
  }
  
  /**
   * 清除桌台信息
   */
  const clear = () => {
    store.value = null
    table.value = null
    categories.value = []
    productsByCategory.value = {}
    uni.removeStorageSync('storeId')
    uni.removeStorageSync('tableId')
  }
  
  /**
   * 根据ID获取商品
   */
  const getProductById = (productId) => {
    return allProducts.value.find(p => p.id === productId)
  }
  
  return {
    // State
    store,
    table,
    categories,
    productsByCategory,
    loading,
    
    // Getters
    storeId,
    tableId,
    tableNo,
    storeName,
    isInitialized,
    allProducts,
    
    // Actions
    initTable,
    loadProducts,
    restoreFromStorage,
    clear,
    getProductById
  }
})
