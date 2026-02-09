<template>
  <view class="page-index">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }" />

    <!-- 如果已配置页面布局，显示配置的布局 -->
    <template v-if="pageComponents.length > 0 && useCustomLayout">
      <page-renderer
        :components="pageComponents"
        :banners="banners"
        :announcement="storeAnnouncement"
        :hot-products="hotProducts"
        :new-products="newProducts"
        :coupons="coupons"
        :products="allProducts"
        :store-name="storeName"
        :store-distance="storeDistance"
        :cart-count="cartCount"
        :user-info="userInfo"
        @banner-click="handleBannerClick"
        @nav-click="handleNavClick"
        @product-click="handleProductClick"
      />

      <!-- 配置布局时，底部显示扫码入口 -->
      <view class="page-index__scan-footer">
        <q-button class="page-index__scan-btn" type="primary" size="large" @click="handleScan">
          扫码点餐
        </q-button>
        <view class="page-index__manual" @tap="showManualInput = true">
          <text>手动输入桌台号</text>
          <uni-icons type="right" size="14" color="#999999" />
        </view>
      </view>
    </template>

    <!-- 默认布局（未配置时显示） -->
    <template v-else>
      <!-- Logo -->
      <image class="page-index__logo" src="/static/images/logo.png" mode="aspectFill" />

      <!-- 标题 -->
      <text class="page-index__title">欢迎光临</text>
      <text class="page-index__subtitle">扫码开始点餐吧~</text>

      <!-- 扫码区域 -->
      <view class="page-index__scan-area">
        <view class="scan-animation">
          <view class="scan-animation__border" />
          <view class="scan-animation__line" />
          <uni-icons type="scan" size="80" color="#FF6B35" />
        </view>
      </view>

      <!-- 扫码按钮 -->
      <q-button class="page-index__scan-btn" type="primary" size="large" @click="handleScan">
        扫码点餐
      </q-button>

      <!-- 手动输入 -->
      <view class="page-index__manual" @tap="showManualInput = true">
        <text>手动输入桌台号</text>
        <uni-icons type="right" size="14" color="#999999" />
      </view>
    </template>

    <!-- 手动输入弹窗 -->
    <uni-popup ref="manualPopup" type="center" :mask-click="true">
      <view class="manual-popup">
        <text class="manual-popup__title">输入桌台号</text>
        <view class="manual-popup__input-wrap">
          <input
            v-model="manualInput.storeId"
            class="manual-popup__input"
            type="number"
            placeholder="门店ID"
          />
          <input
            v-model="manualInput.tableNo"
            class="manual-popup__input"
            placeholder="桌台号 (如 A01)"
          />
        </view>
        <view class="manual-popup__btns">
          <q-button type="secondary" @click="closeManualPopup">取消</q-button>
          <q-button type="primary" @click="handleManualSubmit">确定</q-button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useTableStore } from '@/store/table'
import { useCartStore } from '@/store/cart'
import { getBanners, getPageConfig, getAvailableCoupons } from '@/api'

const tableStore = useTableStore()
const cartStore = useCartStore()

// 状态栏高度
const statusBarHeight = ref(20)

// 页面配置
const pageComponents = ref([])
const useCustomLayout = ref(false)

// 轮播图
const banners = ref([])

// 热销商品
const hotProducts = computed(() => {
  const products = Object.values(tableStore.productsByCategory || {}).flat()
  return products.sort((a, b) => (b.sales || 0) - (a.sales || 0))
})

// 新品
const newProducts = computed(() => {
  const products = Object.values(tableStore.productsByCategory || {}).flat()
  return [...products]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 8)
})

// 优惠券
const coupons = ref([])

// 所有商品
const allProducts = computed(() => {
  return Object.values(tableStore.productsByCategory || {}).flat()
})

// 门店信息
const storeName = computed(() => tableStore.store?.name || '')
const storeDistance = computed(() => '0.5km')
const cartCount = computed(() => cartStore.totalCount)
const userInfo = computed(() => ({
  nickname: '用户',
  avatar: '',
  balance: '0.00',
  points: 0,
  couponCount: 0
}))

// 门店公告
const storeAnnouncement = computed(() => tableStore.store?.announcement || '')

// 手动输入弹窗
const manualPopup = ref(null)
const showManualInput = ref(false)
const manualInput = reactive({
  storeId: '',
  tableNo: ''
})

// 获取系统信息
uni.getSystemInfo({
  success: (res) => {
    statusBarHeight.value = res.statusBarHeight || 20
  }
})

