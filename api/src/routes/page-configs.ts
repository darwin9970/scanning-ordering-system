import { Elysia, t } from "elysia";
import { db, pageConfigs, type PageComponent } from "../db";
import { eq, and } from "drizzle-orm";
import { requirePermission, requireAuth } from "../lib/auth";

// 组件类型定义
const COMPONENT_TYPES = [
  { value: "BANNER", label: "轮播图", icon: "Image" },
  { value: "NAV_GRID", label: "金刚区", icon: "Grid" },
  { value: "PRODUCT_LIST", label: "商品列表", icon: "List" },
  { value: "PRODUCT_GRID", label: "商品网格", icon: "LayoutGrid" },
  { value: "NOTICE", label: "公告栏", icon: "Bell" },
  { value: "SPACER", label: "分隔符", icon: "Minus" },
  { value: "IMAGE", label: "单图广告", icon: "ImagePlus" },
  { value: "COUPON", label: "优惠券", icon: "Ticket" },
  { value: "HOT_PRODUCTS", label: "热销商品", icon: "Flame" },
  { value: "NEW_PRODUCTS", label: "新品推荐", icon: "Sparkles" },
] as const;

// 默认首页模板
const DEFAULT_HOME_COMPONENTS: PageComponent[] = [
  {
    id: "default-banner",
    type: "BANNER",
    title: "轮播图",
    visible: true,
    props: {
      autoplay: true,
      interval: 3000,
      height: 180,
    },
  },
  {
    id: "default-notice",
    type: "NOTICE",
    title: "公告栏",
    visible: true,
    props: {
      scrollable: true,
      speed: 50,
    },
  },
  {
    id: "default-nav-grid",
    type: "NAV_GRID",
    title: "快捷导航",
    visible: true,
    props: {
      columns: 4,
      items: [
        { icon: "🍜", text: "热销", link: { type: "category", value: "" } },
        { icon: "🎁", text: "套餐", link: { type: "page", value: "/pages/combos/list" } },
        { icon: "🎫", text: "优惠券", link: { type: "page", value: "/pages/mine/coupons" } },
        { icon: "📋", text: "订单", link: { type: "page", value: "/pages/order/list" } },
      ],
    },
  },
  {
    id: "default-hot",
    type: "HOT_PRODUCTS",
    title: "热销推荐",
    visible: true,
    props: {
      limit: 6,
      showRank: true,
    },
  },
];

// 公开接口 (小程序用)
const publicRoutes = new Elysia()
  .get(
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
        // 返回默认配置
        return {
          code: 200,
          data: {
            pageType,
            components: DEFAULT_HOME_COMPONENTS,
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
          name: "默认首页",
          pageType: "HOME",
          components: DEFAULT_HOME_COMPONENTS,
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
        .where(
          and(
            eq(pageConfigs.storeId, targetStoreId),
            eq(pageConfigs.pageType, pageType)
          )
        )
        .limit(1);

      if (config.length === 0) {
        // 返回默认配置，但未保存
        return {
          code: 200,
          data: {
            id: null,
            storeId: targetStoreId,
            pageType,
            components: DEFAULT_HOME_COMPONENTS,
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
        .where(
          and(
            eq(pageConfigs.storeId, targetStoreId),
            eq(pageConfigs.pageType, pageType)
          )
        )
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
        .where(
          and(
            eq(pageConfigs.storeId, targetStoreId),
            eq(pageConfigs.pageType, pageType)
          )
        )
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
        .where(
          and(
            eq(pageConfigs.storeId, targetStoreId),
            eq(pageConfigs.pageType, pageType)
          )
        )
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
        .where(
          and(
            eq(pageConfigs.storeId, targetStoreId),
            eq(pageConfigs.pageType, pageType)
          )
        )
        .limit(1);

      const existingConfig = existing[0];
      if (existingConfig) {
        const [result] = await db
          .update(pageConfigs)
          .set({
            components: DEFAULT_HOME_COMPONENTS,
            isPublished: false,
            updatedAt: new Date(),
          })
          .where(eq(pageConfigs.id, existingConfig.id))
          .returning();

        return { code: 200, data: result, message: "已重置为默认配置" };
      }

      return {
        code: 200,
        data: {
          storeId: targetStoreId,
          pageType,
          components: DEFAULT_HOME_COMPONENTS,
          isPublished: false,
        },
        message: "已重置为默认配置",
      };
    },
    {
      body: t.Object({
        storeId: t.Optional(t.Number()),
        pageType: t.Optional(t.String()),
      }),
    }
  );

export const pageConfigRoutes = new Elysia({ prefix: "/api/page-configs" })
  .use(publicRoutes)
  .use(adminRoutes);
