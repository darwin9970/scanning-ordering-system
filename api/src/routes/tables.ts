import { Elysia, t } from "elysia";
import { eq, and, asc, count } from "drizzle-orm";
import { db, tables, stores } from "../db";
import { success, error, pagination, generateQrToken } from "../lib/utils";

export const tableRoutes = new Elysia({ prefix: "/api/tables" })
  .get(
    "/",
    async ({ query }) => {
      const { page, pageSize, storeId, status } = query;
      const { take, skip } = pagination(page, pageSize);

      const conditions = [];
      if (storeId) conditions.push(eq(tables.storeId, storeId));
      if (status) conditions.push(eq(tables.status, status as "FREE" | "OCCUPIED" | "RESERVED"));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [tableList, totalResult] = await Promise.all([
        db
          .select({
            table: tables,
            store: { id: stores.id, name: stores.name },
          })
          .from(tables)
          .leftJoin(stores, eq(tables.storeId, stores.id))
          .where(whereClause)
          .orderBy(asc(tables.name))
          .limit(take)
          .offset(skip),
        db.select({ count: count() }).from(tables).where(whereClause),
      ]);

      return success({
        list: tableList.map((r) => ({ ...r.table, store: r.store })),
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
      detail: {
        tags: ["Tables"],
        summary: "获取桌台列表",
      },
    }
  )
  .get(
    "/:id",
    async ({ params }) => {
      const result = await db
        .select()
        .from(tables)
        .leftJoin(stores, eq(tables.storeId, stores.id))
        .where(eq(tables.id, params.id))
        .limit(1);

      if (result.length === 0) {
        return error("桌台不存在", 404);
      }

      const row = result[0]!;
      return success({ ...row.tables, store: row.stores });
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      detail: {
        tags: ["Tables"],
        summary: "获取桌台详情",
      },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      const { storeId, name, capacity } = body;

      // 检查门店是否存在
      const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
      if (!store) {
        return error("门店不存在", 404);
      }

      // 检查桌台名是否重复
      const existing = await db
        .select()
        .from(tables)
        .where(and(eq(tables.storeId, storeId), eq(tables.name, name)))
        .limit(1);
      if (existing.length > 0) {
        return error("桌台号已存在", 400);
      }

      const [table] = await db
        .insert(tables)
        .values({
          storeId,
          name,
          capacity: capacity || 4,
          qrCode: generateQrToken(storeId, Date.now()),
        })
        .returning();

      return success(table, "桌台创建成功");
    },
    {
      body: t.Object({
        storeId: t.Number(),
        name: t.String({ minLength: 1, maxLength: 50, error: "桌台名1-50字符" }),
        capacity: t.Optional(t.Number({ minimum: 1, maximum: 50, error: "容纳人数1-50" })),
      }),
      detail: {
        tags: ["Tables"],
        summary: "创建桌台",
      },
    }
  )
  .post(
    "/batch",
    async ({ body }) => {
      const { storeId, prefix, startNum, count: tableCount, capacity } = body;

      // 检查门店是否存在
      const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
      if (!store) {
        return error("门店不存在", 404);
      }

      const tableValues = [];
      for (let i = 0; i < tableCount; i++) {
        const num = startNum + i;
        const name = `${prefix}${num.toString().padStart(2, "0")}`;
        tableValues.push({
          storeId,
          name,
          capacity: capacity || 4,
          qrCode: generateQrToken(storeId, Date.now() + i),
        });
      }

      const result = await db.insert(tables).values(tableValues).onConflictDoNothing().returning();

      return success({ count: result.length }, "批量创建成功");
    },
    {
      body: t.Object({
        storeId: t.Number(),
        prefix: t.String({ minLength: 1, maxLength: 10 }),
        startNum: t.Number({ minimum: 1 }),
        count: t.Number({ minimum: 1, maximum: 100 }),
        capacity: t.Optional(t.Number()),
      }),
      detail: {
        tags: ["Tables"],
        summary: "批量创建桌台",
      },
    }
  )
  .put(
    "/:id",
    async ({ params, body }) => {
      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.capacity !== undefined) updateData.capacity = body.capacity;
      if (body.status !== undefined) updateData.status = body.status;

      const [table] = await db
        .update(tables)
        .set(updateData)
        .where(eq(tables.id, params.id))
        .returning();

      return success(table, "桌台更新成功");
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        capacity: t.Optional(t.Number()),
        status: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Tables"],
        summary: "更新桌台",
      },
    }
  )
  .put(
    "/:id/qrcode",
    async ({ params }) => {
      const [table] = await db.select().from(tables).where(eq(tables.id, params.id)).limit(1);
      if (!table) {
        return error("桌台不存在", 404);
      }

      const [updated] = await db
        .update(tables)
        .set({ qrCode: generateQrToken(table.storeId, Date.now()) })
        .where(eq(tables.id, params.id))
        .returning();

      return success(updated, "二维码已重新生成");
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      detail: {
        tags: ["Tables"],
        summary: "重新生成二维码",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params }) => {
      await db.delete(tables).where(eq(tables.id, params.id));

      return success(null, "桌台删除成功");
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      detail: {
        tags: ["Tables"],
        summary: "删除桌台",
      },
    }
  );
