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
        <text class="table-info__table">
          {{ tableStore.tableNo }}桌
        </text>
      </view>
    </view>

    <!-- 起订金额提示 -->
    <view v-if="belowMinOrder" class="min-order-tip">
      <uni-icons type="info-filled" size="16" color="#ff4d4f" />
      <text class="min-order-tip__text">
        还差 ¥{{ minOrderGap }} 起送
      </text>
    </view>
    
    <!-- 商品列表 -->
    <view class="order-items">
      <view class="order-items__header">
        <text class="order-items__title">
          商品清单
        </text>
        <text class="order-items__count">
          共{{ cartStore.totalCount }}件
        </text>
      </view>
      
      <view 
        v-for="item in cartStore.items" 
        :key="item.itemKey"
        class="order-item"
      >
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
          <text class="order-item__quantity">
            x{{ item.quantity }}
          </text>
        </view>
      </view>
    </view>
    
    <!-- 用餐人数 -->
    <view class="people-count">
      <text class="people-count__label">
        用餐人数
      </text>
      <q-stepper v-model="peopleCount" :min="1" :max="20" />
    </view>
    
    <!-- 备注 -->
    <view class="order-remark">
      <text class="order-remark__label">
        订单备注
      </text>
      <textarea 
        v-model="orderRemark"
        class="order-remark__input"
        placeholder="如有特殊需求请备注"
        maxlength="100"
      />
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
        <text class="submit-bar__label">
          待支付
        </text>
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
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTableStore } from '@/store/table'
import { useCartStore } from '@/store/cart'
import { useOrderStore } from '@/store/order'
import { getMemberProfile } from '@/api'
import PointsDeduction from '@/components/points-deduction/points-deduction.vue'

const tableStore = useTableStore()
const cartStore = useCartStore()
const orderStore = useOrderStore()

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
  const orderAmount = cartStore.totalPrice
  const maxDiscountAmount = orderAmount * 0.5 // 最多抵扣50%
  const pointsDiscount = availablePoints / 100 // 100积分=1元
  
  return Math.min(maxDiscountAmount, pointsDiscount)
})

// 最终金额
const finalAmount = computed(() => {
  return Math.max(0, cartStore.totalPrice - pointsDiscount.value)
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
      pointsUsed: usePoints.value ? Math.floor(pointsDiscount.value * 100) : 0
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
    
    const res = await getMemberProfile(storeId)
    if (res && res.data) {
      memberInfo.value = res.data
    }
  } catch (error) {
    console.error('加载会员信息失败:', error)
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
</style>
