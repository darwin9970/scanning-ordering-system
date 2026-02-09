<template>
  <view class="q-swipe-action">
    <view
      class="q-swipe-action__content"
      :style="{ transform: `translateX(${translateX}px)` }"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <slot />
    </view>
    <view class="q-swipe-action__actions" :style="{ width: `${actionsWidth}px` }">
      <view
        v-for="(action, index) in actions"
        :key="index"
        class="q-swipe-action__action"
        :class="`q-swipe-action__action--${action.type || 'default'}`"
        :style="{ width: `${actionWidth}px` }"
        @tap="handleAction(action, $event)"
      >
        <uni-icons
          v-if="action.icon"
          :type="action.icon"
          :size="20"
          :color="action.color || '#FFFFFF'"
        />
        <text class="q-swipe-action__action-text">
          {{ action.text }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  // 操作按钮列表
  actions: {
    type: Array,
    default: () => []
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },
  // 阈值（px），超过此值才触发滑动
  threshold: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['action'])

// 每个操作按钮的宽度
const actionWidth = 80

// 操作区域总宽度
const actionsWidth = computed(() => props.actions.length * actionWidth)

// 当前偏移量
const translateX = ref(0)

// 触摸开始位置
const startX = ref(0)
const startY = ref(0)

// 是否正在滑动
const isSwiping = ref(false)

// 处理触摸开始
const handleTouchStart = (e) => {
  if (props.disabled) return

  const touch = e.touches[0]
  startX.value = touch.clientX
  startY.value = touch.clientY
  isSwiping.value = false
}

// 处理触摸移动
const handleTouchMove = (e) => {
  if (props.disabled) return

  const touch = e.touches[0]
  const deltaX = touch.clientX - startX.value
  const deltaY = touch.clientY - startY.value

  // 判断是否为横向滑动
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > props.threshold) {
    isSwiping.value = true
    e.preventDefault()

    // 限制滑动范围
    const maxTranslate = -actionsWidth.value
    const minTranslate = 0
    translateX.value = Math.max(maxTranslate, Math.min(minTranslate, deltaX))
  }
}

// 处理触摸结束
const handleTouchEnd = () => {
  if (props.disabled || !isSwiping.value) {
    translateX.value = 0
    return
  }

  // 判断是否超过一半，决定是否展开
  const halfWidth = actionsWidth.value / 2
  if (Math.abs(translateX.value) > halfWidth) {
    // 展开
    translateX.value = -actionsWidth.value
  } else {
    // 收起
    translateX.value = 0
  }

  isSwiping.value = false
}

// 处理操作按钮点击
const handleAction = (action, e) => {
  e.stopPropagation()
  emit('action', action)
  // 执行操作后收起
  translateX.value = 0
}

// 重置状态（外部调用）
const reset = () => {
  translateX.value = 0
  isSwiping.value = false
}

defineExpose({
  reset
})
</script>

<style lang="scss" scoped>
.q-swipe-action {
  position: relative;
  overflow: hidden;
  background: $bg-card;

  &__content {
    position: relative;
    z-index: 2;
    background: $bg-card;
    transition: transform 0.3s $ease-out;
  }

  &__actions {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    z-index: 1;
  }

  &__action {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: $font-size-sm;

    &--default {
      background: $text-secondary;
    }

    &--danger {
      background: $error;
    }

    &--primary {
      background: $primary;
    }

    &--warning {
      background: $warning;
    }

    &-text {
      margin-top: 4rpx;
    }
  }
}
</style>
