<template>
  <view class="page-mine">
    <!-- 如果已配置页面布局，显示配置的布局 -->
    <template v-if="pageComponents.length > 0 && useCustomLayout">
      <page-renderer
        :components="pageComponents"
        :user-info="userInfo"
        :member-info="memberInfo"
        :coupon-count="couponCount"
        :order-count="orderCount"
        :wifi-info="wifiInfo"
        :table-info="tableInfo"
        @nav-click="handleNavClick"
      />
    </template>

    <!-- 默认布局（未配置时显示） -->
    <template v-else>
      <!-- 顶部背景 -->
      <view class="header-bg" />

      <!-- 用户信息 -->
      <view class="user-section">
        <view class="user-card" @tap="handleLogin">
          <view class="user-card__avatar">
            <image
              v-if="userInfo.avatar"
              class="user-card__avatar-img"
              :src="userInfo.avatar"
              mode="aspectFill"
            />
            <view v-else class="user-card__avatar-default">
              <uni-icons type="person-filled" size="36" color="#FF6B35" />
            </view>
          </view>
          <view class="user-card__info">
            <text class="user-card__name">
              {{ userInfo.nickname || '点击登录' }}
            </text>
            <text class="user-card__tip">
              {{ userInfo.phone ? formatPhone(userInfo.phone) : '登录享受更多优惠' }}
            </text>
          </view>
          <uni-icons type="right" size="18" color="#999" />
        </view>

        <!-- 会员卡片（如果已登录且有会员信息） -->
        <member-card
          v-if="memberInfo"
          :level="memberInfo.level || 1"
          :points="memberInfo.points || 0"
          :coupon-count="couponCount"
          @click="goToMember"
          @points-click="goToMember"
          @coupon-click="goToCoupons"
        />

        <!-- 数据统计（未登录或未成为会员时显示） -->
        <view v-else class="stats-card">
          <view class="stats-item" @tap="goToMember">
            <text class="stats-value">
              {{ memberInfo?.points || 0 }}
            </text>
            <text class="stats-label">积分</text>
          </view>
          <view class="stats-divider" />
          <view class="stats-item" @tap="goToCoupons">
            <text class="stats-value">
              {{ couponCount }}
            </text>
            <text class="stats-label">优惠券</text>
          </view>
          <view class="stats-divider" />
          <view class="stats-item" @tap="goToOrders('')">
            <text class="stats-value">
              {{ orderCount }}
            </text>
            <text class="stats-label">订单</text>
          </view>
        </view>
      </view>

      <!-- 订单入口 -->
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">我的订单</text>
          <view class="section-more" @tap="goToOrders('')">
            <text>全部</text>
            <uni-icons type="right" size="14" color="#999" />
          </view>
        </view>
        <view class="order-grid">
          <view class="order-item" @tap="goToOrders('PENDING')">
            <view class="order-icon order-icon--pending">
              <uni-icons type="wallet" size="24" color="#FF6B35" />
            </view>
            <text class="order-text">待确认</text>
          </view>
          <view class="order-item" @tap="goToOrders('PREPARING')">
            <view class="order-icon order-icon--preparing">
              <uni-icons type="fire" size="24" color="#FA8C16" />
            </view>
            <text class="order-text">制作中</text>
          </view>
          <view class="order-item" @tap="goToOrders('COMPLETED')">
            <view class="order-icon order-icon--completed">
              <uni-icons type="checkbox-filled" size="24" color="#52C41A" />
            </view>
            <text class="order-text">已完成</text>
          </view>
          <view class="order-item" @tap="goToService">
            <view class="order-icon order-icon--service">
              <uni-icons type="headphones" size="24" color="#1890FF" />
            </view>
            <text class="order-text">呼叫服务</text>
          </view>
        </view>
      </view>

      <!-- 功能列表 -->
      <view class="section-card">
        <view class="menu-item" @tap="goToCoupons">
          <view class="menu-icon menu-icon--coupon">
            <uni-icons type="gift-filled" size="20" color="#FF6B35" />
          </view>
          <text class="menu-text">我的优惠券</text>
          <view class="menu-right">
            <text v-if="couponCount" class="menu-badge">{{ couponCount }}张可用</text>
            <uni-icons type="right" size="14" color="#ccc" />
          </view>
        </view>

        <view class="menu-item" @tap="goToMember">
          <view class="menu-icon menu-icon--vip">
            <uni-icons type="vip-filled" size="20" color="#FAAD14" />
          </view>
          <text class="menu-text">会员中心</text>
          <view class="menu-right">
            <uni-icons type="right" size="14" color="#ccc" />
          </view>
        </view>

        <view class="menu-item" @tap="goToSettings">
          <view class="menu-icon menu-icon--settings">
            <uni-icons type="gear-filled" size="20" color="#666" />
          </view>
          <text class="menu-text">设置</text>
          <view class="menu-right">
            <uni-icons type="right" size="14" color="#ccc" />
          </view>
        </view>

        <view class="menu-item menu-item--last" @tap="handleContactService">
          <view class="menu-icon menu-icon--service">
            <uni-icons type="chat-filled" size="20" color="#1890FF" />
          </view>
          <text class="menu-text">联系客服</text>
          <view class="menu-right">
            <uni-icons type="right" size="14" color="#ccc" />
          </view>
        </view>
      </view>

      <!-- 当前桌台 -->
      <view v-if="tableStore.isInitialized" class="current-table">
        <view class="current-table__info">
          <text class="current-table__label">当前桌台</text>
          <text class="current-table__value">
            {{ tableStore.storeName }} - {{ tableStore.tableNo }}桌
          </text>
        </view>
        <view class="current-table__btn" @tap="handleSwitchTable">
          <text>切换桌台</text>
        </view>
      </view>

      <!-- WiFi 信息 -->
      <view v-if="wifiInfo.name" class="wifi-card" @tap="copyWifiPassword">
        <view class="wifi-card__icon">
          <uni-icons type="wifi" size="24" color="#1890FF" />
        </view>
        <view class="wifi-card__info">
          <text class="wifi-card__name">WiFi: {{ wifiInfo.name }}</text>
          <text class="wifi-card__password">密码: {{ wifiInfo.password || '无密码' }}</text>
        </view>
        <view class="wifi-card__action">
          <text>点击复制</text>
        </view>
      </view>

      <!-- 自定义 TabBar -->
      <custom-tabbar :current="2" />
    </template>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTableStore } from '@/store/table'
