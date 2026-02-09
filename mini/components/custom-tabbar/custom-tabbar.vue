<template>
  <view class="custom-tabbar" :style="{ paddingBottom: safeAreaBottom + 'px' }">
    <view
      v-for="(item, index) in tabList"
      :key="index"
      class="tabbar-item"
      :class="{ active: current === index }"
      @click="switchTab(index)"
    >
      <view class="tabbar-icon" :class="{ 'tabbar-icon--active': current === index }">
        <uni-icons
          :type="current === index ? item.selectedIcon : item.icon"
          :size="22"
          :color="current === index ? '#FF6B35' : '#999999'"
        />
      </view>
      <text class="tabbar-text">
        {{ item.text }}
      </text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'CustomTabbar',
  props: {
    current: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      safeAreaBottom: 0,
      tabList: [
        {
          pagePath: '/pages/menu/menu',
          text: '点餐',
          icon: 'shop',
          selectedIcon: 'shop-filled'
        },
        {
          pagePath: '/pages/order/list',
          text: '订单',
          icon: 'list',
          selectedIcon: 'list'
        },
        {
          pagePath: '/pages/mine/mine',
          text: '我的',
          icon: 'person',
          selectedIcon: 'person-filled'
        }
      ]
    }
  },
  created() {
    this.getSafeArea()
  },
  methods: {
    getSafeArea() {
      uni.getSystemInfo({
        success: (res) => {
          this.safeAreaBottom = res.safeAreaInsets?.bottom || 0
        }
      })
    },
    switchTab(index) {
      if (this.current === index) return
      const item = this.tabList[index]
      uni.switchTab({
        url: item.pagePath
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.custom-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-around;
  box-shadow: 0 -1px 12px rgba(0, 0, 0, 0.08);
  z-index: 999;
  border-top: 1rpx solid #f0f0f0;
}

.tabbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 16rpx 0 12rpx;
  transition: all 0.2s ease;

  &:active {
    opacity: 0.7;
  }
}

.tabbar-icon {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  transition: all 0.25s ease;

  &--active {
    background: rgba(255, 107, 53, 0.1);
    transform: scale(1.05);
  }
}

.tabbar-text {
  font-size: 20rpx;
  color: #999999;
  margin-top: 6rpx;
  font-weight: 400;
  transition: all 0.2s ease;

  .active & {
    color: #ff6b35;
    font-weight: 500;
  }
}
</style>
