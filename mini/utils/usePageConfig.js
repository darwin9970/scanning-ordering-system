/**
 * 页面配置加载 Composable
 * 用于加载和管理页面配置，实现动态页面渲染
 */
import { ref, onMounted } from 'vue'
import { getPageConfig } from '@/api/index'

/**
 * 页面类型枚举
 */
export const PAGE_TYPES = {
  HOME: 'HOME',
  MENU: 'MENU',
  PRODUCT_DETAIL: 'PRODUCT_DETAIL',
  ORDER_CENTER: 'ORDER_CENTER',
  PROFILE: 'PROFILE',
  MEMBER: 'MEMBER',
  BARRAGE: 'BARRAGE',
  TABBAR: 'TABBAR',
  TOPIC: 'TOPIC',
  RECHARGE: 'RECHARGE'
}

/**
 * 使用页面配置
 * @param {string} pageType - 页面类型
 * @param {number} storeId - 门店ID (可选，如果不传则从 store 中获取)
 */
export function usePageConfig(pageType, storeId = null) {
  const components = ref([])
  const loading = ref(true)
  const error = ref(null)
  const isDefault = ref(false)

  /**
   * 加载页面配置
   */
  const loadConfig = async (sid) => {
    loading.value = true
    error.value = null

    try {
      const targetStoreId = sid || storeId
      if (!targetStoreId) {
        console.warn('未指定门店ID，使用默认配置')
        components.value = getDefaultComponents(pageType)
        isDefault.value = true
        return
      }

      const res = await getPageConfig(targetStoreId, pageType)

      if (res.code === 200 && res.data) {
        components.value = res.data.components || []
        isDefault.value = res.data.isDefault || false
      } else {
        components.value = getDefaultComponents(pageType)
        isDefault.value = true
      }
    } catch (err) {
      console.error('加载页面配置失败:', err)
      error.value = err.message || '加载失败'
      components.value = getDefaultComponents(pageType)
      isDefault.value = true
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取默认组件配置
   */
  const getDefaultComponents = (type) => {
    switch (type) {
      case PAGE_TYPES.MENU:
        return [
          { id: 'menu-1', type: 'SEARCH', title: '搜索', visible: true, props: {} },
          {
            id: 'menu-2',
            type: 'ORDER_COMPONENT',
            title: '点单组件',
            visible: true,
            props: {}
          }
        ]
      case PAGE_TYPES.PROFILE:
        return [
          { id: 'profile-1', type: 'USER_INFO', title: '会员信息', visible: true, props: {} },
          {
            id: 'profile-2',
            type: 'FUNC_ENTRY',
            title: '功能入口',
            visible: true,
            props: {
              columns: 4,
              items: [
                {
                  icon: '📋',
                  text: '我的订单',
                  link: { type: 'page', value: '/pages/order/list' }
                },
                {
                  icon: '🎫',
                  text: '优惠券',
                  link: { type: 'page', value: '/pages/mine/coupons' }
                },
                { icon: '⭐', text: '积分', link: { type: 'page', value: '/pages/mine/points' } },
                { icon: '💰', text: '余额', link: { type: 'page', value: '/pages/mine/balance' } }
              ]
            }
          }
        ]
      case PAGE_TYPES.ORDER_CENTER:
        return [{ id: 'order-1', type: 'ORDER_LIST', title: '订单列表', visible: true, props: {} }]
      case PAGE_TYPES.MEMBER:
        return [
          { id: 'member-1', type: 'USER_INFO', title: '会员信息', visible: true, props: {} },
          {
            id: 'member-2',
            type: 'MEMBER_RIGHTS',
            title: '会员权益',
            visible: true,
            props: {}
          },
          { id: 'member-3', type: 'MEMBER_LEVEL', title: '会员等级', visible: true, props: {} }
        ]
      case PAGE_TYPES.RECHARGE:
        return [
          {
            id: 'recharge-1',
            type: 'RECHARGE_OPTIONS',
            title: '充值选项',
            visible: true,
            props: {
              columns: 2,
              items: [
                { amount: 100, gift: 10 },
                { amount: 200, gift: 30 },
                { amount: 500, gift: 100 },
                { amount: 1000, gift: 250 }
              ]
            }
          },
          {
            id: 'recharge-2',
            type: 'RECHARGE_BUTTON',
            title: '充值按钮',
            visible: true,
            props: { text: '立即充值' }
          }
        ]
      default:
        return []
    }
  }

  // 自动加载配置
  onMounted(() => {
    if (storeId) {
      loadConfig(storeId)
    }
  })

  return {
    components,
    loading,
    error,
    isDefault,
    loadConfig,
    getDefaultComponents
  }
}

/**
 * 处理页面导航
 * @param {object} item - 导航项 { link: { type, value } }
 */
export function handleNavigation(item) {
  if (!item || !item.link) return

  const { type, value } = item.link

  switch (type) {
    case 'page':
      uni.navigateTo({ url: value })
      break
    case 'tab':
      uni.switchTab({ url: value })
      break
    case 'category':
      uni.navigateTo({ url: `/pages/menu/menu?categoryId=${value}` })
      break
    case 'product':
      uni.navigateTo({ url: `/pages/product/detail?id=${value}` })
      break
    case 'cart':
      uni.switchTab({ url: '/pages/cart/cart' })
      break
    case 'search':
      uni.navigateTo({ url: '/pages/search/search' })
      break
    case 'webview':
      uni.navigateTo({ url: `/pages/webview/webview?url=${encodeURIComponent(value)}` })
      break
    case 'miniprogram':
      // 跳转其他小程序
      uni.navigateToMiniProgram({
        appId: value,
        fail: () => {
          uni.showToast({ title: '跳转失败', icon: 'none' })
        }
      })
      break
    default:
      console.warn('未知的导航类型:', type)
  }
}

export default {
  PAGE_TYPES,
  usePageConfig,
  handleNavigation
}
