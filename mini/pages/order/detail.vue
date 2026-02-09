<template>
  <view class="page-order-detail">
    <!-- 如果已配置页面布局，显示配置的布局 -->
    <template v-if="pageComponents.length > 0 && useCustomLayout">
      <page-renderer
        :components="pageComponents"
        :order="order"
        :loading="orderStore.loading"
        :show-actions="showActions"
        :can-add-items="canAddItems"
        :can-call-service="canCallService"
        @action-click="handleActionClick"
        @nav-click="handleNavClick"
      />
    </template>

    <!-- 默认布局（未配置时显示） -->
    <template v-else>
      <q-skeleton :loading="orderStore.loading" :rows="4">
        <template v-if="order">
          <!-- 订单状态 -->
          <view
            class="order-status"
            :class="'order-status--' + orderStore.getStatusType(order.status)"
          >
            <uni-icons :type="getStatusIcon(order.status)" size="48" color="#FFFFFF" />
            <text class="order-status__text">
              {{ orderStore.getStatusText(order.status) }}
            </text>
            <text class="order-status__desc">
              {{ getStatusDesc(order.status) }}
            </text>
          </view>

          <!-- 桌台信息 -->
          <view class="info-card">
            <view class="info-card__row">
              <text class="info-card__label">桌台</text>
              <text class="info-card__value">{{ order.tableNo }}桌</text>
            </view>
            <view class="info-card__row">
              <text class="info-card__label">下单时间</text>
              <text class="info-card__value">
                {{ formatTime(order.createdAt) }}
              </text>
            </view>
            <view class="info-card__row">
              <text class="info-card__label">订单号</text>
              <text class="info-card__value">
                {{ order.orderNo }}
              </text>
            </view>
          </view>

          <!-- 商品列表 -->
          <view class="order-items">
            <view class="order-items__header">
              <text class="order-items__title">商品清单</text>
            </view>

            <view v-for="item in order.items" :key="item.id" class="order-item">
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
                <text class="order-item__price">¥{{ item.price }}</text>
                <text class="order-item__quantity">x{{ item.quantity }}</text>
              </view>
            </view>
          </view>

          <!-- 金额明细 -->
          <view class="price-detail">
            <view class="price-detail__row">
              <text>商品金额</text>
              <text>¥{{ order.totalAmount?.toFixed(2) }}</text>
            </view>
            <view v-if="order.discountAmount" class="price-detail__row">
              <text>优惠</text>
              <text class="text-error">-¥{{ order.discountAmount?.toFixed(2) }}</text>
            </view>
            <view class="price-detail__row price-detail__row--total">
              <text>实付金额</text>
              <q-price :value="order.payAmount || order.totalAmount" size="large" />
            </view>
          </view>

          <!-- 底部操作 -->
          <view v-if="showActions" class="action-bar">
            <q-button v-if="canAddItems" type="secondary" @click="goToMenu">加菜</q-button>
            <q-button v-if="canCallService" type="ghost" @click="handleCallService">
              呼叫服务
            </q-button>
          </view>
        </template>
      </q-skeleton>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useOrderStore } from '@/store/order'
import { useTableStore } from '@/store/table'
import { startOrderStatusPolling } from '@/utils/notifications'
import { getPageConfig } from '@/api'

const orderStore = useOrderStore()
const tableStore = useTableStore()

// 页面配置
const pageComponents = ref([])
const useCustomLayout = ref(false)

// 获取订单ID
const orderId = ref(null)

// 订单数据
const order = computed(() => orderStore.currentOrder)

// 订单状态轮询停止函数
let stopPolling = null

// 是否显示操作按钮
const showActions = computed(() => {
  return order.value && ['PENDING', 'CONFIRMED', 'PREPARING'].includes(order.value.status)
})

// 是否可以加菜
const canAddItems = computed(() => {
  return order.value && ['CONFIRMED', 'PREPARING'].includes(order.value.status)
})

// 是否可以呼叫服务
const canCallService = computed(() => {
  return order.value && !['CANCELLED', 'COMPLETED'].includes(order.value.status)
})

// 页面加载
onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  orderId.value = currentPage.options?.id

  if (orderId.value) {
    orderStore.fetchOrderDetail(orderId.value)

    // 如果订单未完成，开始轮询状态
    const currentOrder = orderStore.currentOrder
    if (currentOrder && !['COMPLETED', 'CANCELLED'].includes(currentOrder.status)) {
      stopPolling = startOrderStatusPolling(orderId.value, (updatedOrder) => {
        // 订单状态更新时刷新订单详情
        orderStore.fetchOrderDetail(orderId.value)
      })
    }
  }

  const storeId = uni.getStorageSync('storeId')
  if (storeId) {
    loadPageConfig()
  }
})

// 页面卸载时停止轮询
onUnmounted(() => {
  if (stopPolling) {
    stopPolling()
    stopPolling = null
  }
})

