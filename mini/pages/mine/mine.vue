<template>
  <view class="page-mine">
    <!-- 用户信息 -->
    <view class="user-card">
      <view class="user-card__avatar" @tap="handleLogin">
        <image
          v-if="userInfo.avatar"
          class="user-card__avatar-img"
          :src="userInfo.avatar"
          mode="aspectFill"
        />
        <view v-else class="user-card__avatar-default">
          <uni-icons type="person" size="40" color="#CCCCCC" />
        </view>
      </view>
      <view class="user-card__info">
        <text class="user-card__name">
          {{ userInfo.nickname || '点击登录' }}
        </text>
        <view v-if="userInfo.phone" class="user-card__phone">
          {{ formatPhone(userInfo.phone) }}
        </view>
      </view>
      <view v-if="memberInfo" class="user-card__member">
        <q-tag type="warning">
          {{ memberInfo.levelName || '普通会员' }}
        </q-tag>
      </view>
    </view>

    <!-- 会员卡片 -->
    <view class="member-card" @tap="goToMember">
      <view class="member-card__left">
        <view class="member-card__points">
          <text class="member-card__points-value">
            {{ memberInfo?.points || 0 }}
          </text>
          <text class="member-card__points-label">
            积分
          </text>
        </view>
        <view class="member-card__divider" />
        <view class="member-card__coupons">
          <text class="member-card__coupons-value">
            {{ couponCount }}
          </text>
          <text class="member-card__coupons-label">
            优惠券
          </text>
        </view>
      </view>
      <view class="member-card__right">
        <text>会员中心</text>
        <uni-icons type="right" size="14" color="#FFFFFF" />
      </view>
    </view>

    <!-- 订单入口 -->
    <view class="order-entry">
      <view class="order-entry__title">
        <text>我的订单</text>
        <view class="order-entry__all" @tap="goToOrders('')">
          <text>全部订单</text>
          <uni-icons type="right" size="14" color="#999999" />
        </view>
      </view>
      <view class="order-entry__grid">
        <view
          class="order-entry__item"
          @tap="goToOrders('PENDING')"
        >
          <view class="order-entry__icon">
            <uni-icons type="wallet" size="28" color="#FF6B35" />
          </view>
          <text>待确认</text>
        </view>
        <view
          class="order-entry__item"
          @tap="goToOrders('PREPARING')"
        >
          <view class="order-entry__icon">
            <uni-icons type="fire" size="28" color="#FAAD14" />
          </view>
          <text>制作中</text>
        </view>
        <view
          class="order-entry__item"
          @tap="goToOrders('COMPLETED')"
        >
          <view class="order-entry__icon">
            <uni-icons type="checkbox" size="28" color="#52C41A" />
          </view>
          <text>已完成</text>
        </view>
        <view class="order-entry__item" @tap="goToService">
          <view class="order-entry__icon">
            <uni-icons type="headphones" size="28" color="#1890FF" />
          </view>
          <text>呼叫服务</text>
        </view>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="menu-list">
      <view class="menu-item" @tap="goToCoupons">
        <view class="menu-item__left">
          <uni-icons type="gift" size="22" color="#FF6B35" />
          <text>我的优惠券</text>
        </view>
        <view class="menu-item__right">
          <text v-if="couponCount" class="menu-item__badge">
            {{ couponCount }}张可用
          </text>
          <uni-icons type="right" size="14" color="#CCCCCC" />
        </view>
      </view>

      <view class="menu-item" @tap="goToMember">
        <view class="menu-item__left">
          <uni-icons type="vip" size="22" color="#FAAD14" />
          <text>会员中心</text>
        </view>
        <view class="menu-item__right">
          <uni-icons type="right" size="14" color="#CCCCCC" />
        </view>
      </view>

      <view class="menu-item" @tap="goToSettings">
        <view class="menu-item__left">
          <uni-icons type="gear" size="22" color="#666666" />
          <text>设置</text>
        </view>
        <view class="menu-item__right">
          <uni-icons type="right" size="14" color="#CCCCCC" />
        </view>
      </view>

      <view class="menu-item" @tap="handleContactService">
        <view class="menu-item__left">
          <uni-icons type="chatbubble" size="22" color="#1890FF" />
          <text>联系客服</text>
        </view>
        <view class="menu-item__right">
          <uni-icons type="right" size="14" color="#CCCCCC" />
        </view>
      </view>
    </view>

    <!-- 当前桌台 -->
    <view v-if="tableStore.isInitialized" class="current-table">
      <view class="current-table__info">
        <text class="current-table__label">
          当前桌台
        </text>
        <text class="current-table__value">
          {{ tableStore.storeName }} - {{ tableStore.tableNo }}桌
        </text>
      </view>
      <view class="current-table__btn" @tap="handleSwitchTable">
        <text>切换桌台</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useTableStore } from '@/store/table'

