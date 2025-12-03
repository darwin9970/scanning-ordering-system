<template>
  <view class="page-menu">
    <!-- 自定义导航栏 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__content">
        <view class="navbar__search" @tap="goToSearch">
          <uni-icons type="search" size="18" color="#999999" />
          <text class="navbar__search-text">
            搜索菜品
          </text>
        </view>
        <view class="navbar__table">
          <text>{{ tableStore.tableNo }}桌</text>
        </view>
      </view>
    </view>
    
    <!-- 占位 -->
    <view class="navbar-placeholder" :style="{ height: (statusBarHeight + 50) + 'px' }" />
    
    <!-- 主内容区 -->
    <view class="main-content">
      <!-- 左侧分类 -->
      <scroll-view 
        class="category-nav" 
        scroll-y
        :scroll-into-view="'cat-' + activeCategoryId"
      >
        <view 
          v-for="category in tableStore.categories" 
          :id="'cat-' + category.id"
          :key="category.id"
          class="category-nav__item"
          :class="{ 'category-nav__item--active': activeCategoryId === category.id }"
          @tap="selectCategory(category.id)"
        >
          <text class="category-nav__name">
            {{ category.name }}
          </text>
          <text v-if="getCategoryCount(category.id)" class="category-nav__count">
            {{ getCategoryCount(category.id) }}
          </text>
        </view>
      </scroll-view>
      
      <!-- 右侧商品列表 -->
      <scroll-view 
        class="product-list" 
        scroll-y
        :scroll-into-view="scrollToProduct"
        @scroll="handleScroll"
      >
        <view 
          v-for="category in tableStore.categories" 
          :id="'products-' + category.id"
          :key="category.id"
          class="product-group"
        >
          <view class="product-group__title">
            {{ category.name }}
          </view>
          
          <view 
            v-for="product in getProductsByCategory(category.id)" 
            :key="product.id"
            class="product-card"
            @tap="showProductDetail(product)"
          >
            <image 
              class="product-card__image" 
              :src="product.image || '/static/images/default-food.png'" 
              mode="aspectFill"
            />
            <view class="product-card__content">
              <text class="product-card__name">
                {{ product.name }}
              </text>
              <text class="product-card__desc">
                {{ product.description }}
              </text>
              
              <view v-if="product.tags?.length" class="product-card__tags">
                <q-tag v-for="tag in product.tags.slice(0, 2)" :key="tag" type="primary">
                  {{ tag }}
                </q-tag>
              </view>
              
              <view class="product-card__footer">
                <view class="product-card__price-wrap">
                  <q-price :value="product.price" size="medium" />
                  <q-price 
                    v-if="product.originalPrice" 
                    :value="product.originalPrice" 
                    original 
                  />
                </view>
                
                <view class="product-card__actions" @tap.stop>
                  <q-stepper 
                    v-if="getProductQuantity(product.id) > 0"
                    :model-value="getProductQuantity(product.id)"
                    @change="(val) => updateProductQuantity(product, val)"
                  />
                  <view 
                    v-else 
                    class="product-card__add-btn"
                    @tap="addProduct(product)"
                  >
                    <uni-icons type="plus-filled" size="24" color="#FF6B35" />
                  </view>
                </view>
              </view>
            </view>
          </view>
          
          <!-- 空状态 -->
          <view v-if="getProductsByCategory(category.id).length === 0" class="product-group__empty">
            <text>暂无商品</text>
          </view>
        </view>
      </scroll-view>
    </view>
    
    <!-- 底部购物车栏 -->
    <view v-if="!cartStore.isEmpty" class="cart-bar">
      <view class="cart-bar__inner">
        <view class="cart-bar__icon-wrap" @tap="goToCart">
          <uni-icons type="cart-filled" size="28" color="#FFFFFF" />
          <view class="cart-bar__badge">
            {{ cartStore.totalCount }}
          </view>
        </view>
        
        <view class="cart-bar__info">
          <view class="cart-bar__price">
            <q-price :value="cartStore.totalPrice" size="large" />
          </view>
          <text class="cart-bar__count">
            已选 {{ cartStore.totalCount }} 件
          </text>
        </view>
        
        <view class="cart-bar__btn" @tap="goToCheckout">
          <text>去结算</text>
        </view>
      </view>
    </view>
    
    <!-- 空购物车时的占位 -->
    <view v-else class="cart-bar-placeholder" />
    
    <!-- 商品详情弹窗 -->
    <uni-popup ref="productPopup" type="bottom">
      <view v-if="selectedProduct" class="product-popup">
        <view class="product-popup__header">
          <image 
            class="product-popup__image" 
            :src="selectedProduct.image || '/static/images/default-food.png'" 
            mode="aspectFill"
          />
          <view class="product-popup__close" @tap="closeProductPopup">
            <uni-icons type="close" size="20" color="#999999" />
          </view>
        </view>
        
        <view class="product-popup__body">
          <view class="product-popup__info">
            <text class="product-popup__name">
              {{ selectedProduct.name }}
            </text>
            <view class="product-popup__price-wrap">
              <q-price :value="currentSkuPrice" size="large" />
              <text class="product-popup__sales">
                月售 {{ selectedProduct.salesCount || 0 }}
              </text>
            </view>
          </view>
          
          <!-- SKU 选择 -->
          <view v-if="selectedProduct.skus?.length > 1" class="product-popup__section">
            <text class="product-popup__section-title">
              规格
            </text>
            <view class="product-popup__options">
              <view 
                v-for="sku in selectedProduct.skus" 
                :key="sku.id"
                class="product-popup__option"
                :class="{ 'product-popup__option--active': selectedSkuId === sku.id }"
                @tap="selectSku(sku.id)"
              >
                <text>{{ sku.name }}</text>
                <text class="product-popup__option-price">
                  ¥{{ sku.price }}
                </text>
              </view>
            </view>
          </view>
          
          <!-- 备注 -->
          <view class="product-popup__section">
            <text class="product-popup__section-title">
              备注
            </text>
            <textarea 
              v-model="productRemark"
              class="product-popup__remark"
              placeholder="如需特殊要求请备注"
              maxlength="50"
            />
          </view>
        </view>
        
        <view class="product-popup__footer">
          <q-stepper v-model="productQuantity" :min="1" />
          <q-button 
            type="primary" 
            size="large" 
            class="product-popup__add-btn"
            @click="confirmAddProduct"
          >
            加入购物车 ¥{{ (currentSkuPrice * productQuantity).toFixed(2) }}
          </q-button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTableStore } from '@/store/table'
