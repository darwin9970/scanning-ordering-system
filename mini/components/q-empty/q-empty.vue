<template>
  <view class="q-empty">
    <image 
      class="q-empty__image" 
      :src="imageSrc" 
      mode="aspectFit"
    />
    <text class="q-empty__text">
      {{ text }}
    </text>
    <text v-if="tip" class="q-empty__tip">
      {{ tip }}
    </text>
    <view v-if="$slots.default" class="q-empty__action">
      <slot />
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 图片类型: cart, order, search, default
  type: {
    type: String,
    default: 'default'
  },
  // 提示文字
  text: {
    type: String,
    default: '暂无数据'
  },
  // 辅助提示文字
  tip: {
    type: String,
    default: ''
  },
  // 自定义图片
  image: {
    type: String,
    default: ''
  }
})

// 图片地址映射
const imageMap = {
  cart: '/static/images/empty-cart.png',
  order: '/static/images/empty-order.png',
  search: '/static/images/empty-search.png',
  default: '/static/images/empty-default.png'
}

const imageSrc = computed(() => {
  return props.image || imageMap[props.type] || imageMap.default
})
</script>

<style lang="scss" scoped>
.q-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
  
  &__image {
    width: 200rpx;
    height: 200rpx;
    margin-bottom: 24rpx;
  }
  
  &__text {
    font-size: $font-size-lg;
    font-weight: $font-weight-medium;
    color: $text-secondary;
    text-align: center;
    margin-bottom: 12rpx;
  }
  
  &__tip {
    font-size: $font-size-sm;
    color: $text-tertiary;
    text-align: center;
    margin-bottom: 32rpx;
  }
  
  &__action {
    margin-top: 32rpx;
  }
}
</style>
