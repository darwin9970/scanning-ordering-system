<template>
  <view class="page-renderer">
    <template v-for="comp in visibleComponents" :key="comp.id">
      <!-- 轮播图 -->
      <view v-if="comp.type === 'BANNER'" class="pr-banner">
        <swiper
          v-if="banners.length > 0"
          class="pr-banner__swiper"
          :style="{ height: (comp.props.height || 180) + 'px' }"
          :autoplay="comp.props.autoplay !== false"
          :interval="comp.props.interval || 3000"
          :circular="true"
          indicator-dots
          indicator-color="rgba(255,255,255,0.5)"
          indicator-active-color="#FFFFFF"
        >
          <swiper-item
            v-for="banner in banners"
            :key="banner.id"
            @tap="handleBannerClick(banner)"
          >
            <image
              class="pr-banner__image"
              :src="banner.image"
              mode="aspectFill"
            />
          </swiper-item>
        </swiper>
        <view v-else class="pr-banner__empty" :style="{ height: (comp.props.height || 180) + 'px' }">
          <text>暂无轮播图</text>
        </view>
      </view>

      <!-- 公告栏 -->
      <view v-else-if="comp.type === 'NOTICE'" class="pr-notice">
        <view v-if="announcement" class="pr-notice__inner">
          <uni-icons type="sound-filled" size="16" color="#ff9500" />
          <text class="pr-notice__text">{{ announcement }}</text>
        </view>
      </view>

      <!-- 金刚区导航 -->
      <view v-else-if="comp.type === 'NAV_GRID'" class="pr-nav-grid">
        <view 
          class="pr-nav-grid__inner"
          :style="{ gridTemplateColumns: `repeat(${comp.props.columns || 4}, 1fr)` }"
        >
          <view 
            v-for="(item, idx) in (comp.props.items || [])" 
            :key="idx"
            class="pr-nav-grid__item"
            @tap="handleNavClick(item)"
          >
            <text class="pr-nav-grid__icon">{{ item.icon }}</text>
            <text class="pr-nav-grid__text">{{ item.text }}</text>
          </view>
        </view>
      </view>

      <!-- 热销商品 -->
      <view v-else-if="comp.type === 'HOT_PRODUCTS'" class="pr-hot-products">
        <view class="pr-section-header">
          <view class="pr-section-header__title">
            <text class="pr-section-header__icon">🔥</text>
            <text>{{ comp.title || '热销推荐' }}</text>
          </view>
          <view class="pr-section-header__more" @tap="goToCategory">
            <text>查看更多</text>
            <uni-icons type="right" size="12" color="#999" />
          </view>
        </view>
        <scroll-view class="pr-hot-products__list" scroll-x>
          <view 
            v-for="product in hotProducts.slice(0, comp.props.limit || 6)" 
            :key="product.id"
            class="pr-hot-products__item"
            @tap="$emit('productClick', product)"
          >
            <view v-if="comp.props.showRank" class="pr-hot-products__rank">
              {{ hotProducts.indexOf(product) + 1 }}
            </view>
            <image 
              class="pr-hot-products__image" 
              :src="product.image || '/static/images/default-food.png'"
              mode="aspectFill"
            />
            <text class="pr-hot-products__name">{{ product.name }}</text>
            <text class="pr-hot-products__price">¥{{ product.price }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 新品推荐 -->
      <view v-else-if="comp.type === 'NEW_PRODUCTS'" class="pr-new-products">
        <view class="pr-section-header">
          <view class="pr-section-header__title">
            <text class="pr-section-header__icon">✨</text>
            <text>{{ comp.title || '新品上市' }}</text>
          </view>
        </view>
        <view class="pr-new-products__grid">
          <view 
            v-for="product in newProducts.slice(0, comp.props.limit || 4)" 
            :key="product.id"
            class="pr-new-products__item"
            @tap="$emit('productClick', product)"
          >
            <view class="pr-new-products__image-wrap">
              <image 
                class="pr-new-products__image" 
                :src="product.image || '/static/images/default-food.png'"
                mode="aspectFill"
              />
              <view v-if="comp.props.showBadge" class="pr-new-products__badge">新品</view>
            </view>
            <text class="pr-new-products__name">{{ product.name }}</text>
            <text class="pr-new-products__price">¥{{ product.price }}</text>
          </view>
        </view>
      </view>

      <!-- 优惠券入口 -->
      <view v-else-if="comp.type === 'COUPON'" class="pr-coupon">
        <scroll-view class="pr-coupon__list" scroll-x>
          <view 
            v-for="coupon in coupons.slice(0, comp.props.showCount || 3)" 
            :key="coupon.id"
            class="pr-coupon__item"
            @tap="$emit('couponClick', coupon)"
          >
            <view class="pr-coupon__value">
              <text class="pr-coupon__currency">¥</text>
              <text class="pr-coupon__amount">{{ coupon.value }}</text>
            </view>
            <view class="pr-coupon__info">
              <text class="pr-coupon__name">{{ coupon.name }}</text>
              <text class="pr-coupon__condition">满{{ coupon.minAmount }}可用</text>
            </view>
            <view class="pr-coupon__btn">领取</view>
          </view>
        </scroll-view>
      </view>

      <!-- 单图广告 -->
      <view v-else-if="comp.type === 'IMAGE'" class="pr-image">
        <image 
          v-if="comp.props.image"
          class="pr-image__img"
          :src="comp.props.image"
          :style="{ height: (comp.props.height || 120) + 'px' }"
          mode="aspectFill"
          @tap="handleImageClick(comp.props.link)"
        />
      </view>

      <!-- 商品列表 -->
      <view v-else-if="comp.type === 'PRODUCT_LIST'" class="pr-product-list">
        <view class="pr-section-header" v-if="comp.title">
          <view class="pr-section-header__title">
            <text>{{ comp.title }}</text>
          </view>
        </view>
        <view 
          v-for="product in getFilteredProducts(comp.props.categoryId, comp.props.limit || 10)" 
          :key="product.id"
          class="pr-product-list__item"
          @tap="$emit('productClick', product)"
        >
          <image 
            class="pr-product-list__image" 
            :src="product.image || '/static/images/default-food.png'"
            mode="aspectFill"
          />
          <view class="pr-product-list__info">
            <text class="pr-product-list__name">{{ product.name }}</text>
            <text class="pr-product-list__desc">{{ product.description || '' }}</text>
            <view class="pr-product-list__bottom">
              <text class="pr-product-list__price">¥{{ product.price }}</text>
              <view class="pr-product-list__btn">+</view>
            </view>
          </view>
        </view>
      </view>

      <!-- 商品网格 -->
      <view v-else-if="comp.type === 'PRODUCT_GRID'" class="pr-product-grid">
        <view class="pr-section-header" v-if="comp.title">
          <view class="pr-section-header__title">
            <text>{{ comp.title }}</text>
          </view>
        </view>
        <view 
          class="pr-product-grid__inner"
          :style="{ gridTemplateColumns: `repeat(${comp.props.columns || 2}, 1fr)` }"
        >
          <view 
            v-for="product in getFilteredProducts(comp.props.categoryId, comp.props.limit || 8)" 
            :key="product.id"
            class="pr-product-grid__item"
            @tap="$emit('productClick', product)"
          >
            <image 
              class="pr-product-grid__image" 
              :src="product.image || '/static/images/default-food.png'"
              mode="aspectFill"
            />
            <text class="pr-product-grid__name">{{ product.name }}</text>
            <view class="pr-product-grid__bottom">
              <text class="pr-product-grid__price">¥{{ product.price }}</text>
              <view class="pr-product-grid__btn">+</view>
            </view>
          </view>
        </view>
      </view>

      <!-- 分隔符 -->
      <view 
        v-else-if="comp.type === 'SPACER'" 
        class="pr-spacer"
        :style="{ 
          height: (comp.props.height || 20) + 'px',
          backgroundColor: comp.props.backgroundColor || '#f5f5f5'
        }"
      />

      <!-- 搜索模块 -->
      <view v-else-if="comp.type === 'SEARCH'" class="pr-search">
        <view 
          class="pr-search__inner"
          :style="{ backgroundColor: comp.props.bgColor || '#f5f5f5' }"
          @tap="$emit('navClick', { link: { type: 'search' } })"
        >
          <uni-icons type="search" size="16" color="#999" />
          <text class="pr-search__placeholder">{{ comp.props.placeholder || '搜索商品' }}</text>
        </view>
      </view>

      <!-- 门店标题 -->
      <view v-else-if="comp.type === 'STORE_TITLE'" class="pr-store-title">
        <view class="pr-store-title__main">
          <text class="pr-store-title__name">{{ storeName || '门店名称' }}</text>
          <view v-if="comp.props.showStatus" class="pr-store-title__status">营业中</view>
        </view>
        <view v-if="comp.props.showDistance" class="pr-store-title__distance">
          <uni-icons type="location" size="12" color="#999" />
          <text>{{ storeDistance || '0.5km' }}</text>
        </view>
      </view>

      <!-- 购物车悬浮按钮 -->
      <view v-else-if="comp.type === 'CART_FLOAT'" class="pr-cart-float" @tap="$emit('navClick', { link: { type: 'cart' } })">
        <uni-icons type="cart" size="24" color="#fff" />
        <view v-if="cartCount > 0" class="pr-cart-float__badge">{{ cartCount }}</view>
      </view>

      <!-- 文本元素 -->
      <view v-else-if="comp.type === 'TEXT'" class="pr-text">
        <text 
          :style="{
            fontSize: (comp.props.fontSize || 14) + 'px',
            color: comp.props.color || '#333',
            fontWeight: comp.props.fontWeight || 'normal',
            textAlign: comp.props.align || 'left'
          }"
        >{{ comp.props.content || '' }}</text>
      </view>

      <!-- 自由容器 -->
      <view 
        v-else-if="comp.type === 'FREE_CONTAINER'" 
        class="pr-free-container"
        :style="{
          height: (comp.props.height || 200) + 'px',
          backgroundColor: comp.props.bgColor || 'transparent',
          backgroundImage: comp.props.bgImage ? `url(${comp.props.bgImage})` : 'none',
          padding: (comp.props.padding || 0) + 'px',
          overflow: comp.props.overflow || 'hidden'
        }"
      >
        <!-- 递归渲染子组件 -->
        <template v-for="child in (comp.children || [])" :key="child.id">
          <view 
            v-if="child.type === 'TEXT'" 
            :style="{
              fontSize: (child.props.fontSize || 14) + 'px',
              color: child.props.color || '#333',
              fontWeight: child.props.fontWeight || 'normal'
            }"
          >{{ child.props.content || '' }}</view>
          <image 
            v-else-if="child.type === 'IMAGE'"
            :src="child.props.image"
            :style="{
              width: child.props.width || '100%',
              height: (child.props.height || 100) + 'px',
              borderRadius: (child.props.borderRadius || 0) + 'px'
            }"
            mode="aspectFill"
          />
        </template>
      </view>

      <!-- 会员信息 -->
      <view v-else-if="comp.type === 'USER_INFO'" class="pr-user-info">
        <view class="pr-user-info__main">
          <image v-if="comp.props.showAvatar !== false" class="pr-user-info__avatar" :src="userInfo.avatar || '/static/images/default-avatar.png'" />
          <view class="pr-user-info__content">
            <text v-if="comp.props.showNickname !== false" class="pr-user-info__name">{{ userInfo.nickname || '点击登录' }}</text>
            <view class="pr-user-info__level">
              <text class="pr-user-info__badge">VIP1</text>
            </view>
          </view>
        </view>
        <view class="pr-user-info__stats">
          <view v-if="comp.props.showBalance !== false" class="pr-user-info__stat" @tap="$emit('navClick', { link: { type: 'page', value: '/pages/mine/balance' } })">
            <text class="pr-user-info__stat-value">{{ userInfo.balance || '0.00' }}</text>
            <text class="pr-user-info__stat-label">余额</text>
          </view>
          <view v-if="comp.props.showPoints !== false" class="pr-user-info__stat" @tap="$emit('navClick', { link: { type: 'page', value: '/pages/mine/points' } })">
            <text class="pr-user-info__stat-value">{{ userInfo.points || 0 }}</text>
            <text class="pr-user-info__stat-label">积分</text>
          </view>
          <view v-if="comp.props.showCoupons !== false" class="pr-user-info__stat" @tap="$emit('navClick', { link: { type: 'page', value: '/pages/mine/coupons' } })">
            <text class="pr-user-info__stat-value">{{ userInfo.couponCount || 0 }}</text>
            <text class="pr-user-info__stat-label">优惠券</text>
          </view>
        </view>
      </view>

      <!-- 功能入口 -->
      <view v-else-if="comp.type === 'FUNC_ENTRY'" class="pr-func-entry">
        <view 
          class="pr-func-entry__inner"
          :style="{ gridTemplateColumns: `repeat(${comp.props.columns || 4}, 1fr)` }"
        >
          <view 
            v-for="(item, idx) in (comp.props.items || [])" 
            :key="idx"
            class="pr-func-entry__item"
            @tap="$emit('navClick', item)"
          >
            <text class="pr-func-entry__icon">{{ item.icon }}</text>
            <text class="pr-func-entry__text">{{ item.text }}</text>
          </view>
        </view>
      </view>

      <!-- 焦点入口 -->
      <view 
        v-else-if="comp.type === 'FOCUS_ENTRY'" 
        class="pr-focus-entry"
        :style="{ backgroundColor: comp.props.bgColor || '#ff6b35' }"
        @tap="$emit('navClick', { link: comp.props.link })"
      >
        <text class="pr-focus-entry__icon">{{ comp.props.icon || '🔥' }}</text>
        <text class="pr-focus-entry__text">{{ comp.props.text || '点我下单' }}</text>
      </view>

      <!-- 集点卡 -->
      <view v-else-if="comp.type === 'STAMP_CARD' || comp.type === 'STAMP_CARD_STD'" class="pr-stamp-card">
        <view class="pr-stamp-card__header">
          <text class="pr-stamp-card__title">{{ comp.props.title || '集点活动' }}</text>
          <text class="pr-stamp-card__subtitle">{{ comp.props.subtitle || '集满兑换好礼' }}</text>
        </view>
        <view class="pr-stamp-card__grid">
          <view 
            v-for="i in (comp.props.total || 10)" 
            :key="i" 
            class="pr-stamp-card__point"
            :class="{ 'pr-stamp-card__point--active': i <= (comp.props.current || 0) }"
          >
            <text>{{ i <= (comp.props.current || 0) ? '✓' : i }}</text>
          </view>
        </view>
      </view>

      <!-- 储值余额入口 -->
      <view v-else-if="comp.type === 'BALANCE_ENTRY'" class="pr-balance-entry" @tap="$emit('navClick', { link: { type: 'page', value: '/pages/mine/balance' } })">
        <view class="pr-balance-entry__left">
          <text class="pr-balance-entry__label">账户余额</text>
          <text class="pr-balance-entry__value">¥{{ userInfo.balance || '0.00' }}</text>
        </view>
        <view class="pr-balance-entry__btn">去充值</view>
      </view>

      <!-- 会员积分入口 -->
      <view v-else-if="comp.type === 'POINTS_ENTRY'" class="pr-points-entry" @tap="$emit('navClick', { link: { type: 'page', value: '/pages/mine/points' } })">
        <view class="pr-points-entry__left">
          <text class="pr-points-entry__label">我的积分</text>
          <text class="pr-points-entry__value">{{ userInfo.points || 0 }}</text>
        </view>
        <view class="pr-points-entry__btn">去兑换</view>
      </view>

      <!-- 客服入口 -->
      <view v-else-if="comp.type === 'SERVICE_ENTRY'" class="pr-service-entry">
        <button class="pr-service-entry__btn" open-type="contact">
          <uni-icons type="chat" size="18" color="#ff6b35" />
          <text>{{ comp.props.text || '联系客服' }}</text>
        </button>
      </view>

      <!-- 门店列表 -->
      <view v-else-if="comp.type === 'STORE_LIST'" class="pr-store-list">
        <view class="pr-section-header">
          <view class="pr-section-header__title">
            <text>附近门店</text>
          </view>
        </view>
        <view 
          v-for="store in (stores || []).slice(0, comp.props.limit || 5)" 
          :key="store.id"
          class="pr-store-list__item"
          @tap="$emit('storeClick', store)"
        >
          <view class="pr-store-list__info">
            <text class="pr-store-list__name">{{ store.name }}</text>
            <text class="pr-store-list__address">{{ store.address }}</text>
          </view>
          <view v-if="comp.props.showDistance" class="pr-store-list__distance">
            <text>{{ store.distance || '0.5km' }}</text>
          </view>
        </view>
      </view>

      <!-- 套餐推广 -->
      <view v-else-if="comp.type === 'COMBO_PROMO'" class="pr-combo-promo">
        <view class="pr-section-header">
          <view class="pr-section-header__title">
            <text class="pr-section-header__icon">🎁</text>
            <text>{{ comp.props.title || '超值套餐' }}</text>
          </view>
        </view>
        <scroll-view class="pr-combo-promo__list" scroll-x>
          <view 
            v-for="combo in (combos || []).slice(0, comp.props.limit || 4)" 
            :key="combo.id"
            class="pr-combo-promo__item"
            @tap="$emit('productClick', combo)"
          >
            <image class="pr-combo-promo__image" :src="combo.image || '/static/images/default-food.png'" mode="aspectFill" />
            <text class="pr-combo-promo__name">{{ combo.name }}</text>
            <text class="pr-combo-promo__price">¥{{ combo.price }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 充值选项 -->
      <view v-else-if="comp.type === 'RECHARGE_OPTIONS'" class="pr-recharge-options">
        <view 
          class="pr-recharge-options__grid"
          :style="{ gridTemplateColumns: `repeat(${comp.props.columns || 2}, 1fr)` }"
        >
          <view 
            v-for="(item, idx) in (comp.props.items || [])" 
            :key="idx"
            class="pr-recharge-options__item"
            :class="{ 'pr-recharge-options__item--selected': selectedRechargeIdx === idx }"
            @tap="selectedRechargeIdx = idx"
          >
            <text class="pr-recharge-options__amount">¥{{ item.amount }}</text>
            <text class="pr-recharge-options__gift">赠送¥{{ item.gift }}</text>
          </view>
        </view>
      </view>

      <!-- 充值按钮 -->
      <view 
        v-else-if="comp.type === 'RECHARGE_BUTTON'" 
        class="pr-recharge-button"
        :style="{ backgroundColor: comp.props.bgColor || '#ff6b35' }"
        @tap="$emit('rechargeClick')"
      >
        <text :style="{ color: comp.props.textColor || '#fff' }">{{ comp.props.text || '立即充值' }}</text>
      </view>

      <!-- 营销模块 -->
      <view v-else-if="comp.type === 'PROMOTION'" class="pr-promotion">
        <view class="pr-section-header">
          <view class="pr-section-header__title">
            <text class="pr-section-header__icon">🎉</text>
            <text>优惠活动</text>
          </view>
        </view>
        <view class="pr-promotion__grid">
          <view 
            v-for="(item, idx) in (comp.props.items || [])" 
            :key="idx"
            class="pr-promotion__item"
            @tap="$emit('navClick', { link: item.link })"
          >
            <image v-if="item.image" class="pr-promotion__image" :src="item.image" mode="aspectFill" />
          </view>
        </view>
      </view>

      <!-- 未知组件类型占位 -->
      <view v-else class="pr-unknown">
        <text>{{ comp.type }}</text>
      </view>
    </template>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  components: {
    type: Array,
    default: () => []
  },
  banners: {
    type: Array,
    default: () => []
  },
  announcement: {
    type: String,
    default: ''
  },
  hotProducts: {
    type: Array,
    default: () => []
  },
  newProducts: {
    type: Array,
    default: () => []
  },
  coupons: {
    type: Array,
    default: () => []
  },
  products: {
    type: Array,
    default: () => []
  },
  // 新增props
  storeName: {
    type: String,
    default: ''
  },
  storeDistance: {
    type: String,
    default: ''
  },
  cartCount: {
    type: Number,
    default: 0
  },
  userInfo: {
    type: Object,
    default: () => ({})
  },
  stores: {
    type: Array,
    default: () => []
  },
  combos: {
    type: Array,
    default: () => []
  }
})

