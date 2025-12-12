import {
  Home,
  Menu,
  Package,
  FileText,
  User,
  Crown,
  Megaphone,
  Navigation,
  Layers,
  Wallet,
  Zap,
  Star,
  Ticket,
  Square,
  Award,
  MessageCircle,
  MapPin,
  Image,
  LayoutGrid,
  List,
  Store,
  Gift,
  Hash,
  ShoppingCart,
  Search,
  Bell,
  Box,
  ImagePlus,
  Type,
  Circle,
  Phone,
  Minus,
  Sparkles,
  Flame,
  CreditCard,
} from "lucide-react";
import type { PageType, PageComponentType, ComponentCategory } from "@/types";

// 页面类型定义（10个Tab）
export const PAGE_TYPES: {
  value: PageType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "HOME", label: "首页", icon: Home },
  { value: "MENU", label: "点餐页", icon: Menu },
  { value: "PRODUCT_DETAIL", label: "商品详情页", icon: Package },
  { value: "ORDER_CENTER", label: "订单中心", icon: FileText },
  { value: "PROFILE", label: "个人中心", icon: User },
  { value: "MEMBER", label: "会员页", icon: Crown },
  { value: "BARRAGE", label: "用户下单弹幕", icon: Megaphone },
  { value: "TABBAR", label: "底部导航设计", icon: Navigation },
  { value: "TOPIC", label: "专题页面", icon: Layers },
  { value: "RECHARGE", label: "充值页面", icon: Wallet },
];

// 子Tab配置
export const SUB_TABS: Record<string, Array<{ id: string; label: string; description: string }>> = {
  HOME: [
    { id: "main", label: "主页面", description: "首页主要内容" },
    { id: "loading", label: "加载页", description: "首次进入时的加载动画" },
  ],
  MENU: [
    { id: "main", label: "主页面", description: "点餐页主要内容" },
    { id: "coupon_popup", label: "优惠券弹窗", description: "进入时显示的优惠券弹窗" },
    { id: "dining_mode", label: "就餐方式", description: "堂食/外带/外卖选择弹窗" },
  ],
};

// 组件图标映射
export const COMPONENT_ICONS: Partial<Record<PageComponentType, React.ReactNode>> = {
  // 极简组件
  FOCUS_ENTRY: <Zap className="h-5 w-5" />,
  STAMP_CARD: <Star className="h-5 w-5" />,
  COUPON_ENTRY: <Ticket className="h-5 w-5" />,
  BALANCE_ENTRY: <Wallet className="h-5 w-5" />,
  FLOAT_WINDOW: <Square className="h-5 w-5" />,
  POINTS_ENTRY: <Award className="h-5 w-5" />,
  SERVICE_ENTRY: <MessageCircle className="h-5 w-5" />,
  NEARBY_STORES: <MapPin className="h-5 w-5" />,
  // 标准组件
  BANNER: <Image className="h-5 w-5" />,
  NAV_GRID: <LayoutGrid className="h-5 w-5" />,
  STORE_LIST: <Store className="h-5 w-5" />,
  PRODUCT_LIST: <List className="h-5 w-5" />,
  PRODUCT_GRID: <LayoutGrid className="h-5 w-5" />,
  PROMOTION: <Gift className="h-5 w-5" />,
  STAMP_CARD_STD: <Star className="h-5 w-5" />,
  WECHAT_OA: <Hash className="h-5 w-5" />,
  COMBO_PROMO: <Package className="h-5 w-5" />,
  SEARCH: <Search className="h-5 w-5" />,
  STORE_TITLE: <Store className="h-5 w-5" />,
  CART_FLOAT: <ShoppingCart className="h-5 w-5" />,
  NOTICE: <Bell className="h-5 w-5" />,
  WECHAT_SHOP: <ShoppingCart className="h-5 w-5" />,
  // 自由容器
  FREE_CONTAINER: <Box className="h-5 w-5" />,
  FLOAT_CONTAINER: <Layers className="h-5 w-5" />,
  // 基础元素
  IMAGE: <ImagePlus className="h-5 w-5" />,
  TEXT: <Type className="h-5 w-5" />,
  USER_NICKNAME: <User className="h-5 w-5" />,
  USER_AVATAR: <Circle className="h-5 w-5" />,
  USER_PHONE: <Phone className="h-5 w-5" />,
  USER_POINTS: <Award className="h-5 w-5" />,
  USER_BALANCE: <Wallet className="h-5 w-5" />,
  STORE_NAME: <Store className="h-5 w-5" />,
  STORE_DISTANCE: <MapPin className="h-5 w-5" />,
  MEMBER_BADGE: <Crown className="h-5 w-5" />,
  // 兼容旧组件
  SPACER: <Minus className="h-5 w-5" />,
  COUPON: <Ticket className="h-5 w-5" />,
  HOT_PRODUCTS: <Flame className="h-5 w-5" />,
  NEW_PRODUCTS: <Sparkles className="h-5 w-5" />,
  // 专属组件
  ORDER_COMPONENT: <ShoppingCart className="h-5 w-5" />,
  USER_INFO: <User className="h-5 w-5" />,
  FUNC_ENTRY: <LayoutGrid className="h-5 w-5" />,
  MEMBER_RIGHTS: <Award className="h-5 w-5" />,
  MEMBER_LEVEL: <Crown className="h-5 w-5" />,
  RECHARGE_OPTIONS: <CreditCard className="h-5 w-5" />,
  RECHARGE_BUTTON: <Wallet className="h-5 w-5" />,
};

