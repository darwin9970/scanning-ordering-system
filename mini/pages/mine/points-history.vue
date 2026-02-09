<template>
  <view class="page-points-history">
    <!-- 统计卡片 -->
    <view class="stats-card">
      <view class="stats-card__item">
        <text class="stats-card__label">累计获得</text>
        <text class="stats-card__value stats-card__value--positive">+{{ totalEarned }}</text>
      </view>
      <view class="stats-card__divider" />
      <view class="stats-card__item">
        <text class="stats-card__label">累计使用</text>
        <text class="stats-card__value stats-card__value--negative">
          {{ totalUsed }}
        </text>
      </view>
      <view class="stats-card__divider" />
      <view class="stats-card__item">
        <text class="stats-card__label">当前积分</text>
        <text class="stats-card__value stats-card__value--current">
          {{ currentPoints }}
        </text>
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <view
        v-for="tab in filterTabs"
        :key="tab.value"
        class="filter-tabs__item"
        :class="{ 'filter-tabs__item--active': activeFilter === tab.value }"
        @tap="switchFilter(tab.value)"
      >
        {{ tab.label }}
      </view>
    </view>

    <!-- 积分记录列表 -->
    <q-skeleton :loading="loading" :rows="5">
      <q-empty
        v-if="filteredLogs.length === 0 && !loading"
        type="list"
        text="暂无积分记录"
        tip="消费或使用积分后会有记录哦~"
      />

      <view v-else class="points-list">
        <view v-for="log in filteredLogs" :key="log.id" class="points-item">
          <view class="points-item__icon">
            <uni-icons :type="getLogIcon(log.change)" :size="24" :color="getLogColor(log.change)" />
          </view>
          <view class="points-item__content">
            <text class="points-item__reason">
              {{ log.reason }}
            </text>
            <text class="points-item__time">
              {{ formatTime(log.createdAt) }}
            </text>
            <text v-if="log.orderNo" class="points-item__order">订单号: {{ log.orderNo }}</text>
          </view>
          <view class="points-item__change" :class="getChangeClass(log.change)">
            {{ log.change > 0 ? '+' : '' }}{{ log.change }}
          </view>
        </view>
      </view>
    </q-skeleton>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTableStore } from '@/store/table'
import { getPointsHistory } from '@/api'
import QSkeleton from '@/components/q-skeleton/q-skeleton.vue'
import QEmpty from '@/components/q-empty/q-empty.vue'

const tableStore = useTableStore()

// 加载状态
const loading = ref(false)

// 积分记录
const pointsLogs = ref([])

// 当前积分
const currentPoints = ref(0)

// 筛选标签
const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '获得', value: 'earn' },
  { label: '使用', value: 'use' }
]

// 当前筛选
const activeFilter = ref('all')

// 筛选后的记录
const filteredLogs = computed(() => {
  if (activeFilter.value === 'all') {
    return pointsLogs.value
  } else if (activeFilter.value === 'earn') {
    return pointsLogs.value.filter((log) => log.change > 0)
  } else {
    return pointsLogs.value.filter((log) => log.change < 0)
  }
})

// 累计获得
const totalEarned = computed(() => {
  return pointsLogs.value.filter((log) => log.change > 0).reduce((sum, log) => sum + log.change, 0)
})

// 累计使用
const totalUsed = computed(() => {
  return Math.abs(
    pointsLogs.value.filter((log) => log.change < 0).reduce((sum, log) => sum + log.change, 0)
  )
})

// 切换筛选
const switchFilter = (value) => {
  activeFilter.value = value
}

// 获取记录图标
const getLogIcon = (change) => {
  return change > 0 ? 'plus-filled' : 'minus-filled'
}

// 获取记录颜色
const getLogColor = (change) => {
  return change > 0 ? '#52C41A' : '#FF4D4F'
}

// 获取变化样式类
const getChangeClass = (change) => {
  return {
    'points-item__change--positive': change > 0,
    'points-item__change--negative': change < 0
  }
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes <= 0 ? '刚刚' : `${minutes}分钟前`
    }
    return `${hours}小时前`
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
}

// 加载积分记录
const loadPointsHistory = async () => {
  if (!tableStore.store?.id) {
    uni.showToast({
      title: '请先选择门店',
      icon: 'none'
    })
    return
  }

  loading.value = true

  try {
    const res = await getPointsHistory({
      storeId: tableStore.store.id
    })

    if (res.success) {
      pointsLogs.value = res.data.logs || []
      currentPoints.value = res.data.currentPoints || 0
    }
  } catch (error) {
    console.error('加载积分记录失败:', error)
    uni.showToast({
      title: '加载失败，请重试',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPointsHistory()
})
</script>

<style lang="scss" scoped>
.page-points-history {
  min-height: 100vh;
  background: $bg-page;
  padding-bottom: 40rpx;
}

// 统计卡片
.stats-card {
  display: flex;
  align-items: center;
  margin: 24rpx;
  padding: 32rpx;
  background: $bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__label {
    font-size: $font-size-sm;
    color: $text-secondary;
    margin-bottom: 12rpx;
  }

  &__value {
    font-size: $font-size-xl;
    font-weight: $font-weight-bold;
    line-height: 1;

    &--positive {
      color: #52c41a;
    }

    &--negative {
      color: #ff4d4f;
    }

    &--current {
      color: $primary;
    }
  }

  &__divider {
    width: 1rpx;
    height: 60rpx;
    background: $border-lighter;
    margin: 0 24rpx;
  }
}

// 筛选标签
.filter-tabs {
  display: flex;
  padding: 0 24rpx;
  margin-bottom: 20rpx;
  gap: 16rpx;

  &__item {
    padding: 12rpx 24rpx;
    background: $bg-card;
    border-radius: $radius-base;
    font-size: $font-size-base;
    color: $text-secondary;
    transition: all $duration-fast $ease-out;

    &--active {
      background: $primary;
      color: #ffffff;
      font-weight: $font-weight-medium;
    }
  }
}

// 积分记录列表
.points-list {
  padding: 0 24rpx;
}

.points-item {
  display: flex;
  align-items: flex-start;
  padding: 24rpx;
  margin-bottom: 16rpx;
  background: $bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;

  &__icon {
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: $bg-grey;
    border-radius: $radius-full;
    margin-right: 20rpx;
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__reason {
    font-size: $font-size-base;
    font-weight: $font-weight-medium;
    color: $text-primary;
    margin-bottom: 8rpx;
  }

  &__time {
    font-size: $font-size-sm;
    color: $text-tertiary;
    margin-bottom: 4rpx;
  }

  &__order {
    font-size: $font-size-xs;
    color: $text-tertiary;
  }

  &__change {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    line-height: 1;

    &--positive {
      color: #52c41a;
    }

    &--negative {
      color: #ff4d4f;
    }
  }
}
</style>
