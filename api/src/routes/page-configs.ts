import { Elysia, t } from "elysia";
import { db, pageConfigs, type PageComponent } from "../db";
import { eq, and } from "drizzle-orm";
import { requirePermission, requireAuth } from "../lib/auth";

// 页面类型定义（10个Tab）
const PAGE_TYPES = [
  { value: "HOME", label: "首页" },
  { value: "MENU", label: "点餐页" },
  { value: "PRODUCT_DETAIL", label: "商品详情页" },
  { value: "ORDER_CENTER", label: "订单中心" },
  { value: "PROFILE", label: "个人中心" },
  { value: "MEMBER", label: "会员页" },
  { value: "BARRAGE", label: "用户下单弹幕" },
  { value: "TABBAR", label: "底部导航设计" },
  { value: "TOPIC", label: "专题页面" },
  { value: "RECHARGE", label: "充值页面" },
] as const;

// 组件类型定义（完整40+组件）
const COMPONENT_TYPES = [
  // 极简组件 (8个)
  { value: "FOCUS_ENTRY", label: "焦点入口", icon: "Zap", category: "simple" },
  { value: "STAMP_CARD", label: "集章/集点卡", icon: "Star", category: "simple" },
  { value: "COUPON_ENTRY", label: "领取优惠券", icon: "Ticket", category: "simple" },
  { value: "BALANCE_ENTRY", label: "储值余额", icon: "Wallet", category: "simple" },
  { value: "FLOAT_WINDOW", label: "悬浮窗口", icon: "Square", category: "simple" },
  { value: "POINTS_ENTRY", label: "会员积分", icon: "Award", category: "simple" },
  { value: "SERVICE_ENTRY", label: "客服入口", icon: "MessageCircle", category: "simple" },
  { value: "NEARBY_STORES", label: "附近门店", icon: "MapPin", category: "simple" },
  // 标准组件 (17个)
  { value: "BANNER", label: "轮播图", icon: "Image", category: "standard" },
  { value: "NAV_GRID", label: "导航", icon: "LayoutGrid", category: "standard" },
  { value: "STORE_LIST", label: "门店列表", icon: "Store", category: "standard" },
  { value: "PRODUCT_LIST", label: "商品列表", icon: "List", category: "standard" },
  { value: "PRODUCT_GRID", label: "商品网格", icon: "LayoutGrid", category: "standard" },
  { value: "PROMOTION", label: "营销模块", icon: "Gift", category: "standard" },
  { value: "STAMP_CARD_STD", label: "集点卡", icon: "Star", category: "standard" },
  { value: "WECHAT_OA", label: "公众号组件", icon: "Hash", category: "standard" },
  { value: "COMBO_PROMO", label: "套餐推广", icon: "Package", category: "standard" },
  { value: "SEARCH", label: "搜索模块", icon: "Search", category: "standard" },
  { value: "STORE_TITLE", label: "门店标题", icon: "Store", category: "standard" },
  { value: "CART_FLOAT", label: "购物车", icon: "ShoppingCart", category: "standard" },
  { value: "NOTICE", label: "公告栏", icon: "Bell", category: "standard" },
  { value: "HOT_PRODUCTS", label: "热销商品", icon: "Flame", category: "standard" },
  { value: "NEW_PRODUCTS", label: "新品推荐", icon: "Sparkles", category: "standard" },
  { value: "COUPON", label: "优惠券", icon: "Ticket", category: "standard" },
  { value: "SPACER", label: "分隔符", icon: "Minus", category: "standard" },
  // 自由容器 (2个)
  { value: "FREE_CONTAINER", label: "自由容器", icon: "Box", category: "container" },
  { value: "FLOAT_CONTAINER", label: "悬浮容器", icon: "Layers", category: "container" },
  // 基础元素 (12个)
  { value: "IMAGE", label: "图片", icon: "ImagePlus", category: "element" },
  { value: "TEXT", label: "文本", icon: "Type", category: "element" },
  { value: "USER_NICKNAME", label: "昵称", icon: "User", category: "element" },
  { value: "USER_AVATAR", label: "头像", icon: "Circle", category: "element" },
  { value: "USER_PHONE", label: "手机号", icon: "Phone", category: "element" },
  { value: "USER_POINTS", label: "积分", icon: "Award", category: "element" },
  { value: "USER_BALANCE", label: "余额", icon: "Wallet", category: "element" },
  { value: "COUPON_COUNT", label: "可用券数量", icon: "Ticket", category: "element" },
  { value: "STORE_NAME", label: "门店名称", icon: "Store", category: "element" },
  { value: "STORE_DISTANCE", label: "门店距离", icon: "MapPin", category: "element" },
  { value: "MEMBER_BADGE", label: "会员标识", icon: "Crown", category: "element" },
  { value: "MEMBER_PROGRESS", label: "会员进度", icon: "BarChart", category: "element" },
  // 专属组件 (7个)
  {
    value: "ORDER_COMPONENT",
    label: "点单组件",
    icon: "ShoppingCart",
    category: "special",
    availableIn: ["MENU"],
  },
  {
    value: "USER_INFO",
    label: "会员信息",
    icon: "User",
    category: "special",
    availableIn: ["PROFILE"],
  },
  {
    value: "FUNC_ENTRY",
    label: "功能入口",
    icon: "LayoutGrid",
    category: "special",
    availableIn: ["PROFILE"],
  },
  {
    value: "MEMBER_RIGHTS",
    label: "会员权益",
    icon: "Award",
    category: "special",
    availableIn: ["MEMBER"],
  },
  {
    value: "MEMBER_LEVEL",
    label: "会员等级",
    icon: "Crown",
    category: "special",
    availableIn: ["MEMBER"],
  },
  {
    value: "RECHARGE_OPTIONS",
    label: "充值选项",
    icon: "CreditCard",
    category: "special",
    availableIn: ["RECHARGE"],
  },
  {
    value: "RECHARGE_BUTTON",
    label: "充值按钮",
    icon: "Wallet",
    category: "special",
    availableIn: ["RECHARGE"],
  },
] as const;