// 组件类型信息
interface ComponentTypeItem {
  value: PageComponentType;
  label: string;
  category: ComponentCategory;
  availableIn?: PageType[];
}

export const COMPONENT_TYPES: ComponentTypeItem[] = [
  // 极简组件
  { value: "FOCUS_ENTRY", label: "焦点入口", category: "simple" },
  { value: "STAMP_CARD", label: "集章/集点卡", category: "simple" },
  { value: "COUPON_ENTRY", label: "领取优惠券", category: "simple" },
  { value: "BALANCE_ENTRY", label: "储值余额", category: "simple" },
  { value: "FLOAT_WINDOW", label: "悬浮窗口", category: "simple" },
  { value: "POINTS_ENTRY", label: "会员积分", category: "simple" },
  { value: "SERVICE_ENTRY", label: "客服入口", category: "simple" },
  { value: "NEARBY_STORES", label: "附近门店", category: "simple" },
  // 标准组件
  { value: "BANNER", label: "轮播图", category: "standard" },
  { value: "NAV_GRID", label: "导航", category: "standard" },
  { value: "STORE_LIST", label: "门店列表", category: "standard" },
  { value: "PRODUCT_LIST", label: "商品列表", category: "standard" },
  { value: "PRODUCT_GRID", label: "商品网格", category: "standard" },
  { value: "PROMOTION", label: "营销模块", category: "standard" },
  { value: "STAMP_CARD_STD", label: "集点卡", category: "standard" },
  { value: "WECHAT_OA", label: "公众号组件", category: "standard" },
  { value: "COMBO_PROMO", label: "套餐推广", category: "standard" },
  { value: "SEARCH", label: "搜索模块", category: "standard" },
  { value: "STORE_TITLE", label: "门店标题", category: "standard" },
  { value: "CART_FLOAT", label: "购物车", category: "standard" },
  { value: "NOTICE", label: "公告栏", category: "standard" },
  { value: "HOT_PRODUCTS", label: "热销商品", category: "standard" },
  { value: "NEW_PRODUCTS", label: "新品推荐", category: "standard" },
  { value: "COUPON", label: "优惠券", category: "standard" },
  { value: "SPACER", label: "分隔符", category: "standard" },
  // 自由容器
  { value: "FREE_CONTAINER", label: "自由容器", category: "container" },
  { value: "FLOAT_CONTAINER", label: "悬浮容器", category: "container" },
  // 基础元素
  { value: "IMAGE", label: "图片", category: "element" },
  { value: "TEXT", label: "文本", category: "element" },
  { value: "USER_NICKNAME", label: "昵称", category: "element" },
  { value: "USER_AVATAR", label: "头像", category: "element" },
  { value: "USER_PHONE", label: "手机号", category: "element" },
  { value: "USER_POINTS", label: "积分", category: "element" },
  { value: "USER_BALANCE", label: "余额", category: "element" },
  { value: "COUPON_COUNT", label: "可用券数量", category: "element" },
  { value: "STORE_NAME", label: "门店名称", category: "element" },
  { value: "STORE_DISTANCE", label: "门店距离", category: "element" },
  { value: "MEMBER_BADGE", label: "会员标识", category: "element" },
  { value: "MEMBER_PROGRESS", label: "会员进度", category: "element" },
  // 特殊/专属组件
  { value: "ORDER_COMPONENT", label: "点单组件", category: "special", availableIn: ["MENU"] },
  { value: "USER_INFO", label: "会员信息", category: "special", availableIn: ["PROFILE"] },
  { value: "FUNC_ENTRY", label: "功能入口", category: "special", availableIn: ["PROFILE"] },
  { value: "MEMBER_RIGHTS", label: "会员权益", category: "special", availableIn: ["MEMBER"] },
  { value: "MEMBER_LEVEL", label: "会员等级", category: "special", availableIn: ["MEMBER"] },
  { value: "RECHARGE_OPTIONS", label: "充值选项", category: "special", availableIn: ["RECHARGE"] },
  { value: "RECHARGE_BUTTON", label: "充值按钮", category: "special", availableIn: ["RECHARGE"] },
];

