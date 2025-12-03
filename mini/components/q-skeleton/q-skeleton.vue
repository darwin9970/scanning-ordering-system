<template>
  <view v-if="loading" class="q-skeleton">
    <slot name="template">
      <!-- 默认骨架屏 -->
      <view v-for="i in rows" :key="i" class="q-skeleton__row">
        <view v-if="avatar && i === 1" class="q-skeleton__avatar" />
        <view class="q-skeleton__content">
          <view 
            v-for="j in 3" 
            :key="j" 
            class="q-skeleton__item"
            :style="{ width: getWidth(j) }"
          />
        </view>
      </view>
    </slot>
  </view>
  <slot v-else />
</template>

<script setup>
defineProps({
  // 是否加载中
  loading: {
    type: Boolean,
    default: true
  },
  // 行数
  rows: {
    type: Number,
    default: 3
  },
  // 是否显示头像
  avatar: {
    type: Boolean,
    default: false
  }
})

// 获取随机宽度
const getWidth = (index) => {
  const widths = ['100%', '80%', '60%']
  return widths[(index - 1) % 3]
}
</script>

<style lang="scss" scoped>
.q-skeleton {
  &__row {
    display: flex;
    padding: $spacing-lg;
    background: $bg-card;
    margin-bottom: $spacing-md;
    border-radius: $radius-lg;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  &__avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    background: $border-lighter;
    margin-right: $spacing-base;
    flex-shrink: 0;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }
  
  &__content {
    flex: 1;
  }
  
  &__item {
    height: 32rpx;
    background: $border-lighter;
    border-radius: $radius-xs;
    margin-bottom: $spacing-sm;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    &:nth-child(2) {
      animation-delay: 0.1s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.2s;
    }
  }
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
