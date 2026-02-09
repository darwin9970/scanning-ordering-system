<template>
  <view class="page-cart">
    <!-- 空购物车 -->
    <view v-if="cartStore.isEmpty" class="empty-cart">
      <q-empty type="cart" text="购物车是空的" tip="快去挑选心仪的美食吧~">
        <q-button type="primary" @click="goBack">去点餐</q-button>
      </q-empty>
    </view>

    <!-- 购物车列表 -->
    <view v-else class="cart-content">
      <!-- 协同点单提示 -->
      <view class="collab-tip">
        <uni-icons type="info" size="16" color="#1890FF" />
        <text>同桌用户可实时共享购物车</text>
      </view>

      <!-- 商品列表 -->
      <view class="cart-list">
        <uni-swipe-action>
          <uni-swipe-action-item
            v-for="item in cartStore.items"
            :key="item.itemKey"
            :right-options="swipeOptions"
            @click="handleSwipeClick($event, item.itemKey)"
          >
            <view class="cart-item">
              <image
                class="cart-item__image"
                :src="item.productImage || '/static/images/default-food.png'"
                mode="aspectFill"
              />

              <view class="cart-item__content">
                <text class="cart-item__name">
                  {{ item.productName }}
                </text>
                <text v-if="item.skuName" class="cart-item__sku">
                  {{ item.skuName }}
                </text>
                <text v-if="item.remark" class="cart-item__remark">备注: {{ item.remark }}</text>

                <view class="cart-item__footer">
                  <q-price :value="item.price" size="medium" />
                  <q-stepper
                    :model-value="item.quantity"
                    @change="(val) => updateQuantity(item.itemKey, val)"
                  />
                </view>
              </view>
            </view>
          </uni-swipe-action-item>
        </uni-swipe-action>
      </view>

      <!-- 清空购物车 -->
      <view class="clear-cart" @tap="handleClear">
        <uni-icons type="trash" size="16" color="#999999" />
        <text>清空购物车</text>
      </view>
    </view>

    <!-- 底部结算栏 -->
    <view v-if="!cartStore.isEmpty" class="checkout-bar">
      <view class="checkout-bar__info">
        <view class="checkout-bar__total">
          <text class="checkout-bar__label">合计</text>
          <q-price :value="cartStore.totalPrice" size="large" />
        </view>
        <text class="checkout-bar__count">共 {{ cartStore.totalCount }} 件</text>
      </view>

      <q-button type="primary" size="large" class="checkout-bar__btn" @click="goToCheckout">
        去结算
      </q-button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useCartStore } from '@/store/cart'
import { showActionSuccess } from '@/utils/notifications'

const cartStore = useCartStore()

// 滑动删除选项
const swipeOptions = ref([
  {
    text: '删除',
    style: {
      backgroundColor: '#FF4D4F'
    }
  }
])

// 返回菜单
const goBack = () => {
  uni.navigateBack()
}

// 更新数量
const updateQuantity = (itemKey, quantity) => {
  // 触觉反馈
  // #ifdef MP-WEIXIN
  uni.vibrateShort({
    type: 'light'
  })
  // #endif

  cartStore.updateQuantity(itemKey, quantity)
}

// 滑动删除处理
const handleSwipeClick = (e, itemKey) => {
  if (e.index === 0) {
    // 触觉反馈
    // #ifdef MP-WEIXIN
    uni.vibrateShort({
      type: 'medium'
    })
    // #endif

    cartStore.remove(itemKey)

    // 使用统一的 toast 工具
    showActionSuccess('已删除')
  }
}

// 清空购物车
const handleClear = () => {
  uni.showModal({
    title: '提示',
    content: '确定要清空购物车吗？',
    success: (res) => {
      if (res.confirm) {
        cartStore.clear()
      }
    }
  })
}

// 去结算
const goToCheckout = () => {
  uni.navigateTo({
    url: '/pages/order/confirm'
  })
}
</script>

<style lang="scss" scoped>
.page-cart {
  min-height: 100vh;
  background: $bg-page;
  padding-bottom: 140rpx;
}

.empty-cart {
  padding-top: 200rpx;
}

.cart-content {
  padding: 24rpx;
}

.collab-tip {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: $info-light;
  border-radius: $radius-md;
  margin-bottom: 24rpx;

  text {
    margin-left: 12rpx;
    font-size: $font-size-sm;
    color: $info;
  }
}

.cart-list {
  background: $bg-card;
  border-radius: $radius-lg;
  overflow: hidden;
}

.cart-item {
  display: flex;
  padding: 24rpx;
  position: relative;

  &:not(:last-child) {
    border-bottom: 1rpx solid $border-lighter;
  }

  &__image {
    width: 160rpx;
    height: 160rpx;
    border-radius: $radius-md;
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
    margin-left: 20rpx;
    margin-right: 60rpx;
    display: flex;
    flex-direction: column;
  }

  &__name {
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    color: $text-primary;
  }

  &__sku {
    font-size: $font-size-sm;
    color: $text-tertiary;
    margin-top: 8rpx;
  }

  &__remark {
    font-size: $font-size-sm;
    color: $text-tertiary;
    margin-top: 4rpx;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 12rpx;
  }

  &__delete {
    position: absolute;
    top: 24rpx;
    right: 24rpx;
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.clear-cart {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  margin-top: 24rpx;

  text {
    margin-left: 8rpx;
    font-size: $font-size-sm;
    color: $text-tertiary;
  }
}

.checkout-bar {
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
    flex: 1;
  }

  &__total {
    display: flex;
    align-items: baseline;
  }

  &__label {
    font-size: $font-size-base;
    color: $text-primary;
    margin-right: 8rpx;
  }

  &__count {
    font-size: $font-size-sm;
    color: $text-tertiary;
    margin-top: 4rpx;
  }

  &__btn {
    width: 240rpx;
  }
}
</style>
