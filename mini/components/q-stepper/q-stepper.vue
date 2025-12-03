<template>
  <view class="q-stepper">
    <view 
      class="q-stepper__btn q-stepper__btn--minus"
      :class="{ 'q-stepper__btn--disabled': modelValue <= min }"
      @tap="decrease"
    >
      <uni-icons type="minus" size="16" :color="modelValue <= min ? '#CCCCCC' : '#666666'" />
    </view>
    
    <text class="q-stepper__value">
      {{ modelValue }}
    </text>
    
    <view 
      class="q-stepper__btn q-stepper__btn--plus"
      :class="{ 'q-stepper__btn--disabled': modelValue >= max }"
      @tap="increase"
    >
      <uni-icons type="plus" size="16" color="#FFFFFF" />
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  // 当前值
  modelValue: {
    type: Number,
    default: 1
  },
  // 最小值
  min: {
    type: Number,
    default: 0
  },
  // 最大值
  max: {
    type: Number,
    default: 99
  },
  // 步长
  step: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

// 减少
const decrease = () => {
  if (props.modelValue <= props.min) return
  
  const newValue = Math.max(props.min, props.modelValue - props.step)
  emit('update:modelValue', newValue)
  emit('change', newValue)
}

// 增加
const increase = () => {
  if (props.modelValue >= props.max) return
  
  const newValue = Math.min(props.max, props.modelValue + props.step)
  emit('update:modelValue', newValue)
  emit('change', newValue)
}
</script>

<style lang="scss" scoped>
.q-stepper {
  display: inline-flex;
  align-items: center;
  height: 56rpx;
  background: $bg-grey;
  border-radius: 28rpx;
  
  &__btn {
    width: 48rpx;
    height: 48rpx;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &--minus {
      background: transparent;
      margin-left: 4rpx;
    }
    
    &--plus {
      background: $primary;
      margin-right: 4rpx;
    }
    
    &--disabled {
      opacity: 0.4;
    }
  }
  
  &__value {
    min-width: 56rpx;
    text-align: center;
    font-size: $font-size-base;
    font-weight: $font-weight-medium;
    color: $text-primary;
  }
}
</style>
