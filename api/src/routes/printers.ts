import { Elysia, t } from "elysia";
import { eq, count } from "drizzle-orm";
import { db, printers, categoryPrinters, categories } from "../db";
import { success, error, pagination } from "../lib/utils";
import { requirePermission } from "../lib/auth";
import { logOperation } from "../lib/operation-log";

export const printerRoutes = new Elysia({ prefix: "/api/printers" })
  // 打印机读取需要 printer:read 权限
  .use(requirePermission("printer:read"))
  .get(
    "/",
    async ({ query }) => {
      const { page, pageSize, storeId } = query;
      const { take, skip } = pagination(page, pageSize);

      const whereClause = storeId ? eq(printers.storeId, storeId) : undefined;

      const [printerList, totalResult] = await Promise.all([
        db.select().from(printers).where(whereClause).limit(take).offset(skip),
        db.select({ count: count() }).from(printers).where(whereClause),
      ]);

      const result = await Promise.all(
        printerList.map(async (printer) => {
          const cats = await db
            .select({ category: categories })
            .from(categoryPrinters)
            .leftJoin(categories, eq(categoryPrinters.categoryId, categories.id))
            .where(eq(categoryPrinters.printerId, printer.id));

          return {
            ...printer,
            categories: cats.map((c) => ({ category: c.category })),
          };
        })
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
      }),
      detail: { tags: ["Printers"], summary: "获取打印机列表" },
    }
  )
  .get(
    "/:id",
    async ({ params }) => {
      const [printer] = await db.select().from(printers).where(eq(printers.id, params.id)).limit(1);

      if (!printer) return error("打印机不存在", 404);
      return success(printer);
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Printers"], summary: "获取打印机详情" },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      // 检查 SN 是否重复
      const existing = await db.select().from(printers).where(eq(printers.sn, body.sn)).limit(1);
      if (existing.length > 0) {
        return error("打印机 SN 已存在", 400);
      }

      const [printer] = await db
        .insert(printers)
        .values({
          storeId: body.storeId,
          sn: body.sn,
          key: body.key,
          name: body.name,
          type: (body.type as "KITCHEN" | "CASHIER" | "BAR") || "KITCHEN",
        })
        .returning();

      return success(printer, "打印机添加成功");
    },
    {
      body: t.Object({
        storeId: t.Number(),
        sn: t.String({ minLength: 1, maxLength: 100, error: "SN码1-100字符" }),
        key: t.String({ minLength: 1, maxLength: 100, error: "密钥1-100字符" }),
        name: t.String({ minLength: 1, maxLength: 50, error: "打印机名称1-50字符" }),
        type: t.Optional(t.Union([t.Literal("KITCHEN"), t.Literal("CASHIER"), t.Literal("BAR")])),
      }),
      detail: { tags: ["Printers"], summary: "添加打印机" },
    }
  )
  .put(
    "/:id",
    async ({ params, body }) => {
      const updateData: Record<string, unknown> = {};
      if (body.sn !== undefined) updateData.sn = body.sn;
      if (body.key !== undefined) updateData.key = body.key;
      if (body.name !== undefined) updateData.name = body.name;
      if (body.type !== undefined) updateData.type = body.type;
      if (body.status !== undefined) updateData.status = body.status;

      const [printer] = await db
        .update(printers)
        .set(updateData)
        .where(eq(printers.id, params.id))
        .returning();

      return success(printer, "打印机更新成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        sn: t.Optional(t.String()),
        key: t.Optional(t.String()),
        name: t.Optional(t.String()),
        type: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
      detail: { tags: ["Printers"], summary: "更新打印机" },
    }
  )
  .delete(
    "/:id",
    async ({ params, user }) => {
      const [existing] = await db
        .select()
        .from(printers)
        .where(eq(printers.id, params.id))
        .limit(1);
      await db.delete(categoryPrinters).where(eq(categoryPrinters.printerId, params.id));
      await db.delete(printers).where(eq(printers.id, params.id));

      await logOperation({
        adminId: user?.id,
        action: "delete",
        targetType: "printer",
        targetId: params.id,
        storeId: existing?.storeId ?? null,
        details: { name: existing?.name, type: existing?.type },
      });

      return success(null, "打印机删除成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Printers"], summary: "删除打印机" },
    }
  )
  .post(
    "/:id/test",
    async ({ params }) => {
      const [printer] = await db.select().from(printers).where(eq(printers.id, params.id)).limit(1);

      if (!printer) return error("打印机不存在", 404);

      // 这里应该调用打印机 API，暂时模拟
      console.log(`测试打印: ${printer.sn}`);

      return success(null, "测试打印已发送");
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Printers"], summary: "测试打印" },
    }
  )
  .post(
    "/:id/bind",
    async ({ params, body }) => {
      // 先删除旧的绑定
      await db.delete(categoryPrinters).where(eq(categoryPrinters.printerId, params.id));

      // 添加新绑定
      if (body.categoryIds && body.categoryIds.length > 0) {
        await db.insert(categoryPrinters).values(
          body.categoryIds.map((categoryId: number) => ({
            categoryId,
            printerId: params.id,
          }))
        );
      }

      return success(null, "绑定成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({ categoryIds: t.Array(t.Number()) }),
      detail: { tags: ["Printers"], summary: "绑定分类" },
    }
  );
