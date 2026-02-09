<template>
  <view class="page-member">
    <!-- 如果已配置页面布局，显示配置的布局 -->
    <template v-if="pageComponents.length > 0 && useCustomLayout">
      <page-renderer
        :components="pageComponents"
        :member-info="memberInfo"
        :coupon-count="couponCount"
        :benefits="benefits"
        :progress-percent="progressPercent"
        :progress-text="progressText"
        @nav-click="handleNavClick"
      />
    </template>

    <!-- 默认布局（未配置时显示） -->
    <template v-else>
      <!-- 会员卡 -->
      <view class="member-card">
        <view class="member-card__header">
          <view class="member-card__level">
            <uni-icons type="vip" size="24" color="#FAAD14" />
            <text class="member-card__level-name">
              {{ memberInfo.levelName }}
            </text>
          </view>
          <text class="member-card__id">会员号: {{ memberInfo.memberNo }}</text>
        </view>

        <view class="member-card__points">
          <text class="member-card__points-value">
            {{ memberInfo.points }}
          </text>
          <text class="member-card__points-label">当前积分</text>
        </view>

        <view class="member-card__progress">
          <view class="member-card__progress-bar">
            <view class="member-card__progress-fill" :style="{ width: progressPercent + '%' }" />
          </view>
          <text class="member-card__progress-text">
            {{ progressText }}
          </text>
        </view>
      </view>

      <!-- 功能入口 -->
      <view class="entry-grid">
        <view class="entry-item" @tap="goToCoupons">
          <view class="entry-item__icon">
            <uni-icons type="gift" size="28" color="#FF6B35" />
          </view>
          <text class="entry-item__label">我的优惠券</text>
          <text class="entry-item__value">{{ couponCount }}张</text>
        </view>

        <view class="entry-item" @tap="showPointsRule">
          <view class="entry-item__icon">
            <uni-icons type="star" size="28" color="#FAAD14" />
          </view>
          <text class="entry-item__label">积分规则</text>
        </view>

        <view class="entry-item" @tap="goToPointsHistory">
          <view class="entry-item__icon">
            <uni-icons type="list" size="28" color="#1890FF" />
          </view>
          <text class="entry-item__label">积分明细</text>
        </view>

        <view class="entry-item" @tap="showLevelRule">
          <view class="entry-item__icon">
            <uni-icons type="flag" size="28" color="#52C41A" />
          </view>
          <text class="entry-item__label">等级权益</text>
        </view>
      </view>

      <!-- 会员权益 -->
      <view class="benefits">
        <view class="benefits__title">
          <text>会员权益</text>
        </view>

        <view class="benefits__list">
          <view v-for="benefit in benefits" :key="benefit.id" class="benefit-item">
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
            <view v-else class="benefit-item__status">{{ benefit.unlockLevel }}解锁</view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTableStore } from '@/store/table'
import { getMemberProfile, getPageConfig } from '@/api'

const tableStore = useTableStore()

// 页面配置
const pageComponents = ref([])
const useCustomLayout = ref(false)

// 会员信息
const memberInfo = ref({
  memberNo: '10001234',
  levelName: '黄金会员',
  level: 2,
  points: 1280,
  totalSpent: 2580,
  nextLevelName: '钻石会员',
  nextLevelAmount: 420,
  currentLevelMin: 2000, // 当前等级最低消费
  nextLevelMin: 3000 // 下一等级最低消费
})

// 优惠券数量
const couponCount = ref(3)

// 进度百分比
const progressPercent = computed(() => {
  const current = memberInfo.value.totalSpent
  const currentMin = memberInfo.value.currentLevelMin || 0
  const nextMin = memberInfo.value.nextLevelMin || currentMin + 1000

  if (current >= nextMin) return 100
  if (current <= currentMin) return 0

  const range = nextMin - currentMin
  const progress = current - currentMin
  return Math.min(100, Math.max(0, (progress / range) * 100))
})

// 进度文字
const progressText = computed(() => {
  const current = memberInfo.value.totalSpent
  const nextMin = memberInfo.value.nextLevelMin || current + 1000
  const remaining = nextMin - current

  if (remaining <= 0) {
    return `已达到${memberInfo.value.nextLevelName}等级`
  }
  return `再消费 ¥${remaining} 升级${memberInfo.value.nextLevelName}`
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

// 加载页面配置
const loadPageConfig = async () => {
  try {
    const storeId = uni.getStorageSync('storeId')
    if (!storeId) {
      console.log('storeId不存在，跳过加载页面配置')
      return
    }
    console.log('加载会员中心配置, storeId:', storeId)
    const res = await getPageConfig({
      storeId,
      pageType: 'MEMBER'
    })
    console.log('会员中心配置响应:', res)
    if (res.code === 200 && res.data) {
      pageComponents.value = res.data.components || []
      useCustomLayout.value = !res.data.isDefault && pageComponents.value.length > 0
      console.log('会员中心组件:', pageComponents.value)
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
      // 更新会员信息
      memberInfo.value = {
        ...memberInfo.value,
        ...res.data
      }
    }
  } catch (error) {
    console.error('加载会员信息失败:', error)
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
    case 'coupons':
      goToCoupons()
      break
    case 'points':
      goToPointsHistory()
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
      loadMemberInfo()
    }
  },
  { immediate: true }
)

// 页面加载
onMounted(() => {
  const storeId = uni.getStorageSync('storeId')
  if (storeId) {
    loadPageConfig()
    loadMemberInfo()
  }
})

// 跳转优惠券
const goToCoupons = () => {
  uni.navigateTo({
    url: '/pages/mine/coupons'
  })
}

// 积分明细
const goToPointsHistory = () => {
  uni.navigateTo({
    url: '/pages/mine/points-history'
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
    content:
      '普通会员: 注册即可\n黄金会员: 累计消费500元\n钻石会员: 累计消费3000元\n至尊会员: 累计消费10000元',
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
  background: linear-gradient(135deg, #2d2d2d, #1a1a1a);
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
    color: #faad14;
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
    color: #ffffff;
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
    background: linear-gradient(90deg, #faad14, #ffc53d);
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