// 分类标签
export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  simple: "极简组件",
  standard: "标准组件",
  container: "自由容器",
  element: "基础元素",
  special: "专属组件",
};

// 预设模板
export const TEMPLATES = [
  {
    id: "simple-home",
    name: "简约首页",
    category: "茶饮",
    thumbnail: "🏠",
    components: [
      {
        id: "t1",
        type: "BANNER",
        title: "轮播图",
        visible: true,
        props: { autoplay: true, interval: 3000, height: 180 },
      },
      {
        id: "t2",
        type: "SEARCH",
        title: "搜索",
        visible: true,
        props: { placeholder: "搜索商品", bgColor: "#f5f5f5" },
      },
      {
        id: "t3",
        type: "NAV_GRID",
        title: "导航",
        visible: true,
        props: {
          columns: 4,
          items: [
            { icon: "🍵", text: "茶饮", link: { type: "page", value: "" } },
            { icon: "🧋", text: "奶茶", link: { type: "page", value: "" } },
            { icon: "🎁", text: "套餐", link: { type: "page", value: "" } },
            { icon: "🎫", text: "优惠券", link: { type: "page", value: "" } },
          ],
        },
      },
      {
        id: "t4",
        type: "HOT_PRODUCTS",
        title: "热销推荐",
        visible: true,
        props: { limit: 6, showRank: true },
      },
    ],
  },
  {
    id: "promo-home",
    name: "促销首页",
    category: "快餐",
    thumbnail: "🎉",
    components: [
      {
        id: "p1",
        type: "BANNER",
        title: "活动Banner",
        visible: true,
        props: { autoplay: true, interval: 2500, height: 200 },
      },
      {
        id: "p2",
        type: "NOTICE",
        title: "公告",
        visible: true,
        props: { scrollable: true, speed: 50 },
      },
      { id: "p3", type: "COUPON", title: "优惠券", visible: true, props: { showCount: 3 } },
      {
        id: "p4",
        type: "FOCUS_ENTRY",
        title: "焦点入口",
        visible: true,
        props: { text: "限时特惠", icon: "⚡", bgColor: "#ff6b35" },
      },
      {
        id: "p5",
        type: "HOT_PRODUCTS",
        title: "爆款推荐",
        visible: true,
        props: { limit: 8, showRank: true },
      },
      {
        id: "p6",
        type: "NEW_PRODUCTS",
        title: "新品上市",
        visible: true,
        props: { limit: 4, showBadge: true },
      },
    ],
  },
  {
    id: "minimal-menu",
    name: "极简点餐",
    category: "咖啡",
    thumbnail: "☕",
    components: [
      {
        id: "m1",
        type: "STORE_TITLE",
        title: "门店标题",
        visible: true,
        props: { showDistance: true, showStatus: true },
      },
      {
        id: "m2",
        type: "ORDER_COMPONENT",
        title: "点单组件",
        visible: true,
        props: { categoryStyle: "left", productStyle: "list", showSales: true },
      },
      {
        id: "m3",
        type: "CART_FLOAT",
        title: "购物车",
        visible: true,
        props: { position: "right-bottom", showCount: true },
      },
    ],
  },
  {
    id: "member-center",
    name: "会员中心",
    category: "通用",
    thumbnail: "👤",
    components: [
      {
        id: "u1",
        type: "USER_INFO",
        title: "会员信息",
        visible: true,
        props: {
          showAvatar: true,
          showNickname: true,
          showBalance: true,
          showPoints: true,
          showCoupons: true,
        },
      },
      {
        id: "u2",
        type: "FUNC_ENTRY",
        title: "功能入口",
        visible: true,
        props: {
          columns: 4,
          items: [
            { icon: "📋", text: "我的订单", link: { type: "page", value: "" } },
            { icon: "🎫", text: "优惠券", link: { type: "page", value: "" } },
            { icon: "💰", text: "余额", link: { type: "page", value: "" } },
            { icon: "⚙️", text: "设置", link: { type: "page", value: "" } },
          ],
        },
      },
      {
        id: "u3",
        type: "STAMP_CARD",
        title: "集点卡",
        visible: true,
        props: { title: "集点送好礼", total: 10, current: 3 },
      },
      {
        id: "u4",
        type: "BANNER",
        title: "推荐活动",
        visible: true,
        props: { autoplay: true, height: 120 },
      },
    ],
  },
  {
    id: "recharge-page",
    name: "充值页面",
    category: "通用",
    thumbnail: "💳",
    components: [
      {
        id: "r1",
        type: "BALANCE_ENTRY",
        title: "余额显示",
        visible: true,
        props: { showBalance: true },
      },
      {
        id: "r2",
        type: "RECHARGE_OPTIONS",
        title: "充值选项",
        visible: true,
        props: {
          columns: 2,
          items: [
            { amount: 50, gift: 5, giftType: "balance" },
            { amount: 100, gift: 15, giftType: "balance" },
            { amount: 200, gift: 40, giftType: "balance" },
            { amount: 500, gift: 120, giftType: "balance" },
          ],
        },
      },
      {
        id: "r3",
        type: "RECHARGE_BUTTON",
        title: "充值按钮",
        visible: true,
        props: { text: "立即充值", bgColor: "#ff6b35" },
      },
      {
        id: "r4",
        type: "TEXT",
        title: "充值说明",
        visible: true,
        props: {
          content: "充值即表示同意《储值协议》",
          fontSize: 12,
          color: "#999",
          align: "center",
        },
      },
    ],
  },
];

