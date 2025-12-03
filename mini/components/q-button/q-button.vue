<template>
  <button 
    class="q-btn"
    :class="[
      `q-btn--${type}`,
      `q-btn--${size}`,
      { 'q-btn--disabled': disabled || loading },
      { 'q-btn--block': block }
    ]"
    :disabled="disabled || loading"
    :loading="loading"
    @tap="handleClick"
  >
    <uni-icons
      v-if="loading"
      type="spinner-cycle"
      size="18"
      color="currentColor"
      class="q-btn__loading"
    />
    <uni-icons
      v-else-if="icon"
      :type="icon"
      size="18"
      color="currentColor"
      class="q-btn__icon"
    />
    <text class="q-btn__text">
      <slot />
    </text>
  </button>
</template>

<script setup>
const props = defineProps({
  // 按钮类型: primary, secondary, ghost, text
  type: {
    type: String,
    default: 'primary'
  },
  // 尺寸: large, medium, small, mini
  size: {
    type: String,
    default: 'medium'
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },
  // 是否加载中
  loading: {
    type: Boolean,
    default: false
  },
  // 是否块级按钮
  block: {
    type: Boolean,
    default: false
  },
  // 图标
  icon: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['click'])

const handleClick = () => {
  if (props.disabled || props.loading) return
  emit('click')
}
</script>

<style lang="scss" scoped>
.q-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  font-weight: $font-weight-medium;
  transition: all $duration-fast $ease-out;
  box-sizing: border-box;
  
  &::after {
    display: none;
  }
  
  // 类型
  &--primary {
    background: $primary;
    color: #FFFFFF;
    &:active {
      background: $primary-dark;
    }
  }
  
  &--secondary {
    background: $primary-light;
    color: $primary;
  }
  
  &--ghost {
    background: transparent;
    border: 2rpx solid $primary;
    color: $primary;
  }
  
  &--text {
    background: transparent;
    color: $primary;
    padding: 0 !important;
  }
  
  // 尺寸
  &--large {
    height: 96rpx;
    padding: 0 48rpx;
    font-size: 32rpx;
    border-radius: 48rpx;
  }
  
  &--medium {
    height: 80rpx;
    padding: 0 40rpx;
    font-size: 28rpx;
    border-radius: 40rpx;
  }
  
  &--small {
    height: 64rpx;
    padding: 0 32rpx;
    font-size: 26rpx;
    border-radius: 32rpx;
  }
  
  &--mini {
    height: 52rpx;
    padding: 0 24rpx;
    font-size: 24rpx;
    border-radius: 26rpx;
  }
  
  // 块级
  &--block {
    display: flex;
    width: 100%;
  }
  
  // 禁用
  &--disabled {
    opacity: 0.5;
    pointer-events: none;
  }
  
  // 图标
  &__icon {
    margin-right: 8rpx;
  }
  
  &__loading {
    margin-right: 8rpx;
    animation: spin 1s linear infinite;
  }
  
  &__text {
    display: flex;
    align-items: center;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