import { getMemberProfile, login, getPageConfig } from '@/api'
import MemberCard from '@/components/member-card/member-card.vue'

const tableStore = useTableStore()

// 页面配置
const pageComponents = ref([])
const useCustomLayout = ref(false)

// 用户信息
const userInfo = ref({
  nickname: '',
  avatar: '',
  phone: ''
})

// 会员信息
const memberInfo = ref(null)

// 优惠券数量
const couponCount = ref(0)

// 订单数量
const orderCount = ref(0)

// WiFi 信息
const wifiInfo = computed(() => ({
  name: tableStore.store?.wifiName || '',
  password: tableStore.store?.wifiPassword || ''
}))

// 桌台信息
const tableInfo = computed(() => ({
  isInitialized: tableStore.isInitialized,
  storeName: tableStore.storeName,
  tableNo: tableStore.tableNo
}))

// 复制 WiFi 密码
const copyWifiPassword = () => {
  if (!wifiInfo.value.password) {
    uni.showToast({ title: '无密码WiFi', icon: 'none' })
    return
  }
  uni.setClipboardData({
    data: wifiInfo.value.password,
    success: () => {
      uni.showToast({ title: '密码已复制', icon: 'success' })
    }
  })
}

// 格式化手机号
const formatPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 登录
const handleLogin = () => {
  // #ifdef MP-WEIXIN
  uni.getUserProfile({
    desc: '用于完善会员资料',
    success: (res) => {
      userInfo.value = {
        nickname: res.userInfo.nickName,
        avatar: res.userInfo.avatarUrl
      }
    }
  })
  // #endif

  // #ifdef H5
  uni.showToast({
    title: '请在微信小程序中登录',
    icon: 'none'
  })
  // #endif
}