// 充值选项选中索引
const selectedRechargeIdx = ref(0)

const emit = defineEmits(['bannerClick', 'navClick', 'productClick', 'couponClick', 'storeClick', 'rechargeClick'])

// 过滤出可见的组件
const visibleComponents = computed(() => {
  return props.components.filter(c => c.visible !== false)
})

// 轮播图点击
const handleBannerClick = (banner) => {
  emit('bannerClick', banner)
}

// 导航点击
const handleNavClick = (item) => {
  emit('navClick', item)
}

// 图片点击
const handleImageClick = (link) => {
  if (!link || !link.type || !link.value) return
  emit('navClick', { link })
}

// 根据分类过滤商品
const getFilteredProducts = (categoryId, limit) => {
  let list = props.products
  if (categoryId) {
    list = list.filter(p => p.categoryId === categoryId)
  }
  return list.slice(0, limit)
}

// 跳转分类
const goToCategory = () => {
  // 由父组件处理
}
</script>

<style lang="scss" scoped>
.page-renderer {
  width: 100%;
}

// 轮播图
.pr-banner {
  padding: 0 24rpx 24rpx;

  &__swiper {
    border-radius: 16rpx;
    overflow: hidden;
  }

  &__image {
    width: 100%;
    height: 100%;
  }

  &__empty {
    background: #f5f5f5;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 28rpx;
  }
}

