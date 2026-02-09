<script>
import { useTableStore } from '@/store/table'
import { useCartStore } from '@/store/cart'
import { getTabBarConfig } from '@/api'

export default {
  onLaunch() {
    console.log('App Launch')

    // 尝试从本地恢复桌台信息
    const tableStore = useTableStore()
    tableStore.restoreFromStorage()

    // 恢复购物车
    const cartStore = useCartStore()
    cartStore.restoreFromLocal()

    // 加载 TabBar 配置
    this.loadTabBarConfig()
  },
  onShow() {
    console.log('App Show')
  },
  onHide() {
    console.log('App Hide')
  },
  methods: {
    async loadTabBarConfig() {
      try {
        const storeId = uni.getStorageSync('storeId')
        if (!storeId) return

        const res = await getTabBarConfig({ storeId })
        if (res.code === 200 && res.data) {
          const config = res.data

          // 应用 TabBar 样式
          uni.setTabBarStyle({
            color: config.color,
            selectedColor: config.selectedColor,
            backgroundColor: config.backgroundColor,
            borderStyle: config.borderStyle
          })

          // 更新每个 TabBar 项
          if (config.list && config.list.length > 0) {
            config.list.forEach((item, index) => {
              uni.setTabBarItem({
                index,
                text: item.text,
                iconPath: item.iconPath,
                selectedIconPath: item.selectedIconPath
              })
            })
          }
        }
      } catch (e) {
        console.error('加载 TabBar 配置失败:', e)
      }
    }
  }
}
</script>

<style lang="scss">
/* 导入全局样式 */
@import '@/styles/index.scss';
@import '@/uni_modules/uni-scss/index.scss';
</style>
