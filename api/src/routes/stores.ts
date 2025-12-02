import { Elysia, t } from "elysia";
import { eq, like, or, desc, sql, count } from "drizzle-orm";
import { db, stores, tables, categories, printers, products, orders } from "../db";
import { success, error, pagination } from "../lib/utils";

export const storeRoutes = new Elysia({ prefix: "/api/stores" })
  .get(
    "/",
    async ({ query }) => {
      const { page, pageSize, keyword, status } = query;
      const { take, skip } = pagination(page, pageSize);

      const conditions = [];
      if (keyword) {
        conditions.push(
          or(like(stores.name, `%${keyword}%`), like(stores.address, `%${keyword}%`))
        );
      }
      if (status) {
        conditions.push(eq(stores.status, status as "ACTIVE" | "CLOSED" | "DISABLED"));
      }

      const whereClause = conditions.length > 0 ? conditions[0] : undefined;

      const [storeList, totalResult] = await Promise.all([
        db
          .select()
          .from(stores)
          .where(whereClause)
          .orderBy(desc(stores.createdAt))
          .limit(take)
          .offset(skip),
        db.select({ count: count() }).from(stores).where(whereClause),
      ]);

      // 获取关联计数
      const storesWithCounts = await Promise.all(
        storeList.map(async (store) => {
          const [tableCount, productCount] = await Promise.all([
            db.select({ count: count() }).from(tables).where(eq(tables.storeId, store.id)),
            db.select({ count: count() }).from(products).where(eq(products.storeId, store.id)),
          ]);
          return {
            ...store,
            _count: { tables: tableCount[0]?.count ?? 0, products: productCount[0]?.count ?? 0 },
          };
        })
      );

      return success({
        list: storesWithCounts,
        total: totalResult[0]?.count ?? 0,
        page: page || 1,
        pageSize: take,
      });
    },
    {
      query: t.Object({
        page: t.Optional(t.Number()),
        pageSize: t.Optional(t.Number()),
        keyword: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Stores"],
        summary: "获取门店列表",
      },
    }
  )
  .get(
    "/:id",
    async ({ params }) => {
      const [store] = await db.select().from(stores).where(eq(stores.id, params.id)).limit(1);

      if (!store) {
        return error("门店不存在", 404);
      }

      const [tableList, categoryList, printerList, orderCount, productCount] = await Promise.all([
        db.select().from(tables).where(eq(tables.storeId, params.id)),
        db
          .select()
          .from(categories)
          .where(eq(categories.storeId, params.id))
          .orderBy(categories.sort),
        db.select().from(printers).where(eq(printers.storeId, params.id)),
        db.select({ count: count() }).from(orders).where(eq(orders.storeId, params.id)),
        db.select({ count: count() }).from(products).where(eq(products.storeId, params.id)),
      ]);

      return success({
        ...store,
        tables: tableList,
        categories: categoryList,
        printers: printerList,
        _count: { orders: orderCount[0]?.count ?? 0, products: productCount[0]?.count ?? 0 },
      });
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      detail: {
        tags: ["Stores"],
        summary: "获取门店详情",
      },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      const [store] = await db
        .insert(stores)
        .values({
          name: body.name,
          address: body.address,
          phone: body.phone,
          latitude: body.latitude?.toString(),
          longitude: body.longitude?.toString(),
          logo: body.logo,
        })
        .returning();

      return success(store, "门店创建成功");
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100, error: "门店名称1-100字符" }),
        address: t.Optional(t.String({ maxLength: 200, error: "地址最多200字符" })),
        phone: t.Optional(t.String({ pattern: "^1[3-9]\\d{9}$", error: "请输入正确的手机号" })),
        latitude: t.Optional(t.Number({ minimum: -90, maximum: 90 })),
        longitude: t.Optional(t.Number({ minimum: -180, maximum: 180 })),
        logo: t.Optional(t.String({ maxLength: 500 })),
      }),
      detail: {
        tags: ["Stores"],
        summary: "创建门店",
      },
    }
  )
  .put(
    "/:id",
    async ({ params, body }) => {
      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.phone !== undefined) updateData.phone = body.phone;
      if (body.latitude !== undefined) updateData.latitude = body.latitude.toString();
      if (body.longitude !== undefined) updateData.longitude = body.longitude.toString();
      if (body.logo !== undefined) updateData.logo = body.logo;
      if (body.status !== undefined) updateData.status = body.status;

      const [store] = await db
        .update(stores)
        .set(updateData)
        .where(eq(stores.id, params.id))
        .returning();

      return success(store, "门店更新成功");
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        address: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        latitude: t.Optional(t.Number()),
        longitude: t.Optional(t.Number()),
        logo: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Stores"],
        summary: "更新门店",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params }) => {
      await db.delete(stores).where(eq(stores.id, params.id));

      return success(null, "门店删除成功");
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      detail: {
        tags: ["Stores"],
        summary: "删除门店",
      },
    }
  );
