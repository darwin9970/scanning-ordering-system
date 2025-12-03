<template>
  <view class="q-tag" :class="[`q-tag--${type}`, { 'q-tag--outline': outline }]">
    <slot />
  </view>
</template>

<script setup>
defineProps({
  // 类型: primary, success, warning, error, info
  type: {
    type: String,
    default: 'primary'
  },
  // 是否边框样式
  outline: {
    type: Boolean,
    default: false
  }
})
</script>

<style lang="scss" scoped>
.q-tag {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 12rpx;
  font-size: $font-size-xs;
  border-radius: $radius-xs;
  
  &--primary {
    background: $primary-light;
    color: $primary;
  }
  
  &--success {
    background: $success-light;
    color: $success;
  }
  
  &--warning {
    background: $warning-light;
    color: $warning;
  }
  
  &--error {
    background: $error-light;
    color: $error;
  }
  
  &--info {
    background: $info-light;
    color: $info;
  }
  
  &--outline {
    background: transparent;
    border: 1rpx solid currentColor;
  }
}
</style>
