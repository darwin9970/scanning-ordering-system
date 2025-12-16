import { Elysia, t } from "elysia";
import { eq, and, asc, count } from "drizzle-orm";
import { db, categories, stores, products, categoryPrinters, printers } from "../db";
import { success, error, pagination } from "../lib/utils";
import { requirePermission } from "../lib/auth";
import { logOperation } from "../lib/operation-log";

export const categoryRoutes = new Elysia({ prefix: "/api/categories" })
  // 分类读取需要 category:read 权限
  .use(requirePermission("category:read"))
  .get(
    "/",
    async ({ query }) => {
      const { page, pageSize, storeId, status } = query;
      const { take, skip } = pagination(page, pageSize);

      const conditions = [];
      if (storeId) conditions.push(eq(categories.storeId, storeId));
      if (status) conditions.push(eq(categories.status, status as "ACTIVE" | "INACTIVE"));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [categoryList, totalResult] = await Promise.all([
        db
          .select()
          .from(categories)
          .leftJoin(stores, eq(categories.storeId, stores.id))
          .where(whereClause)
          .orderBy(asc(categories.sort))
          .limit(take)
          .offset(skip),
        db.select({ count: count() }).from(categories).where(whereClause),
      ]);

      const result = await Promise.all(
        categoryList.map(
          async (row: {
            categories: typeof categories.$inferSelect;
            stores: typeof stores.$inferSelect | null;
          }) => {
            const [productCount] = await db
              .select({ count: count() })
              .from(products)
              .where(eq(products.categoryId, row.categories.id));

            const printerList = await db
              .select({ printer: printers })
              .from(categoryPrinters)
              .leftJoin(printers, eq(categoryPrinters.printerId, printers.id))
              .where(eq(categoryPrinters.categoryId, row.categories.id));

            return {
              ...row.categories,
              store: row.stores,
              _count: { products: productCount?.count ?? 0 },
              printers: printerList.map((p: { printer: typeof printers.$inferSelect | null }) => ({
                printer: p.printer,
              })),
            };
          }
        )
      );

      return success({
        list: result,
        total: totalResult[0]?.count ?? 0,
        page: page || 1,
        pageSize: take,
      });
    },
    {
      query: t.Object({
        page: t.Optional(t.Number()),
        pageSize: t.Optional(t.Number()),
        storeId: t.Optional(t.Number()),
        status: t.Optional(t.String()),
      }),
      detail: { tags: ["Categories"], summary: "获取分类列表" },
    }
  )
  .get(
    "/:id",
    async ({ params }) => {
      const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, params.id))
        .limit(1);

      if (!category) return error("分类不存在", 404);
      return success(category);
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Categories"], summary: "获取分类详情" },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      const [category] = await db
        .insert(categories)
        .values({
          storeId: body.storeId,
          name: body.name,
          sort: body.sort || 0,
          icon: body.icon,
        })
        .returning();

      return success(category, "分类创建成功");
    },
    {
      body: t.Object({
        storeId: t.Number(),
        name: t.String({ minLength: 1, maxLength: 50, error: "分类名称1-50字符" }),
        sort: t.Optional(t.Number({ minimum: 0, maximum: 999, error: "排序值0-999" })),
        icon: t.Optional(t.String({ maxLength: 50 })),
      }),
      detail: { tags: ["Categories"], summary: "创建分类" },
    }
  )
  .put(
    "/:id",
    async ({ params, body }) => {
      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.sort !== undefined) updateData.sort = body.sort;
      if (body.icon !== undefined) updateData.icon = body.icon;
      if (body.status !== undefined) updateData.status = body.status;

      const [category] = await db
        .update(categories)
        .set(updateData)
        .where(eq(categories.id, params.id))
        .returning();

      return success(category, "分类更新成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        name: t.Optional(t.String()),
        sort: t.Optional(t.Number()),
        icon: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
      detail: { tags: ["Categories"], summary: "更新分类" },
    }
  )
  .put(
    "/sort",
    async ({ body }) => {
      const { items } = body;

      // 批量更新排序
      await Promise.all(
        items.map((item) =>
          db.update(categories).set({ sort: item.sort }).where(eq(categories.id, item.id))
        )
      );

      return success(null, "排序更新成功");
    },
    {
      body: t.Object({
        items: t.Array(
          t.Object({
            id: t.Number(),
            sort: t.Number(),
          })
        ),
      }),
      detail: { tags: ["Categories"], summary: "批量更新分类排序" },
    }
  )
  .delete(
    "/:id",
    async ({ params, user }) => {
      const [productCount] = await db
        .select({ count: count() })
        .from(products)
        .where(eq(products.categoryId, params.id));

      if ((productCount?.count ?? 0) > 0) {
        return error("该分类下有商品，无法删除", 400);
      }

      const [existing] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, params.id))
        .limit(1);
      await db.delete(categories).where(eq(categories.id, params.id));

      await logOperation({
        adminId: user?.id,
        action: "delete",
        targetType: "category",
        targetId: params.id,
        storeId: existing?.storeId ?? null,
        details: { name: existing?.name },
      });
      return success(null, "分类删除成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Categories"], summary: "删除分类" },
    }
  );
