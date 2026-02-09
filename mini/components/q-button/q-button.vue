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
    <uni-icons v-else-if="icon" :type="icon" size="18" color="currentColor" class="q-btn__icon" />
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

  // 触觉反馈
  // #ifdef MP-WEIXIN
  uni.vibrateShort({
    type: 'light'
  })
  // #endif

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
  position: relative;
  overflow: hidden;

  &::after {
    display: none;
  }

  // 点击动画
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition:
      width 0.3s,
      height 0.3s;
  }

  &:active::before {
    width: 300rpx;
    height: 300rpx;
  }

  // 类型
  &--primary {
    background: $primary;
    color: #ffffff;
    &:active {
      background: $primary-dark;
      transform: scale(0.98);
    }
  }

  &--secondary {
    background: $primary-light;
    color: $primary;
    &:active {
      background: darken($primary-light, 5%);
      transform: scale(0.98);
    }
  }

  &--ghost {
    background: transparent;
    border: 2rpx solid $primary;
    color: $primary;
    &:active {
      background: $primary-light;
      transform: scale(0.98);
    }
  }

  &--text {
    background: transparent;
    color: $primary;
    padding: 0 !important;
    &:active {
      opacity: 0.7;
    }
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
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
