<template>
  <view class="page-member">
    <!-- 会员卡 -->
    <view class="member-card">
      <view class="member-card__header">
        <view class="member-card__level">
          <uni-icons type="vip" size="24" color="#FAAD14" />
          <text class="member-card__level-name">
            {{ memberInfo.levelName }}
          </text>
        </view>
        <text class="member-card__id">
          会员号: {{ memberInfo.memberNo }}
        </text>
      </view>

      <view class="member-card__points">
        <text class="member-card__points-value">
          {{ memberInfo.points }}
        </text>
        <text class="member-card__points-label">
          当前积分
        </text>
      </view>

      <view class="member-card__progress">
        <view class="member-card__progress-bar">
          <view
            class="member-card__progress-fill"
            :style="{ width: progressPercent + '%' }"
          />
        </view>
        <text class="member-card__progress-text">
          再消费 {{ memberInfo.nextLevelAmount }}元升级{{ memberInfo.nextLevelName }}
        </text>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="entry-grid">
      <view class="entry-item" @tap="goToCoupons">
        <view class="entry-item__icon">
          <uni-icons type="gift" size="28" color="#FF6B35" />
        </view>
        <text class="entry-item__label">
          我的优惠券
        </text>
        <text class="entry-item__value">
          {{ couponCount }}张
        </text>
      </view>

      <view class="entry-item" @tap="showPointsRule">
        <view class="entry-item__icon">
          <uni-icons type="star" size="28" color="#FAAD14" />
        </view>
        <text class="entry-item__label">
          积分规则
        </text>
      </view>

      <view class="entry-item" @tap="goToPointsHistory">
        <view class="entry-item__icon">
          <uni-icons type="list" size="28" color="#1890FF" />
        </view>
        <text class="entry-item__label">
          积分明细
        </text>
      </view>

      <view class="entry-item" @tap="showLevelRule">
        <view class="entry-item__icon">
          <uni-icons type="flag" size="28" color="#52C41A" />
        </view>
        <text class="entry-item__label">
          等级权益
        </text>
      </view>
    </view>

    <!-- 会员权益 -->
    <view class="benefits">
      <view class="benefits__title">
        <text>会员权益</text>
      </view>

      <view class="benefits__list">
        <view
          v-for="benefit in benefits"
          :key="benefit.id"
          class="benefit-item"
        >
          <view class="benefit-item__icon">
            <uni-icons :type="benefit.icon" size="24" :color="benefit.color" />
          </view>
          <view class="benefit-item__content">
            <text class="benefit-item__name">
              {{ benefit.name }}
            </text>
            <text class="benefit-item__desc">
              {{ benefit.desc }}
            </text>
          </view>
          <view
            v-if="benefit.unlocked"
            class="benefit-item__status benefit-item__status--unlocked"
          >
            已解锁
          </view>
          <view v-else class="benefit-item__status">
            {{ benefit.unlockLevel }}解锁
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

// 会员信息
const memberInfo = ref({
  memberNo: '10001234',
  levelName: '黄金会员',
  points: 1280,
  totalSpent: 2580,
  nextLevelName: '钻石会员',
  nextLevelAmount: 420
})

// 优惠券数量
const couponCount = ref(3)

// 进度百分比
const progressPercent = computed(() => {
  const current = memberInfo.value.totalSpent
  const next = current + memberInfo.value.nextLevelAmount
  return Math.min(100, (current / next) * 100)
})

// 会员权益列表
const benefits = ref([
  {
    id: 1,
    name: '生日特权',
    desc: '生日当月享双倍积分',
    icon: 'heart',
    color: '#FF6B35',
    unlocked: true
  },
  {
    id: 2,
    name: '专属折扣',
    desc: '部分商品享会员专属价',
    icon: 'cart',
    color: '#FAAD14',
    unlocked: true
  },
  {
    id: 3,
    name: '优先服务',
    desc: '高峰期优先安排座位',
    icon: 'star',
    color: '#1890FF',
    unlocked: false,
    unlockLevel: '钻石会员'
  },
  {
    id: 4,
    name: '免费菜品',
    desc: '每月赠送精选菜品一份',
    icon: 'gift',
    color: '#52C41A',
    unlocked: false,
    unlockLevel: '至尊会员'
  }
])

