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
  coverImage: string | null
  description: string | null
  announcement: string | null
  status: StoreStatus
  businessHours: { open: string; close: string; restDays?: number[] } | null
  minOrderAmount: string | null
  serviceChargeRate: string | null
  autoConfirmOrder: boolean
  autoCompleteMinutes: number
  wifiName: string | null
  wifiPassword: string | null
  contactName: string | null
  contactPhone: string | null
  welcomeText: string | null
  orderTip: string | null
  createdAt: string
  updatedAt: string
  _count?: { tables: number; products: number; orders?: number }
}

export type BannerPosition = 'HOME_TOP' | 'MENU_TOP' | 'CATEGORY' | 'PROMOTION'

export interface Banner {
  id: number
  storeId: number | null
  title: string
  image: string
  position: BannerPosition
  linkType: string | null
  linkValue: string | null
  sort: number
  isActive: boolean
  startTime: string | null
  endTime: string | null
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
  store?: Pick<Store, 'id' | 'name'> | null
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
  store?: Pick<Store, 'id' | 'name'> | null
  _count?: { products: number }
  printers?: { printer: Pick<Printer, 'id' | 'name' | 'type'> | null }[]
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
  category?: Pick<Category, 'id' | 'name'> | null
  variants?: ProductVariant[]
  attributes?: ProductAttribute[]
}

export interface ProductVariant {
  id: number
  productId: number
  name?: string
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
  categories?: { category: Pick<Category, 'id' | 'name'> | null }[]
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
  table?: Pick<Table, 'id' | 'name'> | null
  items?: OrderItem[]
  dinerCount?: number
  couponDiscount?: number
  pointsUsed?: number
  pointsDeduction?: number
  refundAmount?: number
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
  refundedQuantity?: number
  refundedAmount?: string
  refundReason?: string
  createdAt: string
}

export interface ComboItem {
  id: number
  productId: number
  variantId?: number
  quantity: number
  isOptional: boolean
  optionGroup?: string
  product?: Product
}

export interface Combo {
  id: number
  storeId: number
  name: string
  description: string | null
  imageUrl: string | null
  originalPrice: string
  price: string
  sales: number
  stock: number
  sort: number
  status: 'AVAILABLE' | 'SOLDOUT' | 'HIDDEN'
  items: ComboItem[]
  createdAt: string
}

export interface Coupon {
  id: number
  storeId: number | null
  name: string
  type: 'FIXED' | 'PERCENT' | 'NO_THRESHOLD'
  value: string
  minAmount: string
  maxDiscount: string | null
  totalCount: number
  usedCount: number
  claimedCount: number
  perUserLimit: number
  startTime: string
  endTime: string
  description: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED'
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

// ==================== Auth 类型 ====================

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: AdminWithStore
}

// 权限类型
export type Permission =
  | 'store:read'
  | 'store:write'
  | 'store:delete'
  | 'table:read'
  | 'table:write'
  | 'table:delete'
  | 'category:read'
  | 'category:write'
  | 'category:delete'
  | 'product:read'
  | 'product:write'
  | 'product:delete'
  | 'order:read'
  | 'order:write'
  | 'order:refund'
  | 'printer:read'
  | 'printer:write'
  | 'printer:delete'
  | 'member:read'
  | 'member:write'
  | 'coupon:read'
  | 'coupon:write'
  | 'coupon:delete'
  | 'promotion:read'
  | 'promotion:write'
  | 'promotion:delete'
  | 'staff:read'
  | 'staff:write'
  | 'staff:delete'
  | 'settings:read'
  | 'settings:write'
  | 'report:read'
  | 'service:read'
  | 'service:write'
  | 'banners:read'
  | 'banners:create'
  | 'banners:update'
  | 'banners:delete'

export interface AdminWithStore extends Omit<Admin, 'password'> {
  store: Store | null
  permissions: Permission[] // 后端返回的权限列表
}

