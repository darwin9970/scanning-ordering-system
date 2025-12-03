/**
 * Pinia Store 入口
 */
import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

// 导出各个 store
export { useTableStore } from './table'
export { useCartStore } from './cart'
export { useOrderStore } from './order'
