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

      <!-- 分隔符 -->
      <view 
        v-else-if="comp.type === 'SPACER'" 
        class="pr-spacer"
        :style="{ 
          height: (comp.props.height || 20) + 'px',
          backgroundColor: comp.props.backgroundColor || '#f5f5f5'
        }"
      />
    </template>
  </view>
</template>

<script setup>
import { computed } from 'vue'

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
  }
})

const emit = defineEmits(['bannerClick', 'navClick', 'productClick', 'couponClick'])

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
</style>
