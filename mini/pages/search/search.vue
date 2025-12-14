<template>
  <view class="page-search">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-bar__input-wrap">
        <uni-icons type="search" size="18" color="#999" />
        <input
          v-model="keyword"
          class="search-bar__input"
          placeholder="搜索商品名称"
          @input="handleInput"
          @confirm="handleSearch"
          :focus="autoFocus"
        />
        <view v-if="keyword" class="search-bar__clear" @tap="clearKeyword">
          <uni-icons type="clear" size="16" color="#999" />
        </view>
      </view>
      <text class="search-bar__cancel" @tap="goBack">取消</text>
    </view>

    <!-- 搜索历史 -->
    <view v-if="!keyword && searchHistory.length > 0" class="search-history">
      <view class="search-history__header">
        <text class="search-history__title">搜索历史</text>
        <text class="search-history__clear" @tap="clearHistory">清空</text>
      </view>
      <view class="search-history__tags">
        <view
          v-for="(item, index) in searchHistory"
          :key="index"
          class="search-history__tag"
          @tap="selectHistory(item)"
        >
          {{ item }}
        </view>
      </view>
    </view>

    <!-- 热门搜索 -->
    <view v-if="!keyword && hotKeywords.length > 0" class="hot-search">
      <view class="hot-search__title">热门搜索</view>
      <view class="hot-search__tags">
        <view
          v-for="(item, index) in hotKeywords"
          :key="index"
          class="hot-search__tag"
          @tap="selectHotKeyword(item)"
        >
          {{ item }}
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-if="keyword && searchResults.length > 0" class="search-results">
      <view class="search-results__header">
        <text class="search-results__count">找到 {{ searchResults.length }} 个商品</text>
      </view>
      <view class="search-results__list">
        <view
          v-for="product in searchResults"
          :key="product.id"
          class="search-result-item"
          @tap="goToProductDetail(product)"
        >
          <image
            class="search-result-item__image"
            :src="product.image || '/static/images/default-food.png'"
            mode="aspectFill"
          />
          <view class="search-result-item__content">
            <text class="search-result-item__name" v-html="highlightKeyword(product.name, keyword)"></text>
            <text class="search-result-item__desc">{{ product.description }}</text>
            <view class="search-result-item__footer">
              <q-price :value="product.price" size="medium" />
              <text class="search-result-item__sales">月售 {{ product.sales || 0 }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="keyword && searchResults.length === 0 && !loading" class="search-empty">
      <q-empty type="search" text="没有找到相关商品" tip="试试其他关键词吧~" />
      <view class="search-empty__action">
        <button class="search-empty__btn" @tap="clearKeyword">重新搜索</button>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="search-loading">
      <q-skeleton type="list" :rows="5" :cols="1" item-width="100%" />
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTableStore } from '@/store/table'
import QEmpty from '@/components/q-empty/q-empty.vue'
import QSkeleton from '@/components/q-skeleton/q-skeleton.vue'
import QPrice from '@/components/q-price/q-price.vue'

const tableStore = useTableStore()

// 搜索关键词
const keyword = ref('')
const autoFocus = ref(true)

// 搜索结果
const searchResults = ref([])
const loading = ref(false)

// 搜索历史
const searchHistory = ref([])

// 热门搜索
const hotKeywords = ref(['招牌菜', '热销', '新品', '套餐', '饮品'])

// 高亮关键词
const highlightKeyword = (text, keyword) => {
  if (!keyword) return text
  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, '<span class="highlight">$1</span>')
}

// 输入处理
const handleInput = (e) => {
  keyword.value = e.detail.value
  if (keyword.value) {
    performSearch()
  } else {
    searchResults.value = []
  }
}

