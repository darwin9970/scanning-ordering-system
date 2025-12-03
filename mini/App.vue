<script>
import { useTableStore } from '@/store/table'
import { useCartStore } from '@/store/cart'

export default {
  onLaunch() {
    console.log('App Launch')

    // 尝试从本地恢复桌台信息
    const tableStore = useTableStore()
    tableStore.restoreFromStorage()

    // 恢复购物车
    const cartStore = useCartStore()
    cartStore.restoreFromLocal()
  },
  onShow() {
    console.log('App Show')
  },
  onHide() {
    console.log('App Hide')
  }
}
</script>

<style lang="scss">
/* 导入全局样式 */
@import '@/styles/index.scss';
@import '@/uni_modules/uni-scss/index.scss';
</style>