// 精美的酒馆主题预设首页模板
// 精心设计的布局：合理的间距、视觉层次、对齐和留白
// 总高度：180 + 40 + 16 + 40 + 16 + 100 + 16 + 60 + 16 + 192 = 676px（超出612px，需要调整）
// 优化后：180 + 40 + 12 + 40 + 12 + 100 + 12 + 60 + 12 + 180 = 648px（超出，继续优化）
// 最终：180 + 40 + 8 + 40 + 8 + 100 + 8 + 60 + 8 + 180 = 632px（超出20px，需要压缩）
// 最终优化：180 + 40 + 8 + 40 + 8 + 90 + 8 + 56 + 8 + 174 = 612px ✓
const DEFAULT_HOME_COMPONENTS: PageComponent[] = [
  // 1. 轮播图 - 全宽，顶部
  {
    id: "preset-banner-1",
    type: "BANNER",
    title: "轮播图",
    visible: true,
    x: 0,
    y: 0,
    width: 375,
    height: 180,
    zIndex: 1,
    props: {
      autoplay: true,
      interval: 3000,
      height: 180,
      showIndicator: true,
      indicatorStyle: "dot",
      indicatorPosition: "center",
      indicatorColor: "white",
    },
  },
  // 2. 公告栏 - 全宽，紧贴轮播图
  {
    id: "preset-notice-1",
    type: "NOTICE",
    title: "公告栏",
    visible: true,
    x: 0,
    y: 180,
    width: 375,
    height: 40,
    zIndex: 2,
    props: {
      scrollable: true,
      speed: 50,
      bgColor: "#2c1810",
      textColor: "#d4a574",
    },
  },
  // 3. 搜索模块 - 左右留白16px，顶部间距8px
  {
    id: "preset-search-1",
    type: "SEARCH",
    title: "搜索模块",
    visible: true,
    x: 16,
    y: 228, // 180 + 40 + 8
    width: 343, // 375 - 16*2
    height: 40,
    zIndex: 3,
    props: {
      placeholder: "搜索酒品、小食...",
      bgColor: "#f5f3f0",
    },
  },
  // 4. 快捷导航 - 左右留白16px，顶部间距8px
  {
    id: "preset-nav-1",
    type: "NAV_GRID",
    title: "快捷导航",
    visible: true,
    x: 16,
    y: 276, // 228 + 40 + 8
    width: 343,
    height: 90, // 从100压缩到90
    zIndex: 4,
    props: {
      columns: 4,
      items: [
        { icon: "🍺", text: "精酿", link: { type: "category", value: "" } },
        { icon: "🥃", text: "威士忌", link: { type: "category", value: "" } },
        { icon: "🍸", text: "鸡尾酒", link: { type: "category", value: "" } },
        { icon: "🍖", text: "小食", link: { type: "category", value: "" } },
      ],
    },
  },
  // 5. 焦点入口 - 左右留白16px，顶部间距8px
  {
    id: "preset-focus-1",
    type: "FOCUS_ENTRY",
    title: "焦点入口",
    visible: true,
    x: 16,
    y: 374, // 276 + 90 + 8
    width: 343,
    height: 56, // 从60压缩到56
    zIndex: 5,
    props: {
      icon: "🍻",
      text: "立即点单",
      bgColor: "#8B4513",
      link: { type: "page", value: "/pages/menu/menu" },
    },
  },
  // 6. 热销推荐 - 左右留白16px，顶部间距8px
  {
    id: "preset-hot-1",
    type: "HOT_PRODUCTS",
    title: "热销推荐",
    visible: true,
    x: 16,
    y: 438, // 374 + 56 + 8
    width: 343,
    height: 174, // 从192压缩到174，确保总高度612px
    zIndex: 6,
    props: {
      limit: 6,
      showRank: true,
      title: "🍺 人气推荐",
    },
  },
];

