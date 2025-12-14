<template>
  <view class="page-order-list">
    <!-- 状态筛选 -->
    <view class="status-tabs">
      <view
        v-for="tab in statusTabs"
        :key="tab.value"
        class="status-tabs__item"
        :class="{ 'status-tabs__item--active': activeStatus === tab.value }"
        @tap="switchStatus(tab.value)"
      >
        {{ tab.label }}
      </view>
    </view>

    <q-skeleton :loading="orderStore.loading" :rows="3">
      <!-- 空状态 -->
      <q-empty 
        v-if="filteredOrders.length === 0" 
        type="order" 
        text="暂无订单"
        tip="快去点餐吧~"
      >
        <view class="empty-action">
          <button class="empty-action__btn" @tap="goToMenu">去点餐</button>
        </view>
      </q-empty>
      
      <!-- 订单列表 -->
      <view v-else class="order-list">
        <view 
          v-for="order in filteredOrders" 
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
    
    <!-- 自定义 TabBar -->
    <custom-tabbar :current="1" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/store/order'

const orderStore = useOrderStore()

    // 状态标签页
const statusTabs = [
  { label: '全部', value: '' },
  { label: '待确认', value: 'PENDING' },
  { label: '制作中', value: 'PREPARING' },
  { label: '已完成', value: 'COMPLETED' }
]

    // 当前选中状态
const activeStatus = ref('')

    // 筛选后的订单
const filteredOrders = computed(() => {
  if (!activeStatus.value) {
    return orderStore.orders
  }
  return orderStore.orders.filter(order => order.status === activeStatus.value)
})

    // 切换状态
const switchStatus = (status) => {
  activeStatus.value = status
}

    // 页面加载
onMounted(() => {
  // 从本地存储获取筛选状态 (从"我的"页面跳转时设置)
  const savedStatus = uni.getStorageSync('orderFilterStatus') || ''
  activeStatus.value = savedStatus
  // 清除已读取的状态
  uni.removeStorageSync('orderFilterStatus')

  orderStore.fetchOrders()
})

    // 页面显示时刷新数据 (TabBar 页面需要)
    // eslint-disable-next-line no-unused-vars
const _onShow = () => {
  // 从本地存储获取筛选状态
  const savedStatus = uni.getStorageSync('orderFilterStatus') || ''
  if (savedStatus) {
    activeStatus.value = savedStatus
    uni.removeStorageSync('orderFilterStatus')
  }
  orderStore.fetchOrders()
}

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

    // 去加菜 (TabBar 页面用 switchTab)
const goToMenu = () => {
  uni.switchTab({
    url: '/pages/menu/menu'
  })
}
</script>

<script>
// uni-app 页面生命周期需要用 options API
export default {
  onShow() {
    // 从本地存储获取筛选状态
    const savedStatus = uni.getStorageSync('orderFilterStatus') || ''
    if (savedStatus) {
      uni.removeStorageSync('orderFilterStatus')
    }
  }
}
</script>

<style lang="scss" scoped>
.page-order-list {
  min-height: 100vh;
  background: $bg-page;
  padding-bottom: 140rpx;
}

.status-tabs {
  display: flex;
  background: $bg-card;
  padding: 0 24rpx;
  margin-bottom: 24rpx;

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

.order-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 0 24rpx;
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