import { useCartStore } from '@/store/cart'

const tableStore = useTableStore()
const cartStore = useCartStore()

// 状态栏高度
const statusBarHeight = ref(20)

// 当前选中的分类
const activeCategoryId = ref(null)

// 滚动定位
const scrollToProduct = ref('')

// 商品详情弹窗
const productPopup = ref(null)
const selectedProduct = ref(null)
const selectedSkuId = ref(null)
const productQuantity = ref(1)
const productRemark = ref('')

// 获取系统信息
uni.getSystemInfo({
  success: (res) => {
    statusBarHeight.value = res.statusBarHeight || 20
  }
})

// 初始化选中第一个分类
if (tableStore.categories.length > 0) {
  activeCategoryId.value = tableStore.categories[0].id
}

// 获取分类下的商品
const getProductsByCategory = (categoryId) => {
  return tableStore.productsByCategory[categoryId] || []
}

// 获取分类下购物车数量
const getCategoryCount = (categoryId) => {
  const products = getProductsByCategory(categoryId)
  return products.reduce((sum, p) => sum + cartStore.getProductQuantity(p.id), 0)
}

// 获取商品在购物车中的数量
const getProductQuantity = (productId) => {
  return cartStore.getProductQuantity(productId)
}

// 选择分类
const selectCategory = (categoryId) => {
  activeCategoryId.value = categoryId
  scrollToProduct.value = 'products-' + categoryId
}