// 扫码
const handleScan = () => {
  // #ifdef MP-WEIXIN
  uni.scanCode({
    onlyFromCamera: false,
    scanType: ['qrCode'],
    success: (res) => {
      console.log('扫码结果:', res.result)
      parseQRCode(res.result)
    },
    fail: (err) => {
      console.error('扫码失败:', err)
      // 开发环境使用模拟数据
      if (process.env.NODE_ENV === 'development') {
        goToMenu(1, 1)
      }
    }
  })
  // #endif

  // #ifdef H5
  // H5 环境直接使用测试数据
  goToMenu(1, 1)
  // #endif
}

// 解析二维码
const parseQRCode = (url) => {
  try {
    // 预期格式: https://xxx.com/scan?storeId=1&tableId=1
    const urlObj = new URL(url)
    const storeId = urlObj.searchParams.get('storeId')
    const tableId = urlObj.searchParams.get('tableId')

    if (storeId && tableId) {
      goToMenu(Number(storeId), Number(tableId))
    } else {
      uni.showToast({
        title: '无效的二维码',
        icon: 'none'
      })
    }
  } catch (e) {
    console.error('解析二维码失败:', e)
    uni.showToast({
      title: '无效的二维码',
      icon: 'none'
    })
  }
}

// 跳转到菜单页
const goToMenu = async (storeId, tableId) => {
  uni.showLoading({ title: '加载中...' })

  const success = await tableStore.initTable(storeId, tableId)

  uni.hideLoading()

  if (success) {
    // TabBar 页面必须用 switchTab
    uni.switchTab({
      url: '/pages/menu/menu'
    })
  }
}

// 关闭手动输入弹窗
const closeManualPopup = () => {
  manualPopup.value?.close()
}

// 手动输入提交
const handleManualSubmit = () => {
  if (!manualInput.storeId || !manualInput.tableNo) {
    uni.showToast({
      title: '请填写完整信息',
      icon: 'none'
    })
    return
  }

  closeManualPopup()
  goToMenu(Number(manualInput.storeId), manualInput.tableNo)
}

// 加载轮播图
const loadBanners = async () => {
  try {
    const storeId = uni.getStorageSync('storeId')
    if (!storeId) return

    const res = await getBanners({
      storeId,
      position: 'HOME_TOP'
    })
    if (res.code === 200) {
      banners.value = res.data || []
    }
  } catch (e) {
    console.error('加载轮播图失败:', e)
  }
}

// 加载页面配置
const loadPageConfig = async () => {
  try {
    const storeId = uni.getStorageSync('storeId')
    if (!storeId) {
      console.log('storeId不存在，跳过加载页面配置')
      return
    }
    console.log('加载首页配置, storeId:', storeId)
    const res = await getPageConfig({
      storeId,
      pageType: 'HOME'
    })
    console.log('首页配置响应:', res)
    if (res.code === 200 && res.data) {
      pageComponents.value = res.data.components || []
      useCustomLayout.value = !res.data.isDefault && pageComponents.value.length > 0
      console.log('首页组件:', pageComponents.value)
    }
  } catch (e) {
    console.error('加载页面配置失败:', e)
    uni.showToast({
      title: '页面配置加载失败',
      icon: 'none',
      duration: 2000
    })
  }
}

// 加载优惠券
const loadCoupons = async () => {
  try {
    const storeId = uni.getStorageSync('storeId')
    if (!storeId) return

    const res = await getAvailableCoupons(storeId)
    if (res.code === 200) {
      coupons.value = res.data || []
    }
  } catch (e) {
    console.error('加载优惠券失败:', e)
  }
}

// 处理轮播图点击
const handleBannerClick = (banner) => {
  if (!banner.linkType || !banner.linkValue) return

  switch (banner.linkType) {
    case 'product':
      uni.navigateTo({
        url: `/pages/product/detail?id=${banner.linkValue}`
      })
      break
    case 'category':
      // 跳转到菜单页并定位到分类
      uni.switchTab({
        url: '/pages/menu/menu'
      })
      break
    case 'page': {
      const tabBarPages = ['/pages/menu/menu', '/pages/order/list', '/pages/mine/mine']
      if (tabBarPages.includes(banner.linkValue)) {
        uni.switchTab({ url: banner.linkValue })
      } else {
        uni.navigateTo({ url: banner.linkValue })
      }
      break
    }
  }
}

