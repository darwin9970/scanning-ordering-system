<template>
  <view class="q-skeleton" :class="[`q-skeleton--${type}`, { 'q-skeleton--animated': animated }]">
    <view v-if="type === 'list'" class="q-skeleton__list">
      <view v-for="i in rows" :key="i" class="q-skeleton__row">
        <view v-for="j in cols" :key="j" class="q-skeleton__item" :style="{ width: itemWidth }" />
      </view>
    </view>

    <view v-else-if="type === 'card'" class="q-skeleton__card">
      <view class="q-skeleton__card-image" />
      <view class="q-skeleton__card-content">
        <view class="q-skeleton__card-line q-skeleton__card-line--title" />
        <view class="q-skeleton__card-line q-skeleton__card-line--text" />
        <view class="q-skeleton__card-line q-skeleton__card-line--text" />
      </view>
    </view>

    <view
      v-else-if="type === 'avatar'"
      class="q-skeleton__avatar"
      :style="{ width: size, height: size, borderRadius: round ? '50%' : $radius - base }"
    />

    <view
      v-else-if="type === 'text'"
      class="q-skeleton__text"
      :style="{ width: width, height: height }"
    />

    <view v-else class="q-skeleton__default" :style="{ width: width, height: height }" />
  </view>
</template>

<script setup>
defineProps({
  // 类型: list, card, avatar, text, default
  type: {
    type: String,
    default: 'default'
  },
  // 是否显示动画
  animated: {
    type: Boolean,
    default: true
  },
  // 列表行数
  rows: {
    type: Number,
    default: 3
  },
  // 列表列数
  cols: {
    type: Number,
    default: 2
  },
  // 列表项宽度
  itemWidth: {
    type: String,
    default: '48%'
  },
  // 宽度
  width: {
    type: String,
    default: '100%'
  },
  // 高度
  height: {
    type: String,
    default: '40rpx'
  },
  // 头像大小
  size: {
    type: String,
    default: '80rpx'
  },
  // 头像是否圆形
  round: {
    type: Boolean,
    default: true
  }
})
</script>

<style lang="scss" scoped>
.q-skeleton {
  &--animated {
    .q-skeleton__item,
    .q-skeleton__card-image,
    .q-skeleton__card-line,
    .q-skeleton__avatar,
    .q-skeleton__text,
    .q-skeleton__default {
      background: linear-gradient(90deg, $bg-grey 25%, lighten($bg-grey, 8%) 50%, $bg-grey 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
    }
  }

  &__list {
    padding: 24rpx;
  }

  &__row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 24rpx;
  }

  &__item {
    height: 200rpx;
    background: $bg-grey;
    border-radius: $radius-md;
  }

  &__card {
    display: flex;
    padding: 24rpx;
    background: $bg-card;
    border-radius: $radius-lg;
    margin-bottom: 20rpx;
  }

  &__card-image {
    width: 160rpx;
    height: 160rpx;
    background: $bg-grey;
    border-radius: $radius-md;
    flex-shrink: 0;
    margin-right: 20rpx;
  }

  &__card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  &__card-line {
    height: 32rpx;
    background: $bg-grey;
    border-radius: $radius-sm;
    margin-bottom: 16rpx;

    &--title {
      width: 60%;
      height: 40rpx;
    }

    &--text {
      width: 100%;
      height: 28rpx;

      &:last-child {
        width: 80%;
      }
    }
  }

  &__avatar {
    background: $bg-grey;
  }

  &__text {
    background: $bg-grey;
    border-radius: $radius-sm;
  }

  &__default {
    background: $bg-grey;
    border-radius: $radius-sm;
  }
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
