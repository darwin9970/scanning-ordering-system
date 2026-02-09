<template>
  <view class="page-confirm">
    <!-- 点餐提示 -->
    <view v-if="orderTip" class="order-tip">
      <uni-icons type="info-filled" size="16" color="#1890ff" />
      <text class="order-tip__text">
        {{ orderTip }}
      </text>
    </view>

    <!-- 桌台信息 -->
    <view class="table-info">
      <uni-icons type="location" size="20" color="#FF6B35" />
      <view class="table-info__content">
        <text class="table-info__name">
          {{ tableStore.storeName }}
        </text>
        <text class="table-info__table">{{ tableStore.tableNo }}桌</text>
      </view>
    </view>

    <!-- 起订金额提示 -->
    <view v-if="belowMinOrder" class="min-order-tip">
      <uni-icons type="info-filled" size="16" color="#ff4d4f" />
      <text class="min-order-tip__text">还差 ¥{{ minOrderGap }} 起送</text>
    </view>

    <!-- 商品列表 -->
    <view class="order-items">
      <view class="order-items__header">
        <text class="order-items__title">商品清单</text>
        <text class="order-items__count">共{{ cartStore.totalCount }}件</text>
      </view>

      <view v-for="item in cartStore.items" :key="item.itemKey" class="order-item">
        <image
          class="order-item__image"
          :src="item.productImage || '/static/images/default-food.png'"
          mode="aspectFill"
        />
        <view class="order-item__content">
          <text class="order-item__name">
            {{ item.productName }}
          </text>
          <text v-if="item.skuName" class="order-item__sku">
            {{ item.skuName }}
          </text>
        </view>
        <view class="order-item__right">
          <q-price :value="item.price" size="small" />
          <text class="order-item__quantity">x{{ item.quantity }}</text>
        </view>
      </view>
    </view>

    <!-- 用餐人数 -->
    <view class="people-count">
      <text class="people-count__label">用餐人数</text>
      <q-stepper v-model="peopleCount" :min="1" :max="20" />
    </view>

    <!-- 备注 -->
    <view class="order-remark">
      <text class="order-remark__label">订单备注</text>
      <textarea
        v-model="orderRemark"
        class="order-remark__input"
        placeholder="如有特殊需求请备注"
        maxlength="100"
      />
    </view>

    <!-- 优惠券选择 -->
    <view class="coupon-section" @click="openCouponPopup">
      <view class="coupon-section__label">优惠券</view>
      <view class="coupon-section__right">
        <text v-if="couponDiscount > 0" class="coupon-section__value">
          -¥{{ couponDiscount.toFixed(2) }}
        </text>
        <text v-else-if="availableCoupons.length > 0" class="coupon-section__placeholder">
          {{ availableCoupons.length }}张可用
        </text>
        <text v-else class="coupon-section__placeholder">无可用优惠券</text>
        <uni-icons type="right" size="14" color="#999" />
      </view>
    </view>

    <!-- 积分抵扣 -->
    <points-deduction
      v-if="memberInfo && memberInfo.points >= 100"
      :available-points="memberInfo.points"
      :order-amount="cartStore.totalPrice"
      :enabled="usePoints"
      @update:enabled="usePoints = $event"
      @change="handlePointsChange"
    />

    <!-- 金额明细 -->
    <view class="price-detail">
      <view class="price-detail__row">
        <text>商品金额</text>
        <text>¥{{ cartStore.formattedTotalPrice }}</text>
      </view>
      <view v-if="pointsDiscount > 0" class="price-detail__row price-detail__row--discount">
        <text>积分抵扣</text>
        <text class="discount-text">-¥{{ pointsDiscount.toFixed(2) }}</text>
      </view>
      <view class="price-detail__row price-detail__row--total">
        <text>合计</text>
        <q-price :value="finalAmount" size="large" />
      </view>
    </view>

    <!-- 底部提交栏 -->
    <view class="submit-bar">
      <view class="submit-bar__info">
        <text class="submit-bar__label">待支付</text>
        <q-price :value="finalAmount" size="large" />
      </view>
      <q-button
        type="primary"
        size="large"
        class="submit-bar__btn"
        :loading="orderStore.submitting"
        @click="handleSubmit"
      >
        提交订单
      </q-button>
    </view>
    <!-- 优惠券弹窗 -->
    <uni-popup ref="couponPopup" type="bottom" background-color="#fff">
      <view class="coupon-popup">
        <view class="coupon-popup__header">
          <text class="coupon-popup__title">选择优惠券</text>
          <uni-icons type="closeempty" size="20" color="#999" @click="closeCouponPopup" />
        </view>
        <scroll-view scroll-y class="coupon-popup__list">
          <view
            v-for="coupon in availableCoupons"
            :key="coupon.id"
            class="coupon-item"
            :class="{
              'coupon-item--active': selectedCoupon?.id === coupon.id,
              'coupon-item--disabled': cartStore.totalPrice < Number(coupon.minAmount)
            }"
            @click="selectCoupon(coupon)"
          >
            <view class="coupon-item__left">
              <view class="coupon-item__amount">
                <text class="symbol">¥</text>
                <text class="num">
                  {{ coupon.value }}
                </text>
              </view>
              <view class="coupon-item__condition">满{{ coupon.minAmount }}可用</view>
            </view>
            <view class="coupon-item__right">
              <view class="coupon-item__name">
                {{ coupon.name }}
              </view>
              <view class="coupon-item__date">有效期至 {{ coupon.endTime?.substring(0, 10) }}</view>
            </view>
            <view v-if="selectedCoupon?.id === coupon.id" class="coupon-item__check">
              <uni-icons type="checkmarkempty" size="20" color="#ff6b35" />
            </view>
          </view>
        </scroll-view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTableStore } from '@/store/table'