// 生成唯一ID
export const generateId = () => `comp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// 组件默认配置
export const getDefaultProps = (type: PageComponentType): Record<string, unknown> => {
  switch (type) {
    // 极简组件
    case "FOCUS_ENTRY":
      return {
        text: "点我下单",
        icon: "🔥",
        bgColor: "#ff6b35",
        link: { type: "page", value: "/pages/menu/menu" },
      };
    case "STAMP_CARD":
      return { title: "集章活动", total: 10, current: 0 };
    case "COUPON_ENTRY":
      return { text: "领券中心", showCount: true };
    case "BALANCE_ENTRY":
      return { showBalance: true, showRecharge: true };
    case "FLOAT_WINDOW":
      return { position: "right-bottom", icon: "🎁", link: { type: "page", value: "" } };
    case "POINTS_ENTRY":
      return { showPoints: true, showExchange: true };
    case "SERVICE_ENTRY":
      return { type: "wechat", text: "联系客服" };
    case "NEARBY_STORES":
      return { showDistance: true, showStatus: true };
    // 标准组件
    case "BANNER":
      return { autoplay: true, interval: 3000, height: 180, style: "single", showIndicator: true };
    case "NAV_GRID":
      return {
        columns: 4,
        items: [
          { icon: "🍜", text: "热销", link: { type: "page", value: "" } },
          { icon: "🎁", text: "套餐", link: { type: "page", value: "" } },
          { icon: "🎫", text: "优惠券", link: { type: "page", value: "" } },
          { icon: "📋", text: "订单", link: { type: "page", value: "" } },
        ],
      };
    case "STORE_LIST":
      return { showDistance: true, showStatus: true, limit: 5 };
    case "PRODUCT_LIST":
      return { categoryId: null, limit: 10, style: "list", showSales: true, showDesc: true };
    case "PRODUCT_GRID":
      return { columns: 2, categoryId: null, limit: 8, showSales: false };
    case "PROMOTION":
      return { style: "grid", items: [] };
    case "STAMP_CARD_STD":
      return { title: "集点活动", subtitle: "集满兑换好礼", total: 10 };
    case "WECHAT_OA":
      return { appId: "", showGuide: true };
    case "COMBO_PROMO":
      return { title: "超值套餐", limit: 4 };
    case "SEARCH":
      return { placeholder: "搜索商品", bgColor: "#f5f5f5" };
    case "STORE_TITLE":
      return { showDistance: true, showStatus: true, showAddress: false };
    case "CART_FLOAT":
      return { position: "right-bottom", showCount: true, showPrice: true };
    case "NOTICE":
      return { scrollable: true, speed: 50, bgColor: "#fff7e6", textColor: "#d48806" };
    case "WECHAT_SHOP":
      return { title: "微信小店", limit: 4 };
    case "HOT_PRODUCTS":
      return { limit: 6, showRank: true, title: "热销推荐" };
    case "NEW_PRODUCTS":
      return { limit: 4, showBadge: true, title: "新品上市" };
    case "COUPON":
      return { showCount: 3, style: "horizontal" };
    case "SPACER":
      return { height: 20, backgroundColor: "#f5f5f5" };
    // 自由容器
    case "FREE_CONTAINER":
      return { height: 200, bgColor: "", bgImage: "", padding: 0, overflow: "hidden" };
    case "FLOAT_CONTAINER":
      return { position: "right-bottom", offsetX: 20, offsetY: 100, width: 60, height: 60 };
    // 基础元素
    case "IMAGE":
      return {
        image: "",
        height: 120,
        width: "100%",
        borderRadius: 0,
        link: { type: "none", value: "" },
      };
    case "TEXT":
      return {
        content: "请输入文本",
        fontSize: 14,
        color: "#333333",
        fontWeight: "normal",
        align: "left",
      };
    case "USER_NICKNAME":
      return { fontSize: 16, color: "#333333", prefix: "Hi, " };
    case "USER_AVATAR":
      return { size: 60, borderRadius: 30 };
    case "USER_PHONE":
      return { fontSize: 14, color: "#666666", masked: true };
    case "USER_POINTS":
      return { fontSize: 24, color: "#ff6b35", showLabel: true };
    case "USER_BALANCE":
      return { fontSize: 24, color: "#ff6b35", showLabel: true };
    case "COUPON_COUNT":
      return { fontSize: 14, color: "#ff6b35" };
    case "STORE_NAME":
      return { fontSize: 16, color: "#333333" };
    case "STORE_DISTANCE":
      return { fontSize: 12, color: "#999999" };
    case "MEMBER_BADGE":
      return { style: "default", showLevel: true };
    case "MEMBER_PROGRESS":
      return { height: 8, bgColor: "#eee", activeColor: "#ff6b35" };
    // 特殊/专属组件
    case "ORDER_COMPONENT":
      return { categoryStyle: "left", productStyle: "list", showSales: true, showCart: true };
    case "USER_INFO":
      return {
        showAvatar: true,
        showNickname: true,
        showBalance: true,
        showPoints: true,
        showCoupons: true,
      };
    case "FUNC_ENTRY":
      return {
        columns: 4,
        items: [
          { icon: "📋", text: "我的订单", link: { type: "page", value: "/pages/order/list" } },
          { icon: "🎫", text: "优惠券", link: { type: "page", value: "/pages/mine/coupons" } },
          { icon: "⭐", text: "收藏", link: { type: "page", value: "" } },
          { icon: "⚙️", text: "设置", link: { type: "page", value: "/pages/mine/settings" } },
        ],
      };
    case "MEMBER_RIGHTS":
      return { items: ["免费配送", "会员折扣", "生日特权", "积分加倍"] };
    case "MEMBER_LEVEL":
      return { showProgress: true, showUpgrade: true };
    case "RECHARGE_OPTIONS":
      return {
        columns: 2,
        items: [
          { amount: 100, gift: 10, giftType: "balance" },
          { amount: 200, gift: 30, giftType: "balance" },
          { amount: 500, gift: 100, giftType: "balance" },
        ],
      };
    case "RECHARGE_BUTTON":
      return { text: "立即充值", bgColor: "#ff6b35", textColor: "#ffffff" };
    default:
      return {};
  }
};

// 画布宽度（iPhone 15 Pro 屏幕宽度）
export const CANVAS_WIDTH = 375;
// 预览总高度（整个预览容器的高度）
export const PREVIEW_TOTAL_HEIGHT = 750;
// 状态栏高度
export const STATUS_BAR_HEIGHT = 54;
// TabBar 高度（底部导航栏）
export const TABBAR_HEIGHT = 84;
// 画布可用高度（预览总高度减去状态栏和 TabBar 高度，组件不能超出此区域）
export const CANVAS_MAX_HEIGHT = PREVIEW_TOTAL_HEIGHT - STATUS_BAR_HEIGHT - TABBAR_HEIGHT; // 612
// 画布最小高度（用于显示）
export const CANVAS_MIN_HEIGHT = CANVAS_MAX_HEIGHT;

// 组件默认尺寸
export const getDefaultSize = (type: PageComponentType): { width: number; height: number } => {
  switch (type) {
    case "BANNER":
      return { width: 375, height: 180 };
    case "NAV_GRID":
      return { width: 375, height: 100 };
    case "NOTICE":
      return { width: 375, height: 40 };
    case "HOT_PRODUCTS":
    case "NEW_PRODUCTS":
    case "PRODUCT_LIST":
      return { width: 375, height: 200 };
    case "PRODUCT_GRID":
      return { width: 375, height: 280 };
    case "IMAGE":
      return { width: 375, height: 150 };
    case "COUPON":
      return { width: 375, height: 100 };
    case "SPACER":
      return { width: 375, height: 20 };
    case "FOCUS_ENTRY":
      return { width: 375, height: 60 };
    case "STAMP_CARD":
      return { width: 375, height: 120 };
    case "SEARCH":
      return { width: 375, height: 40 };
    case "STORE_TITLE":
      return { width: 375, height: 60 };
    case "CART_FLOAT":
      return { width: 60, height: 60 };
    case "TEXT":
      return { width: 375, height: 40 };
    case "FREE_CONTAINER":
      return { width: 375, height: 200 };
    case "USER_INFO":
      return { width: 375, height: 120 };
    case "FUNC_ENTRY":
      return { width: 375, height: 80 };
    case "STORE_LIST":
      return { width: 375, height: 150 };
    case "FLOAT_WINDOW":
      return { width: 60, height: 60 };
    case "ORDER_COMPONENT":
      return { width: 375, height: 400 };
    default:
      return { width: 200, height: 100 };
  }
};