// 跳转订单列表 (TabBar 页面，通过全局状态传递筛选条件)
const goToOrders = (status) => {
  // 保存筛选状态到本地存储
  if (status) {
    uni.setStorageSync('orderFilterStatus', status)
  } else {
    uni.removeStorageSync('orderFilterStatus')
  }
  uni.switchTab({
    url: '/pages/order/list'
  })
}

// 跳转优惠券
const goToCoupons = () => {
  uni.navigateTo({
    url: '/pages/mine/coupons'
  })
}

// 跳转会员中心
const goToMember = () => {
  uni.navigateTo({
    url: '/pages/mine/member'
  })
}

// 跳转设置
const goToSettings = () => {
  uni.navigateTo({
    url: '/pages/mine/settings'
  })
}

// 呼叫服务
const goToService = () => {
  if (!tableStore.isInitialized) {
    uni.showToast({
      title: '请先扫码入座',
      icon: 'none'
    })
    return
  }

  uni.showActionSheet({
    itemList: ['催单', '加水', '呼叫服务员'],
    success: (_res) => {
      uni.showToast({
        title: '已通知服务员',
        icon: 'success'
      })
    }
  })
}

// 联系客服
const handleContactService = () => {
  // #ifdef MP-WEIXIN
  // 微信小程序使用客服按钮
  // #endif

  uni.showToast({
    title: '请拨打客服电话',
    icon: 'none'
  })
}

// 切换桌台
const handleSwitchTable = () => {
  uni.showModal({
    title: '提示',
    content: '确定要切换桌台吗？',
    success: (res) => {
      if (res.confirm) {
        tableStore.clear()
        uni.reLaunch({
          url: '/pages/index/index'
        })
      }
    }
  })
}

// 加载会员信息
const loadMemberInfo = async () => {
  try {
    const token = uni.getStorageSync('token')
    const storeId = uni.getStorageSync('storeId')

    if (!token || !storeId) {
      return
    }

    const res = await getMemberProfile(storeId)
    if (res && res.data) {
      memberInfo.value = res.data
    }
  } catch (error) {
    console.error('加载会员信息失败:', error)
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
    console.log('加载个人中心配置, storeId:', storeId)
    const res = await getPageConfig({
      storeId,
      pageType: 'PROFILE'
    })
    console.log('个人中心配置响应:', res)
    if (res.code === 200 && res.data) {
      pageComponents.value = res.data.components || []
      useCustomLayout.value = !res.data.isDefault && pageComponents.value.length > 0
      console.log('个人中心组件:', pageComponents.value)
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

// 处理导航点击
const handleNavClick = (item) => {
  if (!item.link || !item.link.type) return

  switch (item.link.type) {
    case 'page':
      if (item.link.value) {
        const tabBarPages = [
          '/pages/index/index',
          '/pages/menu/menu',
          '/pages/order/list',
          '/pages/mine/mine'
        ]
        if (tabBarPages.includes(item.link.value)) {
          uni.switchTab({ url: item.link.value })
        } else {
          uni.navigateTo({ url: item.link.value })
        }
      }
      break
    case 'coupons':
      goToCoupons()
      break
    case 'member':
      goToMember()
      break
    case 'orders':
      goToOrders('')
      break
    case 'settings':
      goToSettings()
      break
  }
}

// 监听storeId变化
watch(
  () => tableStore.storeId,
  (newStoreId) => {
    if (newStoreId) {
      console.log('storeId变化，重新加载数据:', newStoreId)
      loadPageConfig()
      loadMemberInfo()
    }
  },
  { immediate: true }
)

// 页面加载时获取会员信息
onMounted(() => {
  const storeId = uni.getStorageSync('storeId')
  if (storeId) {
    loadPageConfig()
    loadMemberInfo()
  }
})
</script>

<style lang="scss" scoped>
.page-mine {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 140rpx;
}

// 顶部背景
.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 320rpx;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8f5e 100%);
  border-radius: 0 0 40rpx 40rpx;
}

// 用户区域
.user-section {
  position: relative;
  padding: 40rpx 24rpx 0;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);

  &__avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }

  &__avatar-default {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #fff0eb 0%, #ffe4db 100%);
  }

  &__info {
    flex: 1;
    margin-left: 24rpx;
  }

  &__name {
    font-size: 34rpx;
    font-weight: 600;
    color: #1a1a1a;
  }

  &__tip {
    font-size: 24rpx;
    color: #999;
    margin-top: 8rpx;
  }
}