// 执行搜索
const performSearch = async () => {
  if (!keyword.value.trim()) {
    searchResults.value = []
    return
  }

  loading.value = true
  
  try {
    // 从 store 中搜索商品
    const allProducts = Object.values(tableStore.productsByCategory || {}).flat()
    const results = allProducts.filter(product => {
      const name = (product.name || '').toLowerCase()
      const desc = (product.description || '').toLowerCase()
      const kw = keyword.value.toLowerCase()
      return name.includes(kw) || desc.includes(kw)
    })
    
    searchResults.value = results
  } catch (error) {
    console.error('搜索失败:', error)
    uni.showToast({
      title: '搜索失败，请重试',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// 搜索确认
const handleSearch = () => {
  if (!keyword.value.trim()) return
  
  performSearch()
  
  // 保存搜索历史
  if (!searchHistory.value.includes(keyword.value)) {
    searchHistory.value.unshift(keyword.value)
    if (searchHistory.value.length > 10) {
      searchHistory.value = searchHistory.value.slice(0, 10)
    }
    uni.setStorageSync('searchHistory', searchHistory.value)
  }
}

// 选择历史记录
const selectHistory = (item) => {
  keyword.value = item
  performSearch()
}

// 选择热门关键词
const selectHotKeyword = (item) => {
  keyword.value = item
  performSearch()
}

// 清空关键词
const clearKeyword = () => {
  keyword.value = ''
  searchResults.value = []
}

// 清空历史
const clearHistory = () => {
  uni.showModal({
    title: '提示',
    content: '确定要清空搜索历史吗？',
    success: (res) => {
      if (res.confirm) {
        searchHistory.value = []
        uni.removeStorageSync('searchHistory')
      }
    }
  })
}

// 跳转商品详情
const goToProductDetail = (product) => {
  uni.navigateTo({
    url: `/pages/product/detail?id=${product.id}`
  })
}

// 返回
const goBack = () => {
  uni.navigateBack()
}

// 加载搜索历史
onMounted(() => {
  const history = uni.getStorageSync('searchHistory')
  if (history && Array.isArray(history)) {
    searchHistory.value = history
  }
})
</script>

<style lang="scss" scoped>
.page-search {
  min-height: 100vh;
  background: $bg-page;
}

// 搜索栏
.search-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: $bg-card;
  border-bottom: 1rpx solid $border-lighter;
  
  &__input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0 24rpx;
    height: 72rpx;
    background: $bg-grey;
    border-radius: 36rpx;
  }
  
  &__input {
    flex: 1;
    margin-left: 12rpx;
    font-size: $font-size-base;
    color: $text-primary;
  }
  
  &__clear {
    margin-left: 12rpx;
    padding: 8rpx;
  }
  
  &__cancel {
    margin-left: 16rpx;
    font-size: $font-size-base;
    color: $text-secondary;
  }
}

// 搜索历史
.search-history {
  padding: 24rpx;
  background: $bg-card;
  margin-bottom: 20rpx;
  
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
  }
  
  &__title {
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    color: $text-primary;
  }
  
  &__clear {
    font-size: $font-size-sm;
    color: $text-tertiary;
  }
  
  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
  }
  
  &__tag {
    padding: 12rpx 24rpx;
    background: $bg-grey;
    border-radius: $radius-base;
    font-size: $font-size-sm;
    color: $text-secondary;
  }
}

// 热门搜索
.hot-search {
  padding: 24rpx;
  background: $bg-card;
  
  &__title {
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    color: $text-primary;
    margin-bottom: 16rpx;
  }
  
  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
  }
  
  &__tag {
    padding: 12rpx 24rpx;
    background: $primary-light;
    border-radius: $radius-base;
    font-size: $font-size-sm;
    color: $primary;
    font-weight: $font-weight-medium;
  }
}

// 搜索结果
.search-results {
  padding: 24rpx;
  
  &__header {
    margin-bottom: 20rpx;
  }
  
  &__count {
    font-size: $font-size-sm;
    color: $text-secondary;
  }
  
  &__list {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }
}

.search-result-item {
  display: flex;
  padding: 24rpx;
  background: $bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  
  &__image {
    width: 160rpx;
    height: 160rpx;
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
    line-height: 1.5;
    margin-bottom: 8rpx;
    
    :deep(.highlight) {
      color: $primary;
      font-weight: $font-weight-semibold;
      background: $primary-light;
      padding: 2rpx 4rpx;
      border-radius: 4rpx;
    }
  }
  
  &__desc {
    font-size: $font-size-sm;
    color: $text-tertiary;
    margin-bottom: 12rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
  }
  
  &__sales {
    font-size: $font-size-sm;
    color: $text-tertiary;
  }
}

.search-empty {
  padding-top: 200rpx;
  
  &__action {
    margin-top: 40rpx;
    padding: 0 24rpx;
    display: flex;
    justify-content: center;
  }
  
  &__btn {
    padding: 20rpx 48rpx;
    background: $primary;
    color: #FFFFFF;
    border: none;
    border-radius: $radius-base;
    font-size: $font-size-base;
    font-weight: $font-weight-medium;
    
    &::after {
      display: none;
    }
    
    &:active {
      opacity: 0.8;
    }
  }
}

.search-loading {
  padding: 24rpx;
}
</style>

