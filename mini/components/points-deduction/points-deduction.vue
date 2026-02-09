<template>
  <view class="points-deduction">
    <view class="points-deduction__header" @tap="handleToggle">
      <view class="points-info">
        <view class="points-info__icon">
          <uni-icons type="award-filled" size="20" color="#FF6B35" />
        </view>
        <view class="points-info__content">
          <text class="points-label">可用积分</text>
          <text class="points-value">
            {{ availablePoints }}
          </text>
        </view>
      </view>
      <switch
        :checked="enabled"
        color="#FF6B35"
        :disabled="availablePoints < minRedeemPoints"
        @change="handleSwitchChange"
      />
    </view>

    <view v-if="enabled && availablePoints >= minRedeemPoints" class="points-deduction__content">
      <view class="points-rules">
        <uni-icons type="info" size="14" color="#999" />
        <text class="rules-text">
          {{ pointsToYuan }}积分 = ¥1，最多可抵扣订单金额的{{ maxRedeemPercent * 100 }}%
        </text>
      </view>

      <view class="points-result">
        <text class="result-label">可抵扣</text>
        <q-price :value="discountAmount" size="large" color="primary" />
      </view>

      <view class="points-final">
        <text class="final-label">实付金额</text>
        <q-price :value="finalAmount" size="xxl" color="error" />
      </view>
    </view>

    <view v-else-if="availablePoints < minRedeemPoints" class="points-deduction__tip">
      <text class="tip-text">积分不足，至少需要 {{ minRedeemPoints }} 积分才能使用</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 可用积分
  availablePoints: {
    type: Number,
    default: 0
  },
  // 订单金额
  orderAmount: {
    type: Number,
    default: 0
  },
  // 是否启用
  enabled: {
    type: Boolean,
    default: false
  },
  // 积分规则
  pointsToYuan: {
    type: Number,
    default: 100
  },
  // 最大抵扣比例
  maxRedeemPercent: {
    type: Number,
    default: 0.5
  },
  // 最低使用积分
  minRedeemPoints: {
    type: Number,
    default: 100
  }
})

const emit = defineEmits(['update:enabled', 'change'])

// 计算可抵扣金额
const discountAmount = computed(() => {
  if (!props.enabled || props.availablePoints < props.minRedeemPoints) {
    return 0
  }

  // 最大抵扣金额（订单金额的50%）
  const maxDiscountAmount = props.orderAmount * props.maxRedeemPercent

  // 可用积分对应的金额
  const pointsDiscount = props.availablePoints / props.pointsToYuan

  // 取较小值
  return Math.min(maxDiscountAmount, pointsDiscount)
})

// 最终金额
const finalAmount = computed(() => {
  return Math.max(0, props.orderAmount - discountAmount.value)
})

// 切换开关
const handleSwitchChange = (e) => {
  const checked = e.detail.value
  emit('update:enabled', checked)
  emit('change', checked)
}

// 点击头部切换
const handleToggle = () => {
  if (props.availablePoints >= props.minRedeemPoints) {
    emit('update:enabled', !props.enabled)
    emit('change', !props.enabled)
  }
}
</script>

<style lang="scss" scoped>
.points-deduction {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: 24rpx;
  margin-bottom: 20rpx;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;
  }

  .points-info {
    display: flex;
    align-items: center;
    flex: 1;

    &__icon {
      margin-right: 16rpx;
    }

    &__content {
      display: flex;
      flex-direction: column;
    }
  }

  .points-label {
    font-size: $font-size-sm;
    color: $text-secondary;
    margin-bottom: 4rpx;
  }

  .points-value {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: $primary;
  }

  &__content {
    padding-top: 20rpx;
    border-top: 1rpx solid $border-lighter;
  }

  .points-rules {
    display: flex;
    align-items: center;
    padding: 16rpx;
    background: $bg-grey;
    border-radius: $radius-base;
    margin-bottom: 20rpx;

    .rules-text {
      margin-left: 8rpx;
      font-size: $font-size-sm;
      color: $text-tertiary;
      line-height: 1.5;
    }
  }

  .points-result {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16rpx 0;
    margin-bottom: 16rpx;

    .result-label {
      font-size: $font-size-base;
      color: $text-secondary;
    }
  }

  .points-final {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 16rpx;
    border-top: 1rpx solid $border-lighter;

    .final-label {
      font-size: $font-size-lg;
      font-weight: $font-weight-medium;
      color: $text-primary;
    }
  }

  &__tip {
    padding-top: 16rpx;
    border-top: 1rpx solid $border-lighter;

    .tip-text {
      font-size: $font-size-sm;
      color: $text-tertiary;
      text-align: center;
    }
  }
}
</style>