import { useCartStore } from '@/store/cart'
import { useOrderStore } from '@/store/order'
import { getMemberProfile, getAvailableCoupons } from '@/api'
import PointsDeduction from '@/components/points-deduction/points-deduction.vue'

const tableStore = useTableStore()
const cartStore = useCartStore()
const orderStore = useOrderStore()

// ==================== 优惠券逻辑定义 ====================
const availableCoupons = ref([])
const selectedCoupon = ref(null)
const couponPopup = ref(null)

// 优惠券折扣金额
const couponDiscount = computed(() => {
  if (!selectedCoupon.value) return 0
  const coupon = selectedCoupon.value
  const total = cartStore.totalPrice
  if (total < Number(coupon.minAmount)) return 0

  let discount = 0
  if (coupon.type === 'FIXED' || coupon.type === 'NO_THRESHOLD') {
    discount = Number(coupon.value)
  } else if (coupon.type === 'PERCENT') {
    let rate = Number(coupon.value)
    if (rate > 1 && rate <= 10) rate = rate / 10
    discount = total * (1 - rate)
    if (coupon.maxDiscount) {
      discount = Math.min(discount, Number(coupon.maxDiscount))
    }
  }
  return Math.min(discount, total)
})

// 打开优惠券弹窗
const openCouponPopup = () => {
  if (availableCoupons.value.length > 0) {
    couponPopup.value.open()
  } else {
    uni.showToast({ title: '暂无可用优惠券', icon: 'none' })
  }
}
const closeCouponPopup = () => {
  couponPopup.value.close()
}
const selectCoupon = (coupon) => {
  if (cartStore.totalPrice < Number(coupon.minAmount)) {
    uni.showToast({ title: `未满${coupon.minAmount}元可用`, icon: 'none' })
    return
  }
  if (selectedCoupon.value?.id === coupon.id) {
    selectedCoupon.value = null
  } else {
    selectedCoupon.value = coupon
  }
  closeCouponPopup()
}

// 用餐人数
const peopleCount = ref(1)

// 订单备注
const orderRemark = ref('')

// 会员信息
const memberInfo = ref(null)

// 是否使用积分
const usePoints = ref(false)

