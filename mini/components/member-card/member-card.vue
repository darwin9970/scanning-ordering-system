<template>
  <view class="member-card" @tap="handleClick">
    <view class="member-card__bg">
      <view class="member-card__content">
        <view class="member-card__header">
          <view class="member-level-badge">
            <uni-icons type="vip-filled" size="16" color="#FFFFFF" />
            <text class="level-text">VIP{{ level }}</text>
          </view>
          <text class="member-title">会员中心</text>
        </view>

        <view class="member-card__stats">
          <view class="stat-item" @tap.stop="handlePointsClick">
            <text class="stat-value">
              {{ points }}
            </text>
            <text class="stat-label">积分</text>
          </view>
          <view class="stat-divider" />
          <view class="stat-item" @tap.stop="handleCouponClick">
            <text class="stat-value">
              {{ couponCount }}
            </text>
            <text class="stat-label">优惠券</text>
          </view>
        </view>

        <view class="member-card__action">
          <text class="action-text">查看权益 ></text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  level: {
    type: Number,
    default: 1
  },
  points: {
    type: Number,
    default: 0
  },
  couponCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['click', 'points-click', 'coupon-click'])

const handleClick = () => {
  emit('click')
}

const handlePointsClick = () => {
  emit('points-click')
}

const handleCouponClick = () => {
  emit('coupon-click')
}
</script>

<style lang="scss" scoped>
.member-card {
  margin: 24rpx;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow-base;

  &__bg {
    background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
    padding: 32rpx;
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
      pointer-events: none;
    }
  }

  &__content {
    color: #ffffff;
    position: relative;
    z-index: 1;
  }

  &__header {
    display: flex;
    align-items: center;
    margin-bottom: 32rpx;
  }

  .member-level-badge {
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(10rpx);
    padding: 8rpx 16rpx;
    border-radius: $radius-base;
    margin-right: 16rpx;
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  .level-text {
    font-size: $font-size-sm;
    font-weight: $font-weight-bold;
    color: #ffffff;
  }

  .member-title {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: #ffffff;
  }

  &__stats {
    display: flex;
    align-items: center;
    margin-bottom: 24rpx;
  }

  .stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-value {
    font-size: 48rpx;
    font-weight: $font-weight-bold;
    color: #ffffff;
    margin-bottom: 8rpx;
    line-height: 1.2;
  }

  .stat-label {
    font-size: $font-size-sm;
    color: rgba(255, 255, 255, 0.9);
  }

  .stat-divider {
    width: 1rpx;
    height: 60rpx;
    background: rgba(255, 255, 255, 0.3);
    margin: 0 24rpx;
  }

  &__action {
    text-align: right;
    padding-top: 16rpx;
    border-top: 1rpx solid rgba(255, 255, 255, 0.2);
  }

  .action-text {
    font-size: $font-size-sm;
    color: rgba(255, 255, 255, 0.9);
  }
}
</style>