// ==================== 请求参数类型 ====================

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

// ==================== 创建/更新请求类型 ====================

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
  coverImage?: string
  description?: string
  announcement?: string
  businessHours?: { open: string; close: string; restDays?: number[] }
  minOrderAmount?: number
  serviceChargeRate?: number
  autoConfirmOrder?: boolean
  autoCompleteMinutes?: number
  wifiName?: string
  wifiPassword?: string
  contactName?: string
  contactPhone?: string
  welcomeText?: string
  orderTip?: string
}

export interface CreateBannerRequest {
  storeId?: number
  title: string
  image: string
  position: BannerPosition
  linkType?: string
  linkValue?: string
  sort?: number
  isActive?: boolean
  startTime?: string
  endTime?: string
}

export interface UpdateBannerRequest extends Partial<CreateBannerRequest> {}

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

export interface UpdateTableRequest {
  name?: string
  capacity?: number
  status?: TableStatus
}

export interface CreateCategoryRequest {
  storeId: number
  name: string
  sort?: number
  icon?: string
}

export interface UpdateCategoryRequest {
  name?: string
  sort?: number
  icon?: string
  status?: Status
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

export interface UpdateProductRequest {
  name?: string
  categoryId?: number
  description?: string
  imageUrl?: string
  basePrice?: number
  sort?: number
}

export interface CreatePrinterRequest {
  storeId: number
  sn: string
  key: string
  name: string
  type?: PrinterType
}

export interface UpdatePrinterRequest {
  sn?: string
  key?: string
  name?: string
  type?: PrinterType
  status?: Status
}

export interface CreateComboRequest {
  storeId: number
  name: string
  description?: string
  imageUrl?: string
  price: number
  items: {
    productId: number
    variantId?: number
    quantity: number
    isOptional?: boolean
    optionGroup?: string
  }[]
}

export interface UpdateComboRequest extends Partial<CreateComboRequest> {
  status?: 'AVAILABLE' | 'SOLDOUT' | 'HIDDEN'
}

export interface CreateCouponRequest {
  name: string
  type: 'FIXED' | 'PERCENT' | 'NO_THRESHOLD'
  value: number
  minAmount: number
  maxDiscount?: number
  totalCount: number
  perUserLimit: number
  startTime: string
  endTime: string
  description?: string
}

export interface UpdateCouponRequest extends Partial<CreateCouponRequest> {
  status?: 'ACTIVE' | 'INACTIVE' | 'EXPIRED'
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

export interface TopProduct extends Product {
  category: Pick<Category, 'id' | 'name'> | null
}

export interface CategoryStats {
  id: number
  name: string
  productCount: number
  totalSales: number
}

// ==================== Staff 类型 ====================

export interface Staff {
  id: number
  username: string
  name: string
  role: Role
  status: Status
  storeId: number | null
  store?: Store | null
  createdAt: string
  updatedAt: string
}

export interface StaffListParams {
  page?: number
  pageSize?: number
  storeId?: number
  role?: Role
  keyword?: string
  status?: Status
}

export interface CreateStaffRequest {
  username: string
  password: string
  name: string
  role?: Role
  storeId?: number
}

export interface UpdateStaffRequest {
  name?: string
  password?: string
  role?: Role
  storeId?: number
  status?: Status
}

// ==================== 页面装修配置类型 ====================

// 页面类型（10个Tab）
export type PageType =
  | 'HOME' // 首页
  | 'MENU' // 点餐页
  | 'PRODUCT_DETAIL' // 商品详情页
  | 'ORDER_CENTER' // 订单中心
  | 'PROFILE' // 个人中心
  | 'MEMBER' // 会员页
  | 'BARRAGE' // 用户下单弹幕
  | 'TABBAR' // 底部导航设计
  | 'TOPIC' // 专题页面
  | 'RECHARGE' // 充值页面

// 组件类型（完整40+组件）
export type PageComponentType =
  // === 极简组件 (8个) ===
  | 'FOCUS_ENTRY' // 焦点入口
  | 'STAMP_CARD' // 集章/集点卡
  | 'COUPON_ENTRY' // 领取优惠券入口
  | 'BALANCE_ENTRY' // 储值余额入口
  | 'FLOAT_WINDOW' // 悬浮窗口
  | 'POINTS_ENTRY' // 会员积分入口
  | 'SERVICE_ENTRY' // 客服入口
  | 'NEARBY_STORES' // 附近门店入口
  // === 标准组件 (14个) ===
  | 'BANNER' // 轮播图
  | 'NAV_GRID' // 导航/金刚区
  | 'STORE_LIST' // 门店列表
  | 'PRODUCT_LIST' // 商品列表
  | 'PRODUCT_GRID' // 商品网格
  | 'PROMOTION' // 营销模块
  | 'STAMP_CARD_STD' // 集点卡(标准)
  | 'WECHAT_OA' // 公众号组件
  | 'COMBO_PROMO' // 套餐推广
  | 'SEARCH' // 搜索模块
  | 'STORE_TITLE' // 门店标题
  | 'CART_FLOAT' // 购物车悬浮按钮
  | 'NOTICE' // 公告栏
  | 'WECHAT_SHOP' // 微信小店
  // === 自由容器 (2个) ===
  | 'FREE_CONTAINER' // 自由容器
  | 'FLOAT_CONTAINER' // 悬浮容器
  // === 基础元素 (19个) ===
  | 'IMAGE' // 图片
  | 'TEXT' // 文本
  | 'DINING_TYPE' // 就餐方式标识
  | 'USER_NICKNAME' // 用户昵称
  | 'USER_AVATAR' // 用户头像
  | 'USER_PHONE' // 用户手机号
  | 'USER_POINTS' // 用户积分
  | 'USER_BALANCE' // 用户余额
  | 'COUPON_COUNT' // 可用券数量
  | 'GIFT_CARD_COUNT' // 礼品卡数量
  | 'STAMP_COUNT' // 已集章数
  | 'STORE_NAME' // 门店名称
  | 'STORE_DISTANCE' // 门店距离
  | 'STORE_INFO' // 门店信息
  | 'DINING_MODE' // 就餐方式选择
  | 'MEMBER_BADGE' // 会员标识
  | 'MEMBER_PROGRESS' // 会员进度
  | 'MEMBER_PROGRESS_TEXT' // 会员进度说明
  | 'MEMBER_LEVEL_DESC' // 会员等级说明
  // === 兼容旧组件 ===
  | 'SPACER' // 分隔符
  | 'COUPON' // 优惠券(旧)
  | 'HOT_PRODUCTS' // 热销商品
  | 'NEW_PRODUCTS' // 新品推荐
  // === 点餐页专属 ===
  | 'ORDER_COMPONENT' // 点单组件（完整点餐功能）
  // === 会员页专属 ===
  | 'MEMBER_RIGHTS' // 会员权益
  | 'MEMBER_LEVEL' // 会员等级
  | 'MEMBER_DESC' // 会员说明
  | 'LEVEL_DESC' // 等级说明
  | 'OPEN_CONDITION' // 开通条件
  // === 充值页专属 ===
  | 'RECHARGE_OPTIONS' // 充值选项
  | 'RECHARGE_BUTTON' // 充值按钮
  | 'RECHARGE_DESC' // 充值说明
  // === 个人中心专属 ===
  | 'USER_INFO' // 会员信息（头像+昵称+统计）
  | 'FUNC_ENTRY' // 功能入口

// 组件分类
export type ComponentCategory =
  | 'simple' // 极简组件
  | 'standard' // 标准组件
  | 'container' // 自由容器
  | 'element' // 基础元素
  | 'special' // 特殊/专属组件

export interface PageComponent {
  id: string
  type: PageComponentType
  title?: string
  visible: boolean
  props: Record<string, unknown>
  children?: PageComponent[] // 支持容器嵌套
  // 自由布局属性
  x?: number // X坐标
  y?: number // Y坐标
  width?: number // 宽度
  height?: number // 高度
  zIndex?: number // 层级
  locked?: boolean // 是否锁定
}

export interface PageConfig {
  id: number | null
  storeId: number
  pageType: PageType
  components: PageComponent[]
  isPublished: boolean
  publishedAt: string | null
  isDefault?: boolean
  settings?: PageSettings // 页面级设置
  createdAt?: string
  updatedAt?: string
}

// 页面级设置
export interface PageSettings {
  title?: string // 页面标题
  navBgColor?: string // 导航背景色
  navTextColor?: 'white' | 'black' // 导航文字颜色
  pageBgColor?: string // 页面背景色
  hideNav?: boolean // 隐藏导航
  enablePullRefresh?: boolean // 下拉刷新
}

export interface ComponentTypeInfo {
  value: PageComponentType
  label: string
  icon: string
  category: ComponentCategory
  availableIn?: PageType[] // 可用于哪些页面，空表示全部可用
}

export interface NavGridItem {
  icon: string
  text: string
  link: LinkConfig
}

// 链接配置（支持14种链接类型）
export interface LinkConfig {
  type:
    | 'none'
    | 'page'
    | 'popup'
    | 'service'
    | 'scan'
    | 'miniapp'
    | 'map'
    | 'article'
    | 'phone'
    | 'share'
    | 'video'
    | 'group'
    | 'search'
    | 'register'
  value: string
  appId?: string // 跳转其他小程序时使用
}

// TabBar配置
export interface TabBarItem {
  pagePath: string
  text: string
  iconPath: string
  selectedIconPath: string
}

export interface TabBarConfig {
  color: string // 默认文字颜色
  selectedColor: string // 选中文字颜色
  backgroundColor: string // 背景色
  borderStyle: 'black' | 'white' // 边框样式
  list: TabBarItem[]
}

// 子Tab配置（点餐页弹窗等）
export interface SubTabConfig {
  id: string
  name: string
  type: 'coupon_popup' | 'dining_mode' | 'loading_page' | 'custom'
  components: PageComponent[]
  settings?: {
    showOnEntry?: boolean // 进入页面时显示
    triggerType?: 'auto' | 'button' | 'scroll' // 触发方式
    position?: 'center' | 'bottom' | 'top' // 弹窗位置
    animation?: 'fade' | 'slide' | 'scale' // 动画效果
  }
}

// ==================== Member 类型 ====================

export interface Member {
  id: number
  userId: number
  level: number
  points: number
  storeId: number | null
  createdAt: string
  updatedAt: string
  user?: User
  stats?: {
    totalOrders: number
    totalAmount: string
  }
}

export interface MemberStats {
  totalMembers: number
  levelStats: { level: number; count: number }[]
  totalPoints: number
}

export interface LevelConfig {
  level: number
  name: string
  minPoints: number
  discount: number
  pointsMultiplier: number
  color: string
}

// ==================== Promotion 类型 ====================

export type PromotionType =
  | 'FULL_REDUCE'
  | 'DISCOUNT'
  | 'NEW_USER'
  | 'TIME_LIMITED'
  | 'SECOND_HALF_PRICE'
  | 'QUANTITY_DISCOUNT'
  | 'BUY_ONE_GET_ONE'

export interface FullReduceTier {
  min: number
  discount: number
}

export interface Promotion {
  id: number
  storeId: number | null
  name: string
  type: PromotionType
  rules: any
  startTime: string
  endTime: string
  description: string | null
  priority: number
  stackable: boolean
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

// ==================== 权限与角色配置 ====================

export interface RoleConfig {
  role: string
  permissions: string[]
}