// 滚动处理
const handleScroll = (_e) => {
  // 可以根据滚动位置更新当前分类
}

// 显示商品详情
const showProductDetail = (product) => {
  selectedProduct.value = product
  selectedSkuId.value = product.skus?.[0]?.id || null
  productQuantity.value = 1
  productRemark.value = ''
  productPopup.value?.open()
}

// 关闭商品详情
const closeProductPopup = () => {
  productPopup.value?.close()
}

// 选择 SKU
const selectSku = (skuId) => {
  selectedSkuId.value = skuId
}

// 当前 SKU 价格
const currentSkuPrice = computed(() => {
  if (!selectedProduct.value) return 0
  if (selectedSkuId.value) {
    const sku = selectedProduct.value.skus?.find(s => s.id === selectedSkuId.value)
    return sku?.price || selectedProduct.value.price
  }
  return selectedProduct.value.price
})

// 确认添加商品
const confirmAddProduct = () => {
  if (!selectedProduct.value) return
  
  const sku = selectedProduct.value.skus?.find(s => s.id === selectedSkuId.value)
  
  cartStore.add(
    selectedProduct.value,
    sku,
    [],
    productQuantity.value,
    productRemark.value
  )
  
  closeProductPopup()
  
  uni.showToast({
    title: '已加入购物车',
    icon: 'success'
  })
}

// 快速添加商品 (无规格)
const addProduct = (product) => {
  if (product.skus?.length > 1) {
    // 有多规格，打开详情
    showProductDetail(product)
  } else {
    // 无规格或单规格，直接添加
    cartStore.add(product, product.skus?.[0], [], 1, '')
    uni.showToast({
      title: '已加入购物车',
      icon: 'success'
    })
  }
}

// 更新商品数量
const updateProductQuantity = (product, quantity) => {
  // 找到购物车中对应的项
  const item = cartStore.items.find(i => i.productId === product.id)
  if (item) {
    cartStore.updateQuantity(item.itemKey, quantity)
  }
}

// 跳转搜索
const goToSearch = () => {
  uni.showToast({
    title: '搜索功能开发中',
    icon: 'none'
  })
}