// 获取状态图标
const getStatusIcon = (status) => {
  const iconMap = {
    PENDING: 'clock',
    CONFIRMED: 'checkmarkempty',
    PREPARING: 'fire',
    COMPLETED: 'checkbox',
    CANCELLED: 'closeempty'
  }
  return iconMap[status] || 'info'
}

// 获取状态描述
const getStatusDesc = (status) => {
  const descMap = {
    PENDING: '等待商家确认订单',
    CONFIRMED: '商家已确认，正在备餐',
    PREPARING: '正在制作中，请稍候',
    COMPLETED: '用餐愉快',
    CANCELLED: '订单已取消'
  }
  return descMap[status] || ''
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 去加菜
const goToMenu = () => {
  uni.navigateTo({
    url: '/pages/menu/menu'
  })
}

// 呼叫服务
const handleCallService = () => {
  uni.showActionSheet({
    itemList: ['催单', '加水', '呼叫服务员'],
    success: (_res) => {
      uni.showToast({
        title: '已通知服务员',
        icon: 'success'
      })
    }
  })
}

// 加载页面配置
const loadPageConfig = async () => {
  try {
    const storeId = uni.getStorageSync('storeId')
    if (!storeId) {
      console.log('storeId不存在，跳过加载页面配置')
      return
    }
    console.log('加载订单详情配置, storeId:', storeId)
    const res = await getPageConfig({
      storeId,
      pageType: 'PRODUCT_DETAIL'
    })
    console.log('订单详情配置响应:', res)
    if (res.code === 200 && res.data) {
      pageComponents.value = res.data.components || []
      useCustomLayout.value = !res.data.isDefault && pageComponents.value.length > 0
      console.log('订单详情组件:', pageComponents.value)
    }
  } catch (e) {
    console.error('加载页面配置失败:', e)
    uni.showToast({
      title: '页面配置加载失败',
      icon: 'none',
      duration: 2000
    })
  }
}

// 处理操作点击
const handleActionClick = (action) => {
  switch (action) {
    case 'addItems':
      goToMenu()
      break
    case 'callService':
      handleCallService()
      break
  }
}

// 处理导航点击
const handleNavClick = (item) => {
  if (!item.link || !item.link.type) return

  switch (item.link.type) {
    case 'page':
      if (item.link.value) {
        const tabBarPages = [
          '/pages/index/index',
          '/pages/menu/menu',
          '/pages/order/list',
          '/pages/mine/mine'
        ]
        if (tabBarPages.includes(item.link.value)) {
          uni.switchTab({ url: item.link.value })
        } else {
          uni.navigateTo({ url: item.link.value })
        }
      }
      break
    case 'menu':
      goToMenu()
      break
  }
}

// 监听storeId变化
watch(
  () => tableStore.storeId,
  (newStoreId) => {
    if (newStoreId) {
      console.log('storeId变化，重新加载数据:', newStoreId)
      loadPageConfig()
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.page-order-detail {
  min-height: 100vh;
  background: $bg-page;
  padding-bottom: 140rpx;
}

.order-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 40rpx;
  color: #ffffff;

  &--warning {
    background: linear-gradient(135deg, #faad14, #fa8c16);
  }

  &--success {
    background: linear-gradient(135deg, #52c41a, #389e0d);
  }

  &--error {
    background: linear-gradient(135deg, #ff4d4f, #f5222d);
  }

  &--info {
    background: linear-gradient(135deg, #1890ff, #096dd9);
  }

  &__text {
    font-size: $font-size-xl;
    font-weight: $font-weight-semibold;
    margin-top: 20rpx;
  }

  &__desc {
    font-size: $font-size-sm;
    opacity: 0.8;
    margin-top: 8rpx;
  }
}

.info-card {
  margin: 24rpx;
  padding: 24rpx;
  background: $bg-card;
  border-radius: $radius-lg;

  &__row {
    display: flex;
    justify-content: space-between;
    padding: 12rpx 0;

    &:not(:last-child) {
      border-bottom: 1rpx solid $border-lighter;
    }
  }

  &__label {
    font-size: $font-size-base;
    color: $text-secondary;
  }

  &__value {
    font-size: $font-size-base;
    color: $text-primary;
  }
}

.order-items {
  margin: 24rpx;
  padding: 24rpx;
  background: $bg-card;
  border-radius: $radius-lg;

  &__header {
    margin-bottom: 20rpx;
  }

  &__title {
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    color: $text-primary;
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
    width: 80rpx;
    height: 80rpx;
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

  &__price {
    font-size: $font-size-base;
    color: $text-primary;
  }

  &__quantity {
    font-size: $font-size-sm;
    color: $text-tertiary;
    margin-top: 4rpx;
  }
}

.price-detail {
  margin: 24rpx;
  padding: 24rpx;
  background: $bg-card;
  border-radius: $radius-lg;

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

.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  background: $bg-card;
  box-shadow: $shadow-top;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));

  .q-btn {
    flex: 1;
  }
}

.text-error {
  color: $error;
}
</style>