// 数据统计
.stats-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-top: 24rpx;
  padding: 32rpx 24rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.stats-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-value {
  font-size: 40rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.stats-label {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

.stats-divider {
  width: 1rpx;
  height: 60rpx;
  background: #eee;
}

// 通用卡片
.section-card {
  margin: 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.section-more {
  display: flex;
  align-items: center;

  text {
    font-size: 26rpx;
    color: #999;
    margin-right: 4rpx;
  }
}

// 订单网格
.order-grid {
  display: flex;
  justify-content: space-around;
}

.order-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 24rpx;

  &:active {
    opacity: 0.7;
  }
}

.order-icon {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  margin-bottom: 12rpx;

  &--pending {
    background: linear-gradient(135deg, #fff0eb 0%, #ffe4db 100%);
  }

  &--preparing {
    background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
  }

  &--completed {
    background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  }

  &--service {
    background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  }
}

.order-text {
  font-size: 24rpx;
  color: #666;
}

// 菜单项
.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &--last {
    border-bottom: none;
  }

  &:active {
    opacity: 0.7;
  }
}

.menu-icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  margin-right: 20rpx;

  &--coupon {
    background: linear-gradient(135deg, #fff0eb 0%, #ffe4db 100%);
  }

  &--vip {
    background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
  }

  &--settings {
    background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  }

  &--service {
    background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  }
}

.menu-text {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.menu-right {
  display: flex;
  align-items: center;
}

.menu-badge {
  font-size: 24rpx;
  color: #ff6b35;
  margin-right: 8rpx;
}

// 当前桌台
.current-table {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 24rpx 24rpx;
  padding: 28rpx 24rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);

  &__info {
    display: flex;
    flex-direction: column;
  }

  &__label {
    font-size: 24rpx;
    color: #999;
  }

  &__value {
    font-size: 28rpx;
    color: #333;
    font-weight: 500;
    margin-top: 8rpx;
  }

  &__btn {
    padding: 16rpx 28rpx;
    background: linear-gradient(135deg, #fff0eb 0%, #ffe4db 100%);
    border-radius: 32rpx;
    font-size: 26rpx;
    color: #ff6b35;
    font-weight: 500;
  }
}

// WiFi 信息卡片
.wifi-card {
  display: flex;
  align-items: center;
  margin: 0 24rpx 24rpx;
  padding: 28rpx 24rpx;
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  border-radius: 24rpx;

  &__icon {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
  }

  &__info {
    flex: 1;
    margin-left: 20rpx;
    display: flex;
    flex-direction: column;
  }

  &__name {
    font-size: 28rpx;
    color: #096dd9;
    font-weight: 500;
  }

  &__password {
    font-size: 24rpx;
    color: #1890ff;
    margin-top: 8rpx;
  }

  &__action {
    padding: 16rpx 24rpx;
    background: #1890ff;
    border-radius: 32rpx;

    text {
      font-size: 26rpx;
      color: #fff;
    }
  }
}
</style>
