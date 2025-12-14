<template>
  <view v-if="visible" class="q-toast" :class="[`q-toast--${type}`, { 'q-toast--show': show }]">
    <view class="q-toast__content">
      <uni-icons 
        v-if="icon" 
        :type="icon" 
        :size="iconSize" 
        :color="iconColor"
        class="q-toast__icon"
      />
      <text class="q-toast__text">{{ message }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  // 消息内容
  message: {
    type: String,
    default: ''
  },
  // 类型: success, error, warning, info
  type: {
    type: String,
    default: 'info'
  },
  // 显示时长（毫秒）
  duration: {
    type: Number,
    default: 2000
  },
  // 是否显示图标
  showIcon: {
    type: Boolean,
    default: true
  }
})

const visible = ref(false)
const show = ref(false)

// 图标映射
const iconMap = {
  success: 'checkmarkempty',
  error: 'closeempty',
  warning: 'info',
  info: 'info'
}

const icon = computed(() => {
  if (!props.showIcon) return ''
  return iconMap[props.type] || 'info'
})

const iconSize = computed(() => {
  return props.type === 'success' ? 20 : 18
})

const iconColor = computed(() => {
  const colorMap = {
    success: '#52C41A',
    error: '#FF4D4F',
    warning: '#FAAD14',
    info: '#1890FF'
  }
  return colorMap[props.type] || '#1890FF'
})

// 显示 toast
const showToast = () => {
  visible.value = true
  setTimeout(() => {
    show.value = true
  }, 50)
  
  setTimeout(() => {
    hideToast()
  }, props.duration)
}

// 隐藏 toast
const hideToast = () => {
  show.value = false
  setTimeout(() => {
    visible.value = false
  }, 300)
}

// 监听 message 变化
watch(() => props.message, (newVal) => {
  if (newVal) {
    showToast()
  }
}, { immediate: true })

onMounted(() => {
  if (props.message) {
    showToast()
  }
})

defineExpose({
  show: showToast,
  hide: hideToast
})
</script>

<style lang="scss" scoped>
.q-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: $z-index-toast;
  opacity: 0;
  transition: opacity 0.3s $ease-out;
  
  &--show {
    opacity: 1;
  }
  
  &__content {
    display: flex;
    align-items: center;
    padding: 24rpx 32rpx;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(10rpx);
    border-radius: $radius-lg;
    min-width: 200rpx;
    max-width: 600rpx;
    box-shadow: $shadow-md;
  }
  
  &__icon {
    margin-right: 12rpx;
    flex-shrink: 0;
  }
  
  &__text {
    font-size: $font-size-base;
    color: #FFFFFF;
    line-height: 1.5;
  }
  
  // 类型样式
  &--success {
    .q-toast__content {
      background: rgba(82, 196, 26, 0.9);
    }
  }
  
  &--error {
    .q-toast__content {
      background: rgba(255, 77, 79, 0.9);
    }
  }
  
  &--warning {
    .q-toast__content {
      background: rgba(250, 173, 20, 0.9);
    }
  }
  
  &--info {
    .q-toast__content {
      background: rgba(24, 144, 255, 0.9);
    }
  }
}
</style>

