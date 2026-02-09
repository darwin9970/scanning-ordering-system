// ==================== API 响应类型 ====================

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PaginatedData<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// ==================== 枚举类型 ====================

export type Role = 'SUPER_ADMIN' | 'OWNER' | 'STAFF'
export type Status = 'ACTIVE' | 'INACTIVE'
export type StoreStatus = 'ACTIVE' | 'CLOSED' | 'DISABLED'
export type TableStatus = 'FREE' | 'OCCUPIED' | 'RESERVED'
export type ProductType = 'SINGLE' | 'VARIANT'
export type ProductStatus = 'AVAILABLE' | 'SOLDOUT' | 'HIDDEN'
export type PrinterType = 'KITCHEN' | 'CASHIER' | 'BAR'
export type OrderStatus = 'PENDING' | 'PAID' | 'PREPARING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
export type PrintJobStatus = 'PENDING' | 'PRINTING' | 'SUCCESS' | 'FAILED' | 'DEAD'

// ==================== 实体类型 ====================

export interface Admin {
  id: number
  username: string
  name: string
  role: Role
  storeId: number | null
  status: Status
  createdAt: string
  updatedAt: string
}

export interface User {
  id: number
  openid: string
  unionid: string | null
  nickname: string | null
  avatar: string | null
  phone: string | null
  createdAt: string
  updatedAt: string
}

export interface Store {
  id: number
  name: string
  address: string | null
  phone: string | null
  latitude: string | null
  longitude: string | null
  logo: string | null
  status: StoreStatus
  createdAt: string
  updatedAt: string
}

export interface Table {
  id: number
  storeId: number
  name: string
  capacity: number
  qrCode: string
  status: TableStatus
  createdAt: string
  updatedAt: string
  store?: Store | null
}

export interface Category {
  id: number
  storeId: number
  name: string
  sort: number
  icon: string | null
  status: Status
  createdAt: string
  updatedAt: string
  store?: Store | null
  _count?: { products: number }
  printers?: { printer: Printer | null }[]
}

export interface Product {
  id: number
  storeId: number
  categoryId: number
  name: string
  description: string | null
  imageUrl: string | null
  type: ProductType
  basePrice: string
  sales: number
  sort: number
  status: ProductStatus
  createdAt: string
  updatedAt: string
  category?: Category | null
  variants?: ProductVariant[]
  attributes?: ProductAttribute[]
}

export interface ProductVariant {
  id: number
  productId: number
  specs: Record<string, string>
  price: string
  stock: number
  status: Status
  createdAt: string
  updatedAt: string
}

export interface ProductAttribute {
  id: number
  productId: number
  name: string
  options: string[]
  required: boolean
  createdAt: string
  updatedAt: string
}

export interface Printer {
  id: number
  storeId: number
  sn: string
  key: string
  name: string
  type: PrinterType
  status: Status
  createdAt: string
  updatedAt: string
  categories?: { category: Category | null }[]
}

export interface Order {
  id: number
  orderNo: string
  storeId: number
  tableId: number
  userId: number | null
  totalAmount: string
  payAmount: string
  discount: string
  status: OrderStatus
  payTime: string | null
  remark: string | null
  createdAt: string
  updatedAt: string
  table?: Table | null
  items?: OrderItem[]
}

export interface OrderItem {
  id: number
  orderId: number
  productVariantId: number
  quantity: number
  price: string
  snapshot: {
    name: string
    categoryName: string
    specs: Record<string, string>
  }
  attributes: { name: string; value: string }[] | null
  createdAt: string
}

export interface PrintJob {
  id: number
  orderId: number
  printerId: number
  content: unknown
  status: PrintJobStatus
  retries: number
  error: string | null
  createdAt: string
  updatedAt: string
}

// ==================== 请求参数类型 ====================

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: Omit<Admin, 'password'> & { store: Store | null }
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface StoreListParams extends PaginationParams {
  keyword?: string
  status?: StoreStatus
}

export interface TableListParams extends PaginationParams {
  storeId?: number
  status?: TableStatus
}

export interface CategoryListParams extends PaginationParams {
  storeId?: number
  status?: Status
}

export interface ProductListParams extends PaginationParams {
  storeId?: number
  categoryId?: number
  status?: ProductStatus
  keyword?: string
}

export interface OrderListParams extends PaginationParams {
  storeId?: number
  tableId?: number
  status?: OrderStatus
  orderNo?: string
  startDate?: string
  endDate?: string
}

export interface PrinterListParams extends PaginationParams {
  storeId?: number
}

// ==================== 创建/更新类型 ====================

export interface CreateStoreRequest {
  name: string
  address?: string
  phone?: string
  latitude?: number
  longitude?: number
  logo?: string
}

export interface UpdateStoreRequest extends Partial<CreateStoreRequest> {
  status?: StoreStatus
}

export interface CreateTableRequest {
  storeId: number
  name: string
  capacity?: number
}

export interface BatchCreateTablesRequest {
  storeId: number
  prefix: string
  startNum: number
  count: number
  capacity?: number
}

export interface CreateCategoryRequest {
  storeId: number
  name: string
  sort?: number
  icon?: string
}

export interface CreateProductRequest {
  storeId: number
  categoryId: number
  name: string
  description?: string
  imageUrl?: string
  type?: ProductType
  basePrice: number
  variants?: { specs: Record<string, string>; price: number; stock?: number }[]
  attributes?: { name: string; options: string[]; required?: boolean }[]
}

export interface CreateOrderRequest {
  storeId: number
  tableId: number
  userId?: number
  items: {
    variantId: number
    quantity: number
    attributes?: { name: string; value: string }[]
  }[]
  remark?: string
}

export interface CreatePrinterRequest {
  storeId: number
  sn: string
  key: string
  name: string
  type?: PrinterType
}

// ==================== Dashboard 类型 ====================

export interface DashboardOverview {
  today: {
    orders: number
    revenue: number
    pendingOrders: number
  }
  yesterday: {
    orders: number
    revenue: number
  }
  total: {
    products: number
    tables: number
  }
}

export interface SalesChartItem {
  date: string
  orders: number
  revenue: number
}

export interface CategoryStats {
  id: number
  name: string
  productCount: number
  totalSales: number
}
