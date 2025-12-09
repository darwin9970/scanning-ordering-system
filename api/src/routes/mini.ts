/**
 * 小程序公共接口 - 无需认证
 */
import { Elysia, t } from "elysia";
import { eq, and, asc, desc } from "drizzle-orm";
import { db, tables, stores, categories, products, banners, coupons } from "../db";
import { success, error } from "../lib/utils";

export const miniRoutes = new Elysia({ prefix: "/mini" })
  // 获取桌台信息（通过二维码）
  .get(
    "/table/:qrCode",
    async ({ params }) => {
      const result = await db
        .select()
        .from(tables)
        .leftJoin(stores, eq(tables.storeId, stores.id))
        .where(eq(tables.qrCode, params.qrCode))
        .limit(1);

      if (result.length === 0) {
        return error("桌台不存在或二维码无效", 404);
      }

      const row = result[0]!;
      return success({
        table: {
          id: row.tables.id,
          name: row.tables.name,
          capacity: row.tables.capacity,
          status: row.tables.status,
        },
        store: row.stores ? {
          id: row.stores.id,
          name: row.stores.name,
          logo: row.stores.logo,
          welcomeText: row.stores.welcomeText,
          orderTip: row.stores.orderTip,
          businessHours: row.stores.businessHours,
        } : null,
      });
    },
    {
      params: t.Object({ qrCode: t.String() }),
      detail: { tags: ["Mini"], summary: "通过二维码获取桌台信息" },
    }
  )
  // 获取门店信息
  .get(
    "/store/:id",
    async ({ params }) => {
      const [store] = await db
        .select()
        .from(stores)
        .where(eq(stores.id, params.id))
        .limit(1);

      if (!store) {
        return error("门店不存在", 404);
      }

      return success({
        id: store.id,
        name: store.name,
        logo: store.logo,
        welcomeText: store.welcomeText,
        orderTip: store.orderTip,
        businessHours: store.businessHours,
      });
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Mini"], summary: "获取门店信息" },
    }
  )
  // 获取分类列表
  .get(
    "/categories",
    async ({ query }) => {
      const storeId = query.storeId;
      if (!storeId) {
        return error("storeId 必填", 400);
      }

      const categoryList = await db
        .select()
        .from(categories)
        .where(and(eq(categories.storeId, storeId), eq(categories.status, "ACTIVE")))
        .orderBy(asc(categories.sort));

      return success(categoryList);
    },
    {
      query: t.Object({ storeId: t.Number() }),
      detail: { tags: ["Mini"], summary: "获取分类列表" },
    }
  )
  // 获取商品列表
  .get(
    "/products",
    async ({ query }) => {
      const { storeId, categoryId } = query;
      if (!storeId) {
        return error("storeId 必填", 400);
      }

      const conditions = [
        eq(products.storeId, storeId),
        eq(products.status, "AVAILABLE"),
      ];
      if (categoryId) {
        conditions.push(eq(products.categoryId, categoryId));
      }

      const productList = await db
        .select()
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(asc(products.sort));

      return success({
        list: productList.map((r) => ({
          id: r.products.id,
          categoryId: r.products.categoryId,
          name: r.products.name,
          description: r.products.description,
          image: r.products.imageUrl,
          price: Number(r.products.basePrice),
          sales: r.products.sales,
          status: r.products.status,
          createdAt: r.products.createdAt,
          category: r.categories ? { id: r.categories.id, name: r.categories.name } : null,
        })),
      });
    },
    {
      query: t.Object({
        storeId: t.Number(),
        categoryId: t.Optional(t.Number()),
      }),
      detail: { tags: ["Mini"], summary: "获取商品列表" },
    }
  )
  // 获取商品详情
  .get(
    "/products/:id",
    async ({ params }) => {
      const [result] = await db
        .select()
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.id, params.id))
        .limit(1);

      if (!result) {
        return error("商品不存在", 404);
      }

      return success({
        id: result.products.id,
        categoryId: result.products.categoryId,
        name: result.products.name,
        description: result.products.description,
        image: result.products.imageUrl,
        price: Number(result.products.basePrice),
        sales: result.products.sales,
        status: result.products.status,
        createdAt: result.products.createdAt,
        category: result.categories ? { id: result.categories.id, name: result.categories.name } : null,
      });
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Mini"], summary: "获取商品详情" },
    }
  )
  // 获取轮播图
  .get(
    "/banners",
    async ({ query }) => {
      const storeId = query.storeId;
      if (!storeId) {
        return error("storeId 必填", 400);
      }

      const bannerList = await db
        .select()
        .from(banners)
        .where(and(eq(banners.storeId, storeId), eq(banners.isActive, true)))
        .orderBy(asc(banners.sort));

      return success(bannerList);
    },
    {
      query: t.Object({ storeId: t.Number() }),
      detail: { tags: ["Mini"], summary: "获取轮播图列表" },
    }
  )
  // 获取可领取优惠券
  .get(
    "/coupons",
    async ({ query }) => {
      const storeId = query.storeId;
      if (!storeId) {
        return error("storeId 必填", 400);
      }

      const now = new Date();
      const couponList = await db
        .select()
        .from(coupons)
        .where(eq(coupons.storeId, storeId));

      // 过滤有效的优惠券
      const validCoupons = couponList.filter((c) => {
        if (c.status !== "ACTIVE") return false;
        if (c.startTime && new Date(c.startTime) > now) return false;
        if (c.endTime && new Date(c.endTime) < now) return false;
        if (c.totalCount !== null && c.usedCount >= c.totalCount) return false;
        return true;
      });

      return success(
        validCoupons.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          value: Number(c.value),
          minAmount: Number(c.minAmount),
          startTime: c.startTime,
          endTime: c.endTime,
        }))
      );
    },
    {
      query: t.Object({ storeId: t.Number() }),
      detail: { tags: ["Mini"], summary: "获取可领取优惠券" },
    }
  );
