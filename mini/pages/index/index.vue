<template>
  <view class="page-index">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }" />
    
    <!-- Logo -->
    <image 
      class="page-index__logo" 
      src="/static/images/logo.png" 
      mode="aspectFill"
    />
    
    <!-- 标题 -->
    <text class="page-index__title">
      欢迎光临
    </text>
    <text class="page-index__subtitle">
      扫码开始点餐吧~
    </text>
    
    <!-- 扫码区域 -->
    <view class="page-index__scan-area">
      <view class="scan-animation">
        <view class="scan-animation__border" />
        <view class="scan-animation__line" />
        <uni-icons type="scan" size="80" color="#FF6B35" />
      </view>
    </view>
    
    <!-- 扫码按钮 -->
    <q-button 
      class="page-index__scan-btn" 
      type="primary" 
      size="large"
      @click="handleScan"
    >
      扫码点餐
    </q-button>
    
    <!-- 手动输入 -->
    <view class="page-index__manual" @tap="showManualInput = true">
      <text>手动输入桌台号</text>
      <uni-icons type="right" size="14" color="#999999" />
    </view>
    
    <!-- 手动输入弹窗 -->
    <uni-popup ref="manualPopup" type="center" :mask-click="true">
      <view class="manual-popup">
        <text class="manual-popup__title">
          输入桌台号
        </text>
        <view class="manual-popup__input-wrap">
          <input 
            v-model="manualInput.storeId"
            class="manual-popup__input" 
            type="number"
            placeholder="门店ID"
          >
          <input 
            v-model="manualInput.tableNo"
            class="manual-popup__input" 
            placeholder="桌台号 (如 A01)"
          >
        </view>
        <view class="manual-popup__btns">
          <q-button type="secondary" @click="closeManualPopup">
            取消
          </q-button>
          <q-button type="primary" @click="handleManualSubmit">
            确定
          </q-button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useTableStore } from '@/store/table'

const tableStore = useTableStore()

// 状态栏高度
const statusBarHeight = ref(20)

// 手动输入弹窗
const manualPopup = ref(null)
const showManualInput = ref(false)
const manualInput = reactive({
  storeId: '',
  tableNo: ''
})

// 获取系统信息
uni.getSystemInfo({
  success: (res) => {
    statusBarHeight.value = res.statusBarHeight || 20
  }
})

// 扫码
const handleScan = () => {
  // #ifdef MP-WEIXIN
  uni.scanCode({
    onlyFromCamera: false,
    scanType: ['qrCode'],
    success: (res) => {
      console.log('扫码结果:', res.result)
      parseQRCode(res.result)
    },
    fail: (err) => {
      console.error('扫码失败:', err)
      // 开发环境使用模拟数据
      if (process.env.NODE_ENV === 'development') {
        goToMenu(1, 1)
      }
    }
  })
  // #endif
  
  // #ifdef H5
  // H5 环境直接使用测试数据
  goToMenu(1, 1)
  // #endif
}

// 解析二维码
const parseQRCode = (url) => {
  try {
    // 预期格式: https://xxx.com/scan?storeId=1&tableId=1
    const urlObj = new URL(url)
    const storeId = urlObj.searchParams.get('storeId')
    const tableId = urlObj.searchParams.get('tableId')
    
    if (storeId && tableId) {
      goToMenu(Number(storeId), Number(tableId))
    } else {
      uni.showToast({
        title: '无效的二维码',
        icon: 'none'
      })
    }
  } catch (e) {
    console.error('解析二维码失败:', e)
    uni.showToast({
      title: '无效的二维码',
      icon: 'none'
    })
  }
}

// 跳转到菜单页
const goToMenu = async (storeId, tableId) => {
  uni.showLoading({ title: '加载中...' })

  const success = await tableStore.initTable(storeId, tableId)

  uni.hideLoading()

  if (success) {
    // TabBar 页面必须用 switchTab
    uni.switchTab({
      url: '/pages/menu/menu'
    })
  }
}

// 关闭手动输入弹窗
const closeManualPopup = () => {
  manualPopup.value?.close()
}

// 手动输入提交
const handleManualSubmit = () => {
  if (!manualInput.storeId || !manualInput.tableNo) {
    uni.showToast({
      title: '请填写完整信息',
      icon: 'none'
    })
    return
  }
  
  closeManualPopup()
  goToMenu(Number(manualInput.storeId), manualInput.tableNo)
}

// 页面显示时检查是否已有桌台信息
// eslint-disable-next-line no-unused-vars
const onShow = () => {
  if (tableStore.isInitialized) {
    uni.navigateTo({
      url: '/pages/menu/menu'
    })
  }
}
</script>

<style lang="scss" scoped>
.page-index {
  min-height: 100vh;
  background: linear-gradient(180deg, $primary-lighter 0%, $bg-card 50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  
  &__logo {
    width: 160rpx;
    height: 160rpx;
    border-radius: 24rpx;
    margin-top: 80rpx;
    background: $bg-card;
    box-shadow: $shadow-base;
  }
  
  &__title {
    margin-top: 40rpx;
    font-size: 40rpx;
    font-weight: $font-weight-semibold;
    color: $text-primary;
  }
  
  &__subtitle {
    margin-top: 12rpx;
    font-size: 28rpx;
    color: $text-secondary;
  }
  
  &__scan-area {
    margin-top: 80rpx;
    width: 400rpx;
    height: 400rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  &__scan-btn {
    margin-top: 60rpx;
    width: 400rpx;
  }
  
  &__manual {
    margin-top: 40rpx;
    display: flex;
    align-items: center;
    font-size: 28rpx;
    color: $text-tertiary;
    
    text {
      margin-right: 8rpx;
    }
  }
}

.status-bar {
  width: 100%;
  flex-shrink: 0;
}

.scan-animation {
  position: relative;
  width: 300rpx;
  height: 300rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &__border {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 4rpx dashed $primary-light;
    border-radius: 24rpx;
  }
  
  &__line {
    position: absolute;
    top: 20rpx;
    left: 20rpx;
    right: 20rpx;
    height: 4rpx;
    background: linear-gradient(90deg, transparent, $primary, transparent);
    animation: scan-line 2s ease-in-out infinite;
  }
}

@keyframes scan-line {
  0%, 100% {
    top: 20rpx;
    opacity: 0;
  }
  50% {
    top: 260rpx;
    opacity: 1;
  }
}

.manual-popup {
  width: 600rpx;
  background: $bg-card;
  border-radius: $radius-xl;
  padding: 40rpx;
  
  &__title {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: $text-primary;
    text-align: center;
    margin-bottom: 32rpx;
  }
  
  &__input-wrap {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
    margin-bottom: 32rpx;
  }
  
  &__input {
    height: 88rpx;
    background: $bg-grey;
    border-radius: $radius-base;
    padding: 0 24rpx;
    font-size: $font-size-base;
  }
  
  &__btns {
    display: flex;
    gap: 20rpx;
    
    .q-btn {
      flex: 1;
    }
  }
}
</style>