// 处理导航点击
const handleNavClick = (item) => {
  if (!item.link || !item.link.type) return

  switch (item.link.type) {
    case 'page':
      if (item.link.value) {
        const tabBarPages = ['/pages/menu/menu', '/pages/order/list', '/pages/mine/mine']
        if (tabBarPages.includes(item.link.value)) {
          uni.switchTab({ url: item.link.value })
        } else {
          uni.navigateTo({ url: item.link.value })
        }
      }
      break
    case 'product':
      if (item.link.value) {
        uni.navigateTo({
          url: `/pages/product/detail?id=${item.link.value}`
        })
      }
      break
    case 'category':
      // 跳转到菜单页
      uni.switchTab({
        url: '/pages/menu/menu'
      })
      break
    case 'cart':
      uni.navigateTo({
        url: '/pages/cart/cart'
      })
      break
    case 'search':
      uni.showToast({
        title: '搜索功能开发中',
        icon: 'none'
      })
      break
  }
}

// 处理商品点击
const handleProductClick = (product) => {
  uni.navigateTo({
    url: `/pages/product/detail?id=${product.id}`
  })
}

// 监听storeId变化
watch(
  () => tableStore.storeId,
  (newStoreId) => {
    if (newStoreId) {
      console.log('storeId变化，重新加载数据:', newStoreId)
      loadPageConfig()
      loadBanners()
      loadCoupons()
    }
  },
  { immediate: true }
)

// 页面加载
onMounted(() => {
  // 如果storeId已存在，立即加载
  const storeId = uni.getStorageSync('storeId')
  if (storeId) {
    loadPageConfig()
    loadBanners()
    loadCoupons()
  }
})

// 页面显示时检查是否已有桌台信息
// eslint-disable-next-line no-unused-vars
const onShow = () => {
  if (tableStore.isInitialized) {
    uni.switchTab({
      url: '/pages/menu/menu'
    })
  }
}
</script>

<style lang="scss" scoped>
.page-index {
  min-height: 100vh;
  background: linear-gradient(180deg, $primary-lighter 0%, $bg-card 50%);
  display: flex;
  flex-direction: column;
  align-items: center;

  &__scan-footer {
    position: fixed;
    bottom: 120rpx;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 24rpx;
    z-index: 10;
  }

  &__logo {
    width: 160rpx;
    height: 160rpx;
    border-radius: 24rpx;
    margin-top: 80rpx;
    background: $bg-card;
    box-shadow: $shadow-base;
  }

  &__title {
    margin-top: 40rpx;
    font-size: 40rpx;
    font-weight: $font-weight-semibold;
    color: $text-primary;
  }

  &__subtitle {
    margin-top: 12rpx;
    font-size: 28rpx;
    color: $text-secondary;
  }

  &__scan-area {
    margin-top: 80rpx;
    width: 400rpx;
    height: 400rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__scan-btn {
    margin-top: 60rpx;
    width: 400rpx;
  }

  &__manual {
    margin-top: 40rpx;
    display: flex;
    align-items: center;
    font-size: 28rpx;
    color: $text-tertiary;

    text {
      margin-right: 8rpx;
    }
  }
}

.status-bar {
  width: 100%;
  flex-shrink: 0;
}

.scan-animation {
  position: relative;
  width: 300rpx;
  height: 300rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &__border {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 4rpx dashed $primary-light;
    border-radius: 24rpx;
  }

  &__line {
    position: absolute;
    top: 20rpx;
    left: 20rpx;
    right: 20rpx;
    height: 4rpx;
    background: linear-gradient(90deg, transparent, $primary, transparent);
    animation: scan-line 2s ease-in-out infinite;
  }
}

@keyframes scan-line {
  0%,
  100% {
    top: 20rpx;
    opacity: 0;
  }
  50% {
    top: 260rpx;
    opacity: 1;
  }
}

.manual-popup {
  width: 600rpx;
  background: $bg-card;
  border-radius: $radius-xl;
  padding: 40rpx;

  &__title {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: $text-primary;
    text-align: center;
    margin-bottom: 32rpx;
  }

  &__input-wrap {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
    margin-bottom: 32rpx;
  }

  &__input {
    height: 88rpx;
    background: $bg-grey;
    border-radius: $radius-base;
    padding: 0 24rpx;
    font-size: $font-size-base;
  }

  &__btns {
    display: flex;
    gap: 20rpx;

    .q-btn {
      flex: 1;
    }
  }
}
</style>
