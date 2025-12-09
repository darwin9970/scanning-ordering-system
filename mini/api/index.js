/**
 * API 接口集合
 */
import { get, post, put, del } from './request'

// ==================== 桌台相关 ====================

/**
 * 获取桌台信息
 * @param {number} storeId - 门店ID
 * @param {number} tableId - 桌台ID
 */
export const getTableInfo = (storeId, tableId) => {
  return get(`/api/tables/${tableId}`, { storeId })
}

// ==================== 分类相关 ====================

/**
 * 获取分类列表
 * @param {number} storeId - 门店ID
 */
export const getCategories = (storeId) => {
  return get('/mini/categories', { storeId })
}

// ==================== 商品相关 ====================

/**
 * 获取商品列表
 * @param {object} params - 查询参数
 * @param {number} params.storeId - 门店ID
 * @param {number} params.categoryId - 分类ID (可选)
 */
export const getProducts = (params) => {
  return get('/mini/products', params)
}

/**
 * 获取商品详情
 * @param {number} productId - 商品ID
 */
export const getProductDetail = (productId) => {
  return get(`/mini/products/${productId}`)
}

// ==================== 购物车相关 ====================

/**
 * 获取购物车
 * @param {number} storeId - 门店ID
 * @param {number} tableId - 桌台ID
 */
export const getCart = (storeId, tableId) => {
  return get(`/api/cart/${storeId}/${tableId}`)
}

/**
 * 添加商品到购物车
 * @param {number} storeId - 门店ID
 * @param {number} tableId - 桌台ID
 * @param {object} item - 商品信息
 */
export const addToCart = (storeId, tableId, item) => {
  return post(`/api/cart/${storeId}/${tableId}/add`, item)
}

/**
 * 更新购物车商品数量
 * @param {number} storeId - 门店ID
 * @param {number} tableId - 桌台ID
 * @param {object} data - { itemKey, quantity }
 */
export const updateCartItem = (storeId, tableId, data) => {
  return put(`/api/cart/${storeId}/${tableId}/update`, data)
}

/**
 * 从购物车移除商品
 * @param {number} storeId - 门店ID
 * @param {number} tableId - 桌台ID
 * @param {string} itemKey - 商品唯一标识
 */
export const removeFromCart = (storeId, tableId, itemKey) => {
  return del(`/api/cart/${storeId}/${tableId}/remove`, { itemKey })
}

/**
 * 清空购物车
 * @param {number} storeId - 门店ID
 * @param {number} tableId - 桌台ID
 */
export const clearCart = (storeId, tableId) => {
  return del(`/api/cart/${storeId}/${tableId}`)
}

// ==================== 订单相关 ====================

/**
 * 创建订单
 * @param {object} orderData - 订单数据
 */
export const createOrder = (orderData) => {
  return post('/api/orders', orderData)
}

/**
 * 获取订单详情
 * @param {number} orderId - 订单ID
 */
export const getOrderDetail = (orderId) => {
  return get(`/api/orders/${orderId}`)
}

/**
 * 获取桌台订单列表
 * @param {number} storeId - 门店ID
 * @param {number} tableId - 桌台ID
 */
export const getTableOrders = (storeId, tableId) => {
  return get('/api/orders', { storeId, tableId })
}

/**
 * 加菜
 * @param {number} orderId - 订单ID
 * @param {array} items - 加菜商品列表
 */
export const addOrderItems = (orderId, items) => {
  return post(`/api/orders/${orderId}/add-items`, { items })
}

// ==================== 服务呼叫 ====================

/**
 * 发起服务呼叫
 * @param {object} data - { storeId, tableId, type, remark }
 */
export const callService = (data) => {
  return post('/api/service/call', data)
}

// ==================== 优惠相关 ====================

/**
 * 获取可领取的优惠券
 * @param {number} storeId - 门店ID
 */
export const getAvailableCoupons = (storeId) => {
  return get('/mini/coupons', { storeId })
}

/**
 * 计算优惠
 * @param {object} data - { storeId, items, couponId }
 */
export const calculateDiscount = (data) => {
  return post('/api/promotions/calculate', data)
}

// ==================== 门店相关 ====================

/**
 * 获取门店信息
 * @param {number} storeId - 门店ID
 */
export const getStoreInfo = (storeId) => {
  return get(`/api/stores/${storeId}`)
}

// ==================== 轮播图相关 ====================

/**
 * 获取轮播图列表
 * @param {object} params - 查询参数
 * @param {number} params.storeId - 门店ID
 */
export const getBanners = (params) => {
  return get('/mini/banners', params)
}

// ==================== 页面配置相关 ====================

/**
 * 获取已发布的页面配置
 * @param {object} params - 查询参数
 * @param {number} params.storeId - 门店ID
 * @param {string} params.pageType - 页面类型: HOME
 */
export const getPageConfig = (params) => {
  return get('/api/page-configs/published', params)
}

export default {
  getTableInfo,
  getCategories,
  getProducts,
  getProductDetail,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  createOrder,
  getOrderDetail,
  getTableOrders,
  addOrderItems,
  callService,
  getAvailableCoupons,
  calculateDiscount,
  getStoreInfo,
  getBanners,
  getPageConfig
}
