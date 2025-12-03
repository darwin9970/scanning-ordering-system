<template>
  <view class="page-order-list">
    <q-skeleton :loading="orderStore.loading" :rows="3">
      <!-- 空状态 -->
      <q-empty 
        v-if="orderStore.orders.length === 0" 
        type="order" 
        text="暂无订单"
      />
      
      <!-- 订单列表 -->
      <view v-else class="order-list">
        <view 
          v-for="order in orderStore.orders" 
          :key="order.id"
          class="order-card"
          @tap="goToDetail(order.id)"
        >
          <view class="order-card__header">
            <text class="order-card__no">
              订单号: {{ order.orderNo }}
            </text>
            <q-tag :type="orderStore.getStatusType(order.status)">
              {{ orderStore.getStatusText(order.status) }}
            </q-tag>
          </view>
          
          <view class="order-card__content">
            <view class="order-card__items">
              <image 
                v-for="(item, index) in order.items?.slice(0, 3)" 
                :key="index"
                class="order-card__item-image"
                :src="item.productImage || '/static/images/default-food.png'"
                mode="aspectFill"
              />
              <view v-if="order.items?.length > 3" class="order-card__more">
                +{{ order.items.length - 3 }}
              </view>
            </view>
            
            <view class="order-card__info">
              <text class="order-card__count">
                共{{ getTotalCount(order) }}件
              </text>
              <q-price :value="order.totalAmount" size="medium" />
            </view>
          </view>
          
          <view class="order-card__footer">
            <text class="order-card__time">
              {{ formatTime(order.createdAt) }}
            </text>
            <view class="order-card__actions">
              <q-button 
                v-if="canAddItems(order)" 
                type="secondary" 
                size="small"
                @click.stop="goToMenu"
              >
                加菜
              </q-button>
              <q-button 
                type="ghost" 
                size="small"
                @click.stop="goToDetail(order.id)"
              >
                查看详情
              </q-button>
            </view>
          </view>
        </view>
      </view>
    </q-skeleton>
  </view>
</template>

<script setup>
import { onMounted } from 'vue'
import { useOrderStore } from '@/store/order'

const orderStore = useOrderStore()

// 页面加载
onMounted(() => {
  orderStore.fetchOrders()
})

// 获取订单商品总数
const getTotalCount = (order) => {
  return order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
}

// 是否可以加菜
const canAddItems = (order) => {
  return ['CONFIRMED', 'PREPARING'].includes(order.status)
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 跳转详情
const goToDetail = (orderId) => {
  uni.navigateTo({
    url: `/pages/order/detail?id=${orderId}`
  })
}

// 去加菜
const goToMenu = () => {
  uni.navigateTo({
    url: '/pages/menu/menu'
  })
}
</script>

<style lang="scss" scoped>
.page-order-list {
  min-height: 100vh;
  background: $bg-page;
  padding: 24rpx;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.order-card {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: 24rpx;
  
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
  }
  
  &__no {
    font-size: $font-size-sm;
    color: $text-tertiary;
  }
  
  &__content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx 0;
    border-top: 1rpx solid $border-lighter;
    border-bottom: 1rpx solid $border-lighter;
  }
  
  &__items {
    display: flex;
    align-items: center;
  }
  
  &__item-image {
    width: 80rpx;
    height: 80rpx;
    border-radius: $radius-sm;
    margin-right: -16rpx;
    border: 4rpx solid $bg-card;
    
    &:first-child {
      margin-left: 0;
    }
  }
  
  &__more {
    width: 80rpx;
    height: 80rpx;
    border-radius: $radius-sm;
    background: $bg-grey;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-sm;
    color: $text-tertiary;
    border: 4rpx solid $bg-card;
  }
  
  &__info {
    text-align: right;
  }
  
  &__count {
    font-size: $font-size-sm;
    color: $text-tertiary;
    margin-bottom: 4rpx;
  }
  
  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20rpx;
  }
  
  &__time {
    font-size: $font-size-sm;
    color: $text-tertiary;
  }
  
  &__actions {
    display: flex;
    gap: 16rpx;
  }
}
</style>