// 积分抵扣金额
const pointsDiscount = computed(() => {
  if (!usePoints.value || !memberInfo.value || memberInfo.value.points < 100) {
    return 0
  }

  const availablePoints = memberInfo.value.points
  // 必须使用扣除优惠券后的金额计算
  const amountAfterCoupon = Math.max(0, cartStore.totalPrice - couponDiscount.value)
  const maxDiscountAmount = amountAfterCoupon * 0.5 // 最多抵扣50%
  const pointsDiscount = availablePoints / 100 // 100积分=1元

  return Math.min(maxDiscountAmount, pointsDiscount)
})

// 最终金额
const finalAmount = computed(() => {
  // 先扣优惠券，再扣积分
  const amountAfterCoupon = Math.max(0, cartStore.totalPrice - couponDiscount.value)
  return Math.max(0, amountAfterCoupon - pointsDiscount.value)
})

// 积分开关变化
const handlePointsChange = (enabled) => {
  usePoints.value = enabled
}

// ==================== 门店配置 ====================

// 点餐提示
const orderTip = computed(() => tableStore.store?.orderTip || '')

// 起订金额
const minOrderAmount = computed(() => {
  const amount = tableStore.store?.minOrderAmount
  return amount ? Number(amount) : 0
})

// 是否低于起订金额
const belowMinOrder = computed(() => {
  return minOrderAmount.value > 0 && cartStore.totalPrice < minOrderAmount.value
})

// 差额
const minOrderGap = computed(() => {
  return (minOrderAmount.value - cartStore.totalPrice).toFixed(2)
})

// 提交订单
const handleSubmit = async () => {
  // 检查起订金额
  if (belowMinOrder.value) {
    uni.showToast({
      title: `还差 ¥${minOrderGap.value} 起送`,
      icon: 'none'
    })
    return
  }

  try {
    const result = await orderStore.submitOrder({
      peopleCount: peopleCount.value,
      remark: orderRemark.value,
      usePoints: usePoints.value,
      pointsUsed: usePoints.value ? Math.floor(pointsDiscount.value * 100) : 0,
      couponId: selectedCoupon.value?.id
    })

    if (result) {
      // 跳转到订单详情
      uni.redirectTo({
        url: `/pages/order/detail?id=${result.id}`
      })
    }
  } catch (error) {
    console.error('提交订单失败:', error)
  }
}

// 加载会员信息
const loadMemberInfo = async () => {
  try {
    const token = uni.getStorageSync('token')
    const storeId = uni.getStorageSync('storeId')

    if (!token || !storeId) {
      return
    }

    // 并行加载会员信息和优惠券
    const [memberRes, couponRes] = await Promise.all([
      getMemberProfile(storeId),
      getAvailableCoupons(storeId)
    ])

    if (memberRes && memberRes.data) {
      memberInfo.value = memberRes.data
    }

    if (couponRes && couponRes.data) {
      // 过滤出未使用的
      availableCoupons.value = couponRes.data.filter((c) => c.status === 'UNUSED') || []
    }
  } catch (error) {
    console.error('加载信息失败:', error)
  }
}

// 页面加载时获取会员信息
onMounted(() => {
  loadMemberInfo()
})
</script>

<style lang="scss" scoped>
.page-confirm {
  min-height: 100vh;
  background: $bg-page;
  padding: 24rpx;
  padding-bottom: 160rpx;
}

// 点餐提示
.order-tip {
  padding: 20rpx 24rpx;
  background: #e6f7ff;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
  display: flex;
  align-items: flex-start;

  &__text {
    margin-left: 12rpx;
    font-size: $font-size-sm;
    color: #1890ff;
    line-height: 1.5;
    flex: 1;
  }
}

// 起订金额提示
.min-order-tip {
  padding: 20rpx 24rpx;
  background: #fff2f0;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;

  &__text {
    margin-left: 12rpx;
    font-size: $font-size-sm;
    color: #ff4d4f;
    flex: 1;
  }
}

.table-info {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: $bg-card;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;

  &__content {
    margin-left: 16rpx;
  }

  &__name {
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    color: $text-primary;
  }

  &__table {
    font-size: $font-size-sm;
    color: $text-secondary;
    margin-left: 12rpx;
  }
}