// 跳转购物车
const goToCart = () => {
  uni.navigateTo({
    url: '/pages/cart/cart'
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
.page-menu {
  min-height: 100vh;
  background: $bg-page;
}

// 导航栏
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: $z-index-fixed;
  background: $bg-card;
  
  &__content {
    display: flex;
    align-items: center;
    padding: 10rpx 24rpx;
    height: 100rpx;
  }
  
  &__search {
    flex: 1;
    height: 72rpx;
    background: $bg-grey;
    border-radius: 36rpx;
    display: flex;
    align-items: center;
    padding: 0 24rpx;
  }
  
  &__search-text {
    margin-left: 12rpx;
    font-size: $font-size-base;
    color: $text-tertiary;
  }
  
  &__table {
    margin-left: 20rpx;
    padding: 12rpx 24rpx;
    background: $primary-light;
    border-radius: 24rpx;
    font-size: $font-size-sm;
    color: $primary;
    font-weight: $font-weight-medium;
  }
}

.navbar-placeholder {
  width: 100%;
}

// 主内容
.main-content {
  display: flex;
  height: calc(100vh - 200rpx);
}

// 分类导航
.category-nav {
  width: $category-width;
  background: $bg-grey;
  flex-shrink: 0;
  
  &__item {
    position: relative;
    height: 100rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: $font-size-base;
    color: $text-secondary;
    
    &--active {
      background: $bg-card;
      color: $primary;
      font-weight: $font-weight-medium;
      
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 6rpx;
        height: 40rpx;
        background: $primary;
        border-radius: 0 3rpx 3rpx 0;
      }
    }
  }
  
  &__name {
    max-width: 140rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  &__count {
    font-size: $font-size-xs;
    color: $primary;
    margin-top: 4rpx;
  }
}

// 商品列表
.product-list {
  flex: 1;
  padding: 0 24rpx;
}

.product-group {
  &__title {
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    color: $text-primary;
    padding: 24rpx 0 16rpx;
  }
  
  &__empty {
    padding: 40rpx;
    text-align: center;
    color: $text-tertiary;
    font-size: $font-size-sm;
  }
}

// 商品卡片
.product-card {
  display: flex;
  padding: 24rpx;
  background: $bg-card;
  border-radius: $radius-lg;
  margin-bottom: 20rpx;
  
  &__image {
    width: 200rpx;
    height: 200rpx;
    border-radius: $radius-md;
    flex-shrink: 0;
  }
  
  &__content {
    flex: 1;
    margin-left: 20rpx;
    display: flex;
    flex-direction: column;
  }
  
  &__name {
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    color: $text-primary;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  
  &__desc {
    font-size: $font-size-sm;
    color: $text-tertiary;
    margin-top: 8rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  &__tags {
    display: flex;
    gap: 8rpx;
    margin-top: 12rpx;
  }
  
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 12rpx;
  }
  
  &__price-wrap {
    display: flex;
    align-items: baseline;
    gap: 8rpx;
  }
  
  &__add-btn {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

// 购物车栏
.cart-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-index-fixed;
  background: $bg-card;
  box-shadow: $shadow-top;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  
  &__inner {
    display: flex;
    align-items: center;
    height: $cart-bar-height;
    padding: 0 24rpx;
  }
  
  &__icon-wrap {
    position: relative;
    width: 100rpx;
    height: 100rpx;
    margin-top: -40rpx;
    background: linear-gradient(135deg, #2D2D2D, #1A1A1A);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: $shadow-base;
  }
  
  &__badge {
    position: absolute;
    top: 8rpx;
    right: 8rpx;
    min-width: 36rpx;
    height: 36rpx;
    padding: 0 10rpx;
    background: $primary;
    color: #FFFFFF;
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    border-radius: 18rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  &__info {
    flex: 1;
    margin-left: 16rpx;
  }
  
  &__count {
    font-size: $font-size-sm;
    color: $text-secondary;
  }
  
  &__btn {
    width: 200rpx;
    height: 80rpx;
    background: $primary;
    color: #FFFFFF;
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    border-radius: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.cart-bar-placeholder {
  height: 40rpx;
}

// 商品详情弹窗
.product-popup {
  background: $bg-card;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 85vh;
  overflow-y: auto;
  
  &__header {
    position: relative;
  }
  
  &__image {
    width: 100%;
    height: 400rpx;
  }
  
  &__close {
    position: absolute;
    top: 24rpx;
    right: 24rpx;
    width: 60rpx;
    height: 60rpx;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  &__body {
    padding: 24rpx;
  }
  
  &__info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  
  &__name {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: $text-primary;
    flex: 1;
  }
  
  &__price-wrap {
    display: flex;
    align-items: baseline;
    gap: 16rpx;
  }
  
  &__sales {
    font-size: $font-size-sm;
    color: $text-tertiary;
  }
  
  &__section {
    margin-top: 32rpx;
  }
  
  &__section-title {
    font-size: $font-size-base;
    font-weight: $font-weight-medium;
    color: $text-primary;
    margin-bottom: 16rpx;
  }
  
  &__options {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
  }
  
  &__option {
    min-width: 120rpx;
    height: 72rpx;
    padding: 0 24rpx;
    background: $bg-grey;
    border: 2rpx solid transparent;
    border-radius: $radius-base;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: $font-size-sm;
    color: $text-secondary;
    
    &--active {
      background: $primary-light;
      border-color: $primary;
      color: $primary;
    }
  }
  
  &__option-price {
    font-size: $font-size-xs;
    margin-top: 4rpx;
  }
  
  &__remark {
    width: 100%;
    height: 120rpx;
    padding: 16rpx;
    background: $bg-grey;
    border-radius: $radius-base;
    font-size: $font-size-base;
  }
  
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx;
    border-top: 1rpx solid $border-lighter;
    padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  }
  
  &__add-btn {
    flex: 1;
    margin-left: 24rpx;
  }
}
</style>
