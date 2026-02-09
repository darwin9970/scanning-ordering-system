<template>
  <view class="q-price" :class="[`q-price--${size}`, { 'q-price--original': original }]">
    <text class="q-price__symbol">¥</text>
    <text class="q-price__integer">
      {{ integer }}
    </text>
    <text v-if="decimal !== '00'" class="q-price__decimal">.{{ decimal }}</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 价格值
  value: {
    type: [Number, String],
    default: 0
  },
  // 尺寸: small, medium, large
  size: {
    type: String,
    default: 'medium'
  },
  // 是否为原价 (划线样式)
  original: {
    type: Boolean,
    default: false
  }
})

// 整数部分
const integer = computed(() => {
  const num = Number(props.value)
  return Math.floor(num)
})

// 小数部分
const decimal = computed(() => {
  const num = Number(props.value)
  const dec = (num % 1).toFixed(2).slice(2)
  return dec
})
</script>

<style lang="scss" scoped>
.q-price {
  display: inline-flex;
  align-items: baseline;
  color: $primary;
  font-weight: $font-weight-semibold;

  &__symbol {
    font-size: 24rpx;
    margin-right: 2rpx;
  }

  &__integer {
    font-size: 40rpx;
    line-height: 1;
  }

  &__decimal {
    font-size: 28rpx;
  }

  // 小号
  &--small {
    .q-price__symbol {
      font-size: 20rpx;
    }
    .q-price__integer {
      font-size: 32rpx;
    }
    .q-price__decimal {
      font-size: 24rpx;
    }
  }

  // 大号
  &--large {
    .q-price__symbol {
      font-size: 28rpx;
    }
    .q-price__integer {
      font-size: 48rpx;
    }
    .q-price__decimal {
      font-size: 32rpx;
    }
  }

  // 原价划线
  &--original {
    color: $text-tertiary;
    font-weight: $font-weight-regular;
    text-decoration: line-through;

    .q-price__symbol {
      font-size: 20rpx;
    }
    .q-price__integer {
      font-size: 24rpx;
    }
    .q-price__decimal {
      font-size: 20rpx;
    }
  }
}
</style>