const tableStore = useTableStore()

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
</script>

<style lang="scss" scoped>
.page-mine {
  min-height: 100vh;
  background: $bg-page;
  padding-bottom: 40rpx;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 40rpx 32rpx;
  background: linear-gradient(135deg, $primary, $primary-dark);

  &__avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    overflow: hidden;
    background: #FFFFFF;
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
    background: $bg-grey;
  }

  &__info {
    flex: 1;
    margin-left: 24rpx;
  }

  &__name {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: #FFFFFF;
  }

  &__phone {
    font-size: $font-size-sm;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 8rpx;
  }

  &__member {
    margin-left: auto;
  }
}

.member-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -40rpx 24rpx 24rpx;
  padding: 32rpx;
  background: linear-gradient(135deg, #2D2D2D, #1A1A1A);
  border-radius: $radius-lg;
  box-shadow: $shadow-md;

  &__left {
    display: flex;
    align-items: center;
  }

  &__points,
  &__coupons {
    text-align: center;
  }

  &__points-value,
  &__coupons-value {
    font-size: $font-size-xxl;
    font-weight: $font-weight-bold;
    color: #FFFFFF;
  }

  &__points-label,
  &__coupons-label {
    font-size: $font-size-xs;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 4rpx;
  }

  &__divider {
    width: 1rpx;
    height: 60rpx;
    background: rgba(255, 255, 255, 0.2);
    margin: 0 48rpx;
  }

  &__right {
    display: flex;
    align-items: center;
    color: #FFFFFF;
    font-size: $font-size-sm;

    text {
      margin-right: 8rpx;
    }
  }
}

.order-entry {
  margin: 0 24rpx 24rpx;
  padding: 24rpx;
  background: $bg-card;
  border-radius: $radius-lg;

  &__title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;

    text {
      font-size: $font-size-md;
      font-weight: $font-weight-medium;
      color: $text-primary;
    }
  }

  &__all {
    display: flex;
    align-items: center;
    font-size: $font-size-sm;
    color: $text-tertiary;

    text {
      font-size: $font-size-sm;
      font-weight: $font-weight-regular;
    }
  }

  &__grid {
    display: flex;
    justify-content: space-around;
  }

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16rpx;

    text {
      font-size: $font-size-sm;
      color: $text-secondary;
      margin-top: 12rpx;
    }
  }

  &__icon {
    width: 80rpx;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: $bg-grey;
    border-radius: 50%;
  }
}

.menu-list {
  margin: 0 24rpx 24rpx;
  background: $bg-card;
  border-radius: $radius-lg;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 24rpx;

  &:not(:last-child) {
    border-bottom: 1rpx solid $border-lighter;
  }

  &__left {
    display: flex;
    align-items: center;

    text {
      margin-left: 16rpx;
      font-size: $font-size-base;
      color: $text-primary;
    }
  }

  &__right {
    display: flex;
    align-items: center;
  }

  &__badge {
    font-size: $font-size-sm;
    color: $primary;
    margin-right: 8rpx;
  }
}

.current-table {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 24rpx;
  padding: 24rpx;
  background: $bg-card;
  border-radius: $radius-lg;

  &__info {
    display: flex;
    flex-direction: column;
  }

  &__label {
    font-size: $font-size-sm;
    color: $text-tertiary;
  }

  &__value {
    font-size: $font-size-base;
    color: $text-primary;
    margin-top: 8rpx;
  }

  &__btn {
    padding: 12rpx 24rpx;
    background: $primary-light;
    border-radius: $radius-base;
    font-size: $font-size-sm;
    color: $primary;
  }
}
</style>