// 跳转优惠券
const goToCoupons = () => {
  uni.navigateTo({
    url: '/pages/mine/coupons'
  })
}

// 积分明细
const goToPointsHistory = () => {
  uni.showToast({
    title: '功能开发中',
    icon: 'none'
  })
}

// 积分规则
const showPointsRule = () => {
  uni.showModal({
    title: '积分规则',
    content: '消费1元=1积分\n100积分=1元抵扣\n积分有效期1年',
    showCancel: false
  })
}

// 等级权益
const showLevelRule = () => {
  uni.showModal({
    title: '会员等级',
    content: '普通会员: 注册即可\n黄金会员: 累计消费500元\n钻石会员: 累计消费3000元\n至尊会员: 累计消费10000元',
    showCancel: false
  })
}
</script>

<style lang="scss" scoped>
.page-member {
  min-height: 100vh;
  background: $bg-page;
  padding-bottom: 40rpx;
}

.member-card {
  margin: 24rpx;
  padding: 32rpx;
  background: linear-gradient(135deg, #2D2D2D, #1A1A1A);
  border-radius: $radius-xl;
  box-shadow: $shadow-md;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32rpx;
  }

  &__level {
    display: flex;
    align-items: center;
  }

  &__level-name {
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    color: #FAAD14;
    margin-left: 8rpx;
  }

  &__id {
    font-size: $font-size-xs;
    color: rgba(255, 255, 255, 0.6);
  }

  &__points {
    text-align: center;
    margin-bottom: 32rpx;
  }

  &__points-value {
    font-size: 72rpx;
    font-weight: $font-weight-bold;
    color: #FFFFFF;
    line-height: 1;
  }

  &__points-label {
    font-size: $font-size-sm;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 8rpx;
  }

  &__progress {
    margin-top: 24rpx;
  }

  &__progress-bar {
    height: 8rpx;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4rpx;
    overflow: hidden;
  }

  &__progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #FAAD14, #FFC53D);
    border-radius: 4rpx;
    transition: width 0.3s;
  }

  &__progress-text {
    display: block;
    font-size: $font-size-xs;
    color: rgba(255, 255, 255, 0.6);
    text-align: center;
    margin-top: 12rpx;
  }
}

.entry-grid {
  display: flex;
  flex-wrap: wrap;
  margin: 0 24rpx 24rpx;
  background: $bg-card;
  border-radius: $radius-lg;
  padding: 24rpx 0;
}

.entry-item {
  width: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx;
  box-sizing: border-box;

  &__icon {
    width: 80rpx;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: $bg-grey;
    border-radius: 50%;
    margin-bottom: 16rpx;
  }

  &__label {
    font-size: $font-size-base;
    color: $text-primary;
  }

  &__value {
    font-size: $font-size-sm;
    color: $primary;
    margin-top: 4rpx;
  }
}

.benefits {
  margin: 0 24rpx;
  background: $bg-card;
  border-radius: $radius-lg;
  padding: 24rpx;

  &__title {
    margin-bottom: 24rpx;

    text {
      font-size: $font-size-md;
      font-weight: $font-weight-medium;
      color: $text-primary;
    }
  }
}

.benefit-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;

  &:not(:last-child) {
    border-bottom: 1rpx solid $border-lighter;
  }

  &__icon {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: $bg-grey;
    border-radius: $radius-md;
    margin-right: 20rpx;
  }

  &__content {
    flex: 1;
  }

  &__name {
    font-size: $font-size-base;
    color: $text-primary;
    display: block;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $text-tertiary;
    margin-top: 4rpx;
  }

  &__status {
    font-size: $font-size-sm;
    color: $text-tertiary;
    padding: 8rpx 16rpx;
    background: $bg-grey;
    border-radius: $radius-sm;

    &--unlocked {
      color: $success;
      background: $success-light;
    }
  }
}
</style>