// 精美的酒馆主题预设点餐页模板
// 所有组件宽度统一为 375px，垂直排列，确保不超出 TabBar 区域（612px 高度）
const DEFAULT_MENU_COMPONENTS: PageComponent[] = [
  {
    id: "preset-menu-banner-1",
    type: "BANNER",
    title: "轮播图",
    visible: true,
    x: 0,
    y: 0,
    width: 375,
    height: 180,
    zIndex: 1,
    props: {
      autoplay: true,
      interval: 3000,
      height: 180,
      showIndicator: true,
      indicatorStyle: "dot",
      indicatorPosition: "center",
      indicatorColor: "white",
    },
  },
  {
    id: "preset-menu-notice-1",
    type: "NOTICE",
    title: "公告栏",
    visible: true,
    x: 0,
    y: 180,
    width: 375,
    height: 40,
    zIndex: 2,
    props: {
      scrollable: true,
      speed: 50,
      bgColor: "#2c1810",
      textColor: "#d4a574",
    },
  },
  {
    id: "preset-menu-order-1",
    type: "ORDER_COMPONENT",
    title: "点单组件",
    visible: true,
    x: 0,
    y: 220,
    width: 375,
    height: 392, // 612 - 220 = 392，确保不超出 TabBar 区域
    zIndex: 3,
    props: {
      categoryStyle: "left",
      productStyle: "large",
      showSales: true,
      showStock: false,
      showDesc: true,
      showCart: true,
    },
  },
];

// 公开接口 (小程序用)
const publicRoutes = new Elysia().get(
  "/published",
  async ({ query }) => {
    const { storeId } = query;
    const pageType = query.pageType || "HOME";

    if (!storeId) {
      return { code: 400, message: "storeId 必填" };
    }

    const config = await db
      .select()
      .from(pageConfigs)
      .where(
        and(
          eq(pageConfigs.storeId, Number(storeId)),
          eq(pageConfigs.pageType, pageType),
          eq(pageConfigs.isPublished, true)
        )
      )
      .limit(1);

    const found = config[0];
    if (!found) {
      // 返回预设的精美布局（根据页面类型）
      const presetComponents =
        pageType === "MENU" ? DEFAULT_MENU_COMPONENTS : DEFAULT_HOME_COMPONENTS;
      return {
        code: 200,
        data: {
          pageType,
          components: presetComponents,
          isDefault: true,
        },
      };
    }

    return {
      code: 200,
      data: {
        pageType: found.pageType,
        components: found.components,
        publishedAt: found.publishedAt,
        isDefault: false,
      },
    };
  },
  {
    query: t.Object({
      storeId: t.String(),
      pageType: t.Optional(t.String()),
    }),
  }
);