.order-items {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: 24rpx;
  margin-bottom: 24rpx;

  &__header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20rpx;
  }

  &__title {
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    color: $text-primary;
  }

  &__count {
    font-size: $font-size-sm;
    color: $text-tertiary;
  }
}

.order-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;

  &:not(:last-child) {
    border-bottom: 1rpx solid $border-lighter;
  }

  &__image {
    width: 100rpx;
    height: 100rpx;
    border-radius: $radius-sm;
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
    margin-left: 16rpx;
  }

  &__name {
    font-size: $font-size-base;
    color: $text-primary;
  }

  &__sku {
    font-size: $font-size-sm;
    color: $text-tertiary;
    margin-top: 4rpx;
  }

  &__right {
    text-align: right;
  }

  &__quantity {
    font-size: $font-size-sm;
    color: $text-secondary;
    margin-top: 4rpx;
  }
}

.people-count {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: $bg-card;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;

  &__label {
    font-size: $font-size-base;
    color: $text-primary;
  }
}

.order-remark {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: 24rpx;
  margin-bottom: 24rpx;

  &__label {
    font-size: $font-size-base;
    color: $text-primary;
    margin-bottom: 16rpx;
    display: block;
  }

  &__input {
    width: 100%;
    height: 120rpx;
    padding: 16rpx;
    background: $bg-grey;
    border-radius: $radius-base;
    font-size: $font-size-base;
  }
}

.price-detail {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: 24rpx;

  &__row {
    display: flex;
    justify-content: space-between;
    font-size: $font-size-base;
    color: $text-secondary;

    &:not(:last-child) {
      margin-bottom: 16rpx;
    }

    &--total {
      padding-top: 16rpx;
      border-top: 1rpx solid $border-lighter;
      color: $text-primary;
      font-weight: $font-weight-medium;
    }
  }
}

.submit-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: $bg-card;
  box-shadow: $shadow-top;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));

  &__info {
    display: flex;
    align-items: baseline;
  }

  &__label {
    font-size: $font-size-base;
    color: $text-primary;
    margin-right: 8rpx;
  }

  &__btn {
    width: 240rpx;
  }
}

// 优惠券部分
.coupon-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: $bg-card;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;

  &__label {
    font-size: $font-size-base;
    color: $text-primary;
  }

  &__right {
    display: flex;
    align-items: center;
  }

  &__value {
    font-size: $font-size-base;
    color: $color-primary;
    margin-right: 8rpx;
    font-weight: bold;
  }

  &__placeholder {
    font-size: $font-size-sm;
    color: $text-tertiary;
    margin-right: 8rpx;
  }
}

// 优惠券弹窗
.coupon-popup {
  background: #f5f5f5;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    background: #fff;
    border-radius: 24rpx 24rpx 0 0;
  }

  &__title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }

  &__list {
    flex: 1;
    overflow-y: auto;
    padding: 24rpx;
    box-sizing: border-box;
    /* #ifdef H5 */
    max-height: 60vh;
    /* #endif */
    /* #ifdef MP-WEIXIN */
    height: 60vh;
    /* #endif */
  }
}

.coupon-item {
  display: flex;
  align-items: center;
  /* background-image: radial-gradient(circle at left, transparent 10rpx, #fff 10rpx); */
  /* background-position: left top; */
  /* background-size: 100% 100%; */
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  padding: 24rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);

  &--active {
    border: 2rpx solid #ff6b35;
    background: #fff0e6;
  }

  &--disabled {
    opacity: 0.6;
    filter: grayscale(1);
  }

  &__left {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 160rpx;
    border-right: 1rpx dashed #eee;
    margin-right: 24rpx;

    .amount {
      color: #ff6b35;
    }

    .symbol {
      font-size: 24rpx;
      color: #ff6b35;
    }

    .num {
      font-size: 48rpx;
      font-weight: bold;
      color: #ff6b35;
    }

    .condition {
      font-size: 20rpx;
      color: #999;
      margin-top: 4rpx;
    }
  }

  &__right {
    flex: 1;
  }

  &__name {
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 8rpx;
  }

  &__date {
    font-size: 22rpx;
    color: #999;
  }

  &__check {
    margin-left: 20rpx;
  }
}
</style>