// 公告栏
.pr-notice {
  padding: 0 24rpx;
  margin-bottom: 20rpx;

  &__inner {
    padding: 16rpx 24rpx;
    background: #fff7e6;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
  }

  &__text {
    margin-left: 12rpx;
    font-size: 26rpx;
    color: #d48806;
    flex: 1;
  }
}

// 金刚区
.pr-nav-grid {
  padding: 0 24rpx 24rpx;
  background: #fff;

  &__inner {
    display: grid;
    gap: 24rpx;
  }

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16rpx 0;
  }

  &__icon {
    font-size: 48rpx;
    margin-bottom: 8rpx;
  }

  &__text {
    font-size: 24rpx;
    color: #333;
  }
}

// 区块标题
.pr-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0 16rpx;

  &__title {
    display: flex;
    align-items: center;
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
  }

  &__icon {
    margin-right: 8rpx;
  }

  &__more {
    display: flex;
    align-items: center;
    font-size: 24rpx;
    color: #999;
  }
}

// 热销商品
.pr-hot-products {
  padding: 0 24rpx;
  background: #fff;
  margin-bottom: 20rpx;

  &__list {
    white-space: nowrap;
    padding-bottom: 24rpx;
  }

  &__item {
    display: inline-block;
    width: 200rpx;
    margin-right: 20rpx;
    position: relative;
    vertical-align: top;
  }

  &__rank {
    position: absolute;
    top: 8rpx;
    left: 8rpx;
    width: 36rpx;
    height: 36rpx;
    background: linear-gradient(135deg, #ff6b35, #ff9500);
    color: #fff;
    font-size: 22rpx;
    font-weight: 600;
    border-radius: 8rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }

  &__image {
    width: 200rpx;
    height: 200rpx;
    border-radius: 12rpx;
  }

  &__name {
    display: block;
    font-size: 26rpx;
    color: #333;
    margin-top: 12rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__price {
    display: block;
    font-size: 28rpx;
    color: #ff6b35;
    font-weight: 600;
    margin-top: 4rpx;
  }
}

// 新品推荐
.pr-new-products {
  padding: 0 24rpx;
  background: #fff;
  margin-bottom: 20rpx;

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20rpx;
    padding-bottom: 24rpx;
  }

  &__item {
    background: #f9f9f9;
    border-radius: 12rpx;
    overflow: hidden;
  }

  &__image-wrap {
    position: relative;
  }

  &__image {
    width: 100%;
    height: 240rpx;
  }

  &__badge {
    position: absolute;
    top: 12rpx;
    left: 12rpx;
    padding: 4rpx 12rpx;
    background: linear-gradient(135deg, #ff6b35, #ff9500);
    color: #fff;
    font-size: 20rpx;
    border-radius: 6rpx;
  }

  &__name {
    display: block;
    padding: 12rpx 16rpx 0;
    font-size: 26rpx;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__price {
    display: block;
    padding: 4rpx 16rpx 16rpx;
    font-size: 28rpx;
    color: #ff6b35;
    font-weight: 600;
  }
}

// 优惠券
.pr-coupon {
  padding: 0 24rpx 24rpx;

  &__list {
    white-space: nowrap;
  }

  &__item {
    display: inline-flex;
    align-items: center;
    width: 320rpx;
    height: 120rpx;
    margin-right: 16rpx;
    background: linear-gradient(135deg, #ff6b35, #ff9500);
    border-radius: 12rpx;
    padding: 0 20rpx;
    color: #fff;
  }

  &__value {
    display: flex;
    align-items: baseline;
  }

  &__currency {
    font-size: 24rpx;
  }

  &__amount {
    font-size: 48rpx;
    font-weight: 600;
    margin-left: 4rpx;
  }

  &__info {
    flex: 1;
    margin-left: 16rpx;
  }

  &__name {
    display: block;
    font-size: 24rpx;
    font-weight: 500;
  }

  &__condition {
    display: block;
    font-size: 20rpx;
    opacity: 0.8;
    margin-top: 4rpx;
  }

  &__btn {
    padding: 8rpx 20rpx;
    background: rgba(255,255,255,0.3);
    border-radius: 24rpx;
    font-size: 22rpx;
  }
}

// 单图广告
.pr-image {
  padding: 0 24rpx 24rpx;

  &__img {
    width: 100%;
    border-radius: 12rpx;
  }
}

// 分隔符
.pr-spacer {
  width: 100%;
}

// 商品列表
.pr-product-list {
  padding: 0 24rpx;
  background: #fff;
  margin-bottom: 20rpx;

  &__item {
    display: flex;
    padding: 24rpx 0;
    border-bottom: 1rpx solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }
  }

  &__image {
    width: 160rpx;
    height: 160rpx;
    border-radius: 12rpx;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    margin-left: 20rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  &__name {
    font-size: 28rpx;
    color: #333;
    font-weight: 500;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__desc {
    font-size: 24rpx;
    color: #999;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-top: 8rpx;
  }

  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12rpx;
  }

  &__price {
    font-size: 32rpx;
    color: #ff6b35;
    font-weight: 600;
  }

  &__btn {
    width: 48rpx;
    height: 48rpx;
    background: linear-gradient(135deg, #ff6b35, #ff9500);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 32rpx;
  }
}

// 商品网格
.pr-product-grid {
  padding: 0 24rpx;
  background: #fff;
  margin-bottom: 20rpx;

  &__inner {
    display: grid;
    gap: 20rpx;
    padding-bottom: 24rpx;
  }

  &__item {
    background: #f9f9f9;
    border-radius: 12rpx;
    overflow: hidden;
  }

  &__image {
    width: 100%;
    height: 240rpx;
  }

  &__name {
    display: block;
    padding: 12rpx 16rpx 0;
    font-size: 26rpx;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8rpx 16rpx 16rpx;
  }

  &__price {
    font-size: 28rpx;
    color: #ff6b35;
    font-weight: 600;
  }

  &__btn {
    width: 44rpx;
    height: 44rpx;
    background: linear-gradient(135deg, #ff6b35, #ff9500);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 28rpx;
  }
}

// 搜索模块
.pr-search {
  padding: 0 24rpx 24rpx;
  
  &__inner {
    display: flex;
    align-items: center;
    padding: 16rpx 24rpx;
    border-radius: 32rpx;
  }
  
  &__placeholder {
    margin-left: 12rpx;
    font-size: 28rpx;
    color: #999;
  }
}

// 门店标题
.pr-store-title {
  padding: 24rpx;
  background: #fff;
  margin-bottom: 20rpx;
  
  &__main {
    display: flex;
    align-items: center;
  }
  
  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
  }
  
  &__status {
    margin-left: 12rpx;
    padding: 4rpx 12rpx;
    background: #52c41a;
    color: #fff;
    font-size: 20rpx;
    border-radius: 8rpx;
  }
  
  &__distance {
    display: flex;
    align-items: center;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #999;
  }
}

// 购物车悬浮按钮
.pr-cart-float {
  position: fixed;
  right: 30rpx;
  bottom: 200rpx;
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #ff6b35, #ff9500);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(255, 107, 53, 0.4);
  z-index: 100;
  
  &__badge {
    position: absolute;
    top: 0;
    right: 0;
    min-width: 36rpx;
    height: 36rpx;
    padding: 0 8rpx;
    background: #ff4d4f;
    color: #fff;
    font-size: 22rpx;
    border-radius: 18rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

// 文本元素
.pr-text {
  padding: 0 24rpx;
}

// 自由容器
.pr-free-container {
  position: relative;
  background-size: cover;
  background-position: center;
}

// 会员信息
.pr-user-info {
  padding: 24rpx;
  background: linear-gradient(135deg, #ff6b35, #ff9500);
  margin: 0 24rpx 20rpx;
  border-radius: 16rpx;
  color: #fff;
  
  &__main {
    display: flex;
    align-items: center;
  }
  
  &__avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    border: 4rpx solid rgba(255,255,255,0.3);
  }
  
  &__content {
    margin-left: 20rpx;
  }
  
  &__name {
    font-size: 32rpx;
    font-weight: 600;
  }
  
  &__level {
    margin-top: 8rpx;
  }
  
  &__badge {
    padding: 4rpx 12rpx;
    background: rgba(255,255,255,0.2);
    border-radius: 8rpx;
    font-size: 22rpx;
  }
  
  &__stats {
    display: flex;
    justify-content: space-around;
    margin-top: 24rpx;
    padding-top: 24rpx;
    border-top: 1rpx solid rgba(255,255,255,0.2);
  }
  
  &__stat {
    text-align: center;
  }
  
  &__stat-value {
    display: block;
    font-size: 36rpx;
    font-weight: 600;
  }
  
  &__stat-label {
    display: block;
    font-size: 22rpx;
    opacity: 0.8;
    margin-top: 4rpx;
  }
}

// 功能入口
.pr-func-entry {
  padding: 0 24rpx 24rpx;
  background: #fff;
  
  &__inner {
    display: grid;
    gap: 24rpx;
  }
  
  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16rpx 0;
  }
  
  &__icon {
    font-size: 40rpx;
    margin-bottom: 8rpx;
  }
  
  &__text {
    font-size: 24rpx;
    color: #333;
  }
}

// 焦点入口
.pr-focus-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 24rpx 20rpx;
  padding: 24rpx 32rpx;
  border-radius: 12rpx;
  color: #fff;
  
  &__icon {
    font-size: 36rpx;
    margin-right: 12rpx;
  }
  
  &__text {
    font-size: 32rpx;
    font-weight: 600;
  }
}

// 集点卡
.pr-stamp-card {
  margin: 0 24rpx 20rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 16rpx;
  color: #fff;
  
  &__header {
    margin-bottom: 20rpx;
  }
  
  &__title {
    font-size: 32rpx;
    font-weight: 600;
  }
  
  &__subtitle {
    display: block;
    font-size: 24rpx;
    opacity: 0.8;
    margin-top: 4rpx;
  }
  
  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
  }
  
  &__point {
    width: 56rpx;
    height: 56rpx;
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24rpx;
    
    &--active {
      background: #fff;
      color: #667eea;
    }
  }
}

// 储值余额入口
.pr-balance-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 24rpx 20rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 12rpx;
  
  &__label {
    font-size: 26rpx;
    color: #666;
  }
  
  &__value {
    display: block;
    font-size: 40rpx;
    font-weight: 600;
    color: #ff6b35;
    margin-top: 8rpx;
  }
  
  &__btn {
    padding: 12rpx 24rpx;
    background: linear-gradient(135deg, #ff6b35, #ff9500);
    color: #fff;
    font-size: 26rpx;
    border-radius: 24rpx;
  }
}

// 积分入口
.pr-points-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 24rpx 20rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 12rpx;
  
  &__label {
    font-size: 26rpx;
    color: #666;
  }
  
  &__value {
    display: block;
    font-size: 40rpx;
    font-weight: 600;
    color: #ff6b35;
    margin-top: 8rpx;
  }
  
  &__btn {
    padding: 12rpx 24rpx;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #fff;
    font-size: 26rpx;
    border-radius: 24rpx;
  }
}

// 客服入口
.pr-service-entry {
  padding: 0 24rpx 24rpx;
  
  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20rpx;
    background: #fff;
    border: 2rpx solid #ff6b35;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #ff6b35;
    
    text {
      margin-left: 8rpx;
    }
  }
}

// 门店列表
.pr-store-list {
  padding: 0 24rpx;
  background: #fff;
  margin-bottom: 20rpx;
  
  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  &__name {
    font-size: 28rpx;
    color: #333;
    font-weight: 500;
  }
  
  &__address {
    display: block;
    font-size: 24rpx;
    color: #999;
    margin-top: 8rpx;
  }
  
  &__distance {
    font-size: 24rpx;
    color: #999;
  }
}

// 套餐推广
.pr-combo-promo {
  padding: 0 24rpx;
  background: #fff;
  margin-bottom: 20rpx;
  
  &__list {
    white-space: nowrap;
    padding-bottom: 24rpx;
  }
  
  &__item {
    display: inline-block;
    width: 200rpx;
    margin-right: 20rpx;
    vertical-align: top;
  }
  
  &__image {
    width: 200rpx;
    height: 200rpx;
    border-radius: 12rpx;
  }
  
  &__name {
    display: block;
    font-size: 26rpx;
    color: #333;
    margin-top: 12rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  &__price {
    display: block;
    font-size: 28rpx;
    color: #ff6b35;
    font-weight: 600;
    margin-top: 4rpx;
  }
}

// 充值选项
.pr-recharge-options {
  padding: 0 24rpx 24rpx;
  
  &__grid {
    display: grid;
    gap: 20rpx;
  }
  
  &__item {
    padding: 24rpx;
    background: #f9f9f9;
    border: 2rpx solid transparent;
    border-radius: 12rpx;
    text-align: center;
    
    &--selected {
      background: #fff5f0;
      border-color: #ff6b35;
    }
  }
  
  &__amount {
    display: block;
    font-size: 40rpx;
    font-weight: 600;
    color: #333;
  }
  
  &__gift {
    display: block;
    font-size: 24rpx;
    color: #ff6b35;
    margin-top: 8rpx;
  }
}

// 充值按钮
.pr-recharge-button {
  margin: 0 24rpx 24rpx;
  padding: 28rpx;
  border-radius: 48rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
}

// 营销模块
.pr-promotion {
  padding: 0 24rpx;
  background: #fff;
  margin-bottom: 20rpx;
  
  &__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16rpx;
    padding-bottom: 24rpx;
  }
  
  &__item {
    border-radius: 12rpx;
    overflow: hidden;
  }
  
  &__image {
    width: 100%;
    height: 160rpx;
  }
}

// 未知组件
.pr-unknown {
  padding: 24rpx;
  background: #f5f5f5;
  text-align: center;
  font-size: 24rpx;
  color: #999;
}
</style>