// 管理端接口 (需要认证)
const adminRoutes = new Elysia()
  .use(requirePermission("store:write"))

  // 获取组件类型列表
  .get("/component-types", () => {
    return { code: 200, data: COMPONENT_TYPES };
  })

  // 获取默认模板
  .get("/templates", () => {
    return {
      code: 200,
      data: [
        {
          name: "精美首页",
          pageType: "HOME",
          components: DEFAULT_HOME_COMPONENTS,
        },
        {
          name: "精美点餐页",
          pageType: "MENU",
          components: DEFAULT_MENU_COMPONENTS,
        },
      ],
    };
  })

  // 获取门店的页面配置
  .get(
    "/",
    async ({ query, user }) => {
      const { storeId } = query;
      const pageType = query.pageType || "HOME";

      const targetStoreId = storeId ? Number(storeId) : user?.storeId;
      if (!targetStoreId) {
        return { code: 400, message: "storeId 必填" };
      }

      const config = await db
        .select()
        .from(pageConfigs)
        .where(and(eq(pageConfigs.storeId, targetStoreId), eq(pageConfigs.pageType, pageType)))
        .limit(1);

      if (config.length === 0) {
        // 返回预设的精美布局（根据页面类型）
        const presetComponents =
          pageType === "MENU" ? DEFAULT_MENU_COMPONENTS : DEFAULT_HOME_COMPONENTS;
        return {
          code: 200,
          data: {
            id: null,
            storeId: targetStoreId,
            pageType,
            components: presetComponents,
            isPublished: false,
            publishedAt: null,
            isDefault: true,
          },
        };
      }

      return { code: 200, data: { ...config[0], isDefault: false } };
    },
    {
      query: t.Object({
        storeId: t.Optional(t.String()),
        pageType: t.Optional(t.String()),
      }),
    }
  )

  // 保存页面配置（草稿）
  .put(
    "/",
    async ({ body, user }) => {
      const { storeId, components } = body;
      const pageType = body.pageType || "HOME";

      const targetStoreId = storeId ?? user?.storeId;
      if (!targetStoreId) {
        return { code: 400, message: "storeId 必填" };
      }

      // 查找现有配置
      const existing = await db
        .select()
        .from(pageConfigs)
        .where(and(eq(pageConfigs.storeId, targetStoreId), eq(pageConfigs.pageType, pageType)))
        .limit(1);

      let result;
      const existingConfig = existing[0];
      if (existingConfig) {
        // 更新
        [result] = await db
          .update(pageConfigs)
          .set({
            components,
            updatedAt: new Date(),
          })
          .where(eq(pageConfigs.id, existingConfig.id))
          .returning();
      } else {
        // 新建
        [result] = await db
          .insert(pageConfigs)
          .values({
            storeId: targetStoreId,
            pageType,
            components,
            isPublished: false,
          })
          .returning();
      }

      return { code: 200, data: result, message: "保存成功" };
    },
    {
      body: t.Object({
        storeId: t.Optional(t.Number()),
        pageType: t.Optional(t.String()),
        components: t.Array(
          t.Object({
            id: t.String(),
            type: t.String(),
            title: t.Optional(t.String()),
            visible: t.Boolean(),
            props: t.Record(t.String(), t.Unknown()),
          })
        ),
      }),
    }
  )

  // 发布页面配置
  .post(
    "/publish",
    async ({ body, user }) => {
      const { storeId } = body;
      const pageType = body.pageType || "HOME";

      const targetStoreId = storeId ?? user?.storeId;
      if (!targetStoreId) {
        return { code: 400, message: "storeId 必填" };
      }

      const existing = await db
        .select()
        .from(pageConfigs)
        .where(and(eq(pageConfigs.storeId, targetStoreId), eq(pageConfigs.pageType, pageType)))
        .limit(1);

      const existingConfig = existing[0];
      if (!existingConfig) {
        return { code: 404, message: "请先保存配置" };
      }

      const [result] = await db
        .update(pageConfigs)
        .set({
          isPublished: true,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pageConfigs.id, existingConfig.id))
        .returning();

      return { code: 200, data: result, message: "发布成功" };
    },
    {
      body: t.Object({
        storeId: t.Optional(t.Number()),
        pageType: t.Optional(t.String()),
      }),
    }
  )

  // 撤销发布
  .post(
    "/unpublish",
    async ({ body, user }) => {
      const { storeId } = body;
      const pageType = body.pageType || "HOME";

      const targetStoreId = storeId ?? user?.storeId;
      if (!targetStoreId) {
        return { code: 400, message: "storeId 必填" };
      }

      const existing = await db
        .select()
        .from(pageConfigs)
        .where(and(eq(pageConfigs.storeId, targetStoreId), eq(pageConfigs.pageType, pageType)))
        .limit(1);

      const existingConfig = existing[0];
      if (!existingConfig) {
        return { code: 404, message: "配置不存在" };
      }

      const [result] = await db
        .update(pageConfigs)
        .set({
          isPublished: false,
          updatedAt: new Date(),
        })
        .where(eq(pageConfigs.id, existingConfig.id))
        .returning();

      return { code: 200, data: result, message: "已撤销发布" };
    },
    {
      body: t.Object({
        storeId: t.Optional(t.Number()),
        pageType: t.Optional(t.String()),
      }),
    }
  )

  // 重置为默认配置
  .post(
    "/reset",
    async ({ body, user }) => {
      const { storeId } = body;
      const pageType = body.pageType || "HOME";

      const targetStoreId = storeId ?? user?.storeId;
      if (!targetStoreId) {
        return { code: 400, message: "storeId 必填" };
      }

      const existing = await db
        .select()
        .from(pageConfigs)
        .where(and(eq(pageConfigs.storeId, targetStoreId), eq(pageConfigs.pageType, pageType)))
        .limit(1);

      const existingConfig = existing[0];
      const presetComponents =
        pageType === "MENU" ? DEFAULT_MENU_COMPONENTS : DEFAULT_HOME_COMPONENTS;

      if (existingConfig) {
        const [result] = await db
          .update(pageConfigs)
          .set({
            components: presetComponents,
            isPublished: false,
            updatedAt: new Date(),
          })
          .where(eq(pageConfigs.id, existingConfig.id))
          .returning();

        return { code: 200, data: result, message: "已重置为预设配置" };
      }

      return {
        code: 200,
        data: {
          storeId: targetStoreId,
          pageType,
          components: presetComponents,
          isPublished: false,
        },
        message: "已重置为预设配置",
      };
    },
    {
      body: t.Object({
        storeId: t.Optional(t.Number()),
        pageType: t.Optional(t.String()),
      }),
    }
  )

  // 获取组件类型列表
  .get("/component-types", async ({ query }) => {
    const { pageType } = query;

    // 如果指定了页面类型，过滤出可用的组件
    let types = [...COMPONENT_TYPES];
    if (pageType) {
      types = types.filter((t) => {
        // 如果组件没有availableIn限制，则所有页面可用
        if (!("availableIn" in t) || !t.availableIn) return true;
        // 否则检查是否在可用页面列表中
        return (t.availableIn as readonly string[]).includes(pageType);
      });
    }

    return { code: 200, data: types };
  })

  // 获取页面类型列表
  .get("/page-types", async () => {
    return { code: 200, data: PAGE_TYPES };
  });

export const pageConfigRoutes = new Elysia({ prefix: "/api/page-configs" })
  .use(publicRoutes)
  .use(adminRoutes);
