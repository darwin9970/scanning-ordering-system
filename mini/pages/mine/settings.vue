<template>
  <view class="page-settings">
    <!-- 设置列表 -->
    <view class="settings-group">
      <view class="settings-item" @tap="goToProfile">
        <text class="settings-item__label">
          个人信息
        </text>
        <view class="settings-item__right">
          <uni-icons type="right" size="14" color="#CCCCCC" />
        </view>
      </view>

      <view class="settings-item" @tap="toggleNotification">
        <text class="settings-item__label">
          消息通知
        </text>
        <view class="settings-item__right">
          <switch
            :checked="settings.notification"
            color="#FF6B35"
            @change="onNotificationChange"
          />
        </view>
      </view>
    </view>

    <view class="settings-group">
      <view class="settings-item" @tap="showAbout">
        <text class="settings-item__label">
          关于我们
        </text>
        <view class="settings-item__right">
          <uni-icons type="right" size="14" color="#CCCCCC" />
        </view>
      </view>

      <view class="settings-item" @tap="showPrivacy">
        <text class="settings-item__label">
          隐私政策
        </text>
        <view class="settings-item__right">
          <uni-icons type="right" size="14" color="#CCCCCC" />
        </view>
      </view>

      <view class="settings-item" @tap="showUserAgreement">
        <text class="settings-item__label">
          用户协议
        </text>
        <view class="settings-item__right">
          <uni-icons type="right" size="14" color="#CCCCCC" />
        </view>
      </view>

      <view class="settings-item">
        <text class="settings-item__label">
          当前版本
        </text>
        <view class="settings-item__right">
          <text class="settings-item__value">
            v1.0.0
          </text>
        </view>
      </view>
    </view>

    <view class="settings-group">
      <view class="settings-item" @tap="clearCache">
        <text class="settings-item__label">
          清除缓存
        </text>
        <view class="settings-item__right">
          <text class="settings-item__value">
            {{ cacheSize }}
          </text>
          <uni-icons type="right" size="14" color="#CCCCCC" />
        </view>
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <view class="logout-section">
      <q-button type="ghost" block @click="handleLogout">
        退出登录
      </q-button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useTableStore } from '@/store/table'
import { useCartStore } from '@/store/cart'

const tableStore = useTableStore()
const cartStore = useCartStore()

// 设置项
const settings = reactive({
  notification: true
})

// 缓存大小
const cacheSize = ref('2.5MB')

// 切换通知
const onNotificationChange = (e) => {
  settings.notification = e.detail.value
  uni.showToast({
    title: settings.notification ? '已开启通知' : '已关闭通知',
    icon: 'none'
  })
}

// 个人信息
const goToProfile = () => {
  uni.showToast({
    title: '功能开发中',
    icon: 'none'
  })
}

// 关于我们
const showAbout = () => {
  uni.showModal({
    title: '关于我们',
    content: '扫码点餐小程序\n让点餐更简单\n\n联系电话: 400-888-8888',
    showCancel: false
  })
}

// 隐私政策
const showPrivacy = () => {
  uni.showToast({
    title: '功能开发中',
    icon: 'none'
  })
}

// 用户协议
const showUserAgreement = () => {
  uni.showToast({
    title: '功能开发中',
    icon: 'none'
  })
}

// 清除缓存
const clearCache = () => {
  uni.showModal({
    title: '提示',
    content: '确定要清除缓存吗？',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorageSync()
        cacheSize.value = '0KB'
        uni.showToast({
          title: '缓存已清除',
          icon: 'success'
        })
      }
    }
  })
}

// 退出登录
const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        // 清除状态
        tableStore.clear()
        cartStore.clear()

        // 清除本地存储
        uni.clearStorageSync()

        uni.showToast({
          title: '已退出',
          icon: 'success'
        })

        // 跳转首页
        setTimeout(() => {
          uni.reLaunch({
            url: '/pages/index/index'
          })
        }, 1500)
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.page-settings {
  min-height: 100vh;
  background: $bg-page;
  padding: 24rpx;
}

.settings-group {
  background: $bg-card;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
  overflow: hidden;
}

.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 24rpx;

  &:not(:last-child) {
    border-bottom: 1rpx solid $border-lighter;
  }

  &__label {
    font-size: $font-size-base;
    color: $text-primary;
  }

  &__right {
    display: flex;
    align-items: center;
  }

  &__value {
    font-size: $font-size-base;
    color: $text-tertiary;
    margin-right: 8rpx;
  }
}

.logout-section {
  margin-top: 48rpx;
  padding: 0 24rpx;
}
</style>
