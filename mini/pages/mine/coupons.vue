<template>
  <view class="page-coupons">
    <!-- 标签页 -->
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tabs__item"
        :class="{ 'tabs__item--active': activeTab === tab.value }"
        @tap="activeTab = tab.value"
      >
        {{ tab.label }}
      </view>
    </view>

    <!-- 优惠券列表 -->
    <view class="coupon-list">
      <q-skeleton :loading="loading" :rows="3">
        <q-empty v-if="filteredCoupons.length === 0" text="暂无优惠券" />

        <view
          v-for="coupon in filteredCoupons"
          :key="coupon.id"
          class="coupon-card"
          :class="{ 'coupon-card--disabled': coupon.status !== 'AVAILABLE' }"
        >
          <view class="coupon-card__left">
            <view class="coupon-card__value">
              <text v-if="coupon.type === 'AMOUNT'" class="coupon-card__symbol">¥</text>
              <text class="coupon-card__amount">
                {{ coupon.type === 'AMOUNT' ? coupon.value : coupon.value * 10 }}
              </text>
              <text v-if="coupon.type === 'DISCOUNT'" class="coupon-card__unit">折</text>
            </view>
            <text class="coupon-card__condition">
              {{ getConditionText(coupon) }}
            </text>
          </view>

          <view class="coupon-card__divider" />

          <view class="coupon-card__right">
            <text class="coupon-card__name">
              {{ coupon.name }}
            </text>
            <text class="coupon-card__expire">
              {{ formatExpire(coupon.expireAt) }}
            </text>
            <view
              v-if="coupon.status === 'AVAILABLE'"
              class="coupon-card__btn"
              @tap="useCoupon(coupon)"
            >
              立即使用
            </view>
            <view v-else class="coupon-card__status">
              {{ getStatusText(coupon.status) }}
            </view>
          </view>
        </view>
      </q-skeleton>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const tabs = [
  { label: '可使用', value: 'AVAILABLE' },
  { label: '已使用', value: 'USED' },
  { label: '已过期', value: 'EXPIRED' }
]

const activeTab = ref('AVAILABLE')
const loading = ref(false)

// 模拟优惠券数据
const coupons = ref([
  {
    id: 1,
    name: '新用户专享券',
    type: 'AMOUNT',
    value: 10,
    minAmount: 50,
    expireAt: '2024-12-31',
    status: 'AVAILABLE'
  },
  {
    id: 2,
    name: '满减优惠券',
    type: 'AMOUNT',
    value: 20,
    minAmount: 100,
    expireAt: '2024-12-31',
    status: 'AVAILABLE'
  },
  {
    id: 3,
    name: '会员专享折扣',
    type: 'DISCOUNT',
    value: 0.9,
    minAmount: 0,
    expireAt: '2024-11-30',
    status: 'EXPIRED'
  }
])

// 筛选后的优惠券
const filteredCoupons = computed(() => {
  return coupons.value.filter((c) => c.status === activeTab.value)
})

// 获取使用条件文字
const getConditionText = (coupon) => {
  if (coupon.minAmount > 0) {
    return `满${coupon.minAmount}元可用`
  }
  return '无门槛'
}

// 格式化过期时间
const formatExpire = (date) => {
  return `有效期至 ${date}`
}

// 获取状态文字
const getStatusText = (status) => {
  const map = {
    USED: '已使用',
    EXPIRED: '已过期'
  }
  return map[status] || ''
}

// 使用优惠券
const useCoupon = (_coupon) => {
  uni.navigateTo({
    url: '/pages/menu/menu'
  })
}
</script>

<style lang="scss" scoped>
.page-coupons {
  min-height: 100vh;
  background: $bg-page;
}

.tabs {
  display: flex;
  background: $bg-card;
  padding: 0 24rpx;

  &__item {
    flex: 1;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-base;
    color: $text-secondary;
    position: relative;

    &--active {
      color: $primary;
      font-weight: $font-weight-medium;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 48rpx;
        height: 4rpx;
        background: $primary;
        border-radius: 2rpx;
      }
    }
  }
}

.coupon-list {
  padding: 24rpx;
}

.coupon-card {
  display: flex;
  align-items: stretch;
  background: $bg-card;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
  overflow: hidden;

  &--disabled {
    opacity: 0.6;

    .coupon-card__left {
      background: #cccccc;
    }
  }

  &__left {
    width: 200rpx;
    padding: 32rpx 24rpx;
    background: linear-gradient(135deg, $primary, $primary-dark);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__value {
    display: flex;
    align-items: baseline;
    color: #ffffff;
  }

  &__symbol {
    font-size: $font-size-md;
  }

  &__amount {
    font-size: 56rpx;
    font-weight: $font-weight-bold;
    line-height: 1;
  }

  &__unit {
    font-size: $font-size-md;
    margin-left: 4rpx;
  }

  &__condition {
    font-size: $font-size-xs;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 8rpx;
  }

  &__divider {
    width: 0;
    border-left: 2rpx dashed $border-light;
  }

  &__right {
    flex: 1;
    padding: 24rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  &__name {
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    color: $text-primary;
  }

  &__expire {
    font-size: $font-size-xs;
    color: $text-tertiary;
    margin-top: 8rpx;
  }

  &__btn {
    align-self: flex-end;
    padding: 12rpx 24rpx;
    background: $primary;
    color: #ffffff;
    font-size: $font-size-sm;
    border-radius: $radius-base;
    margin-top: 16rpx;
  }

  &__status {
    align-self: flex-end;
    font-size: $font-size-sm;
    color: $text-tertiary;
    margin-top: 16rpx;
  }
}
</style>
