import { Elysia, t } from "elysia";
import { eq, and, asc, count } from "drizzle-orm";
import { db, tables, stores } from "../db";
import { success, error, pagination, generateQrToken } from "../lib/utils";
import { requirePermission, hasPermission } from "../lib/auth";
import { getRedis } from "../lib/redis";
import { logOperation } from "../lib/operation-log";

const TABLE_RATE_PREFIX = "rate:table:";
const TABLE_IDEM_PREFIX = "idem:table:";
const TABLE_RATE_LIMIT = { limit: 20, ttl: 60 };

type IdempotencyResult = { ok: false; message: string } | { ok: true; redisKey?: string };

function getClientIp(headers: Record<string, string | undefined>) {
  return (
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    headers["x-real-ip"] ||
    headers["cf-connecting-ip"] ||
    "unknown"
  );
}

async function checkRateLimit(key: string) {
  const redis = getRedis();
  if (!redis) return true;
  const countVal = await redis.incr(key);
  if (countVal === 1) await redis.expire(key, TABLE_RATE_LIMIT.ttl);
  return countVal <= TABLE_RATE_LIMIT.limit;
}

async function ensureIdempotent(key?: string): Promise<IdempotencyResult> {
  const redis = getRedis();
  if (!key || !redis) return { ok: true };
  const existing = await redis.get(key);
  if (existing) return { ok: false, message: "重复请求，请勿重复提交" };
  await redis.set(key, "processing", "EX", 600, "NX");
  return { ok: true, redisKey: key };
}

async function finalizeIdempotent(redisKey?: string) {
  const redis = getRedis();
  if (redis && redisKey) {
    await redis.set(redisKey, "done", "EX", 600);
  }
}

async function releaseIdempotent(redisKey?: string) {
  const redis = getRedis();
  if (redis && redisKey) {
    await redis.del(redisKey);
  }
}

export const tableRoutes = new Elysia({ prefix: "/api/tables" })
  // 桌台读取需要 table:read 权限
  .use(requirePermission("table:read"))
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
        list: tableList.map(
          (r: {
            table: typeof tables.$inferSelect;
            store: { id: number; name: string } | null;
          }) => ({
            ...r.table,
            store: r.store,
          })
        ),
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
    async ({ body, user, headers }) => {
      if (!user || !hasPermission(user.role, "table:write")) {
        return error("权限不足，需要 table:write", 403);
      }

      const ip = getClientIp(headers as Record<string, string | undefined>);
      const rateKey = `${TABLE_RATE_PREFIX}create:${user.id || ip}`;
      if (!(await checkRateLimit(rateKey))) {
        return error("操作过于频繁，请稍后重试", 429);
      }

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

      await logOperation({
        adminId: user.id,
        action: "table_create",
        targetType: "table",
        targetId: table?.id,
        storeId,
        details: { name, capacity },
      });

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
    async ({ body, user, headers }) => {
      if (!user || !hasPermission(user.role, "table:write")) {
        return error("权限不足，需要 table:write", 403);
      }

      const ip = getClientIp(headers as Record<string, string | undefined>);
      const rateKey = `${TABLE_RATE_PREFIX}batch:${user.id || ip}`;
      if (!(await checkRateLimit(rateKey))) {
        return error("操作过于频繁，请稍后重试", 429);
      }

      const idempotencyKey = headers["idempotency-key"] as string | undefined;
      const idemKey = idempotencyKey ? `${TABLE_IDEM_PREFIX}batch:${idempotencyKey}` : undefined;
      const idemResult = await ensureIdempotent(idemKey);
      if (!idemResult.ok) {
        return error(idemResult.message || "重复请求", 409);
      }

      const { storeId, prefix, startNum, count: tableCount, capacity } = body;

      // 检查门店是否存在
      const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
      if (!store) {
        await releaseIdempotent(idemResult.redisKey);
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

      await logOperation({
        adminId: user.id,
        action: "table_batch_create",
        targetType: "table",
        targetId: null,
        storeId,
        details: { prefix, startNum, tableCount, capacity, created: result.length },
      });

      await finalizeIdempotent(idemResult.redisKey);

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
    async ({ params, body, user, headers }) => {
      if (!user || !hasPermission(user.role, "table:write")) {
        return error("权限不足，需要 table:write", 403);
      }

      const ip = getClientIp(headers as Record<string, string | undefined>);
      const rateKey = `${TABLE_RATE_PREFIX}update:${user.id || ip}`;
      if (!(await checkRateLimit(rateKey))) {
        return error("操作过于频繁，请稍后重试", 429);
      }

      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.capacity !== undefined) updateData.capacity = body.capacity;
      if (body.status !== undefined) updateData.status = body.status;

      const [table] = await db
        .update(tables)
        .set(updateData)
        .where(eq(tables.id, params.id))
        .returning();

      await logOperation({
        adminId: user.id,
        action: "table_update",
        targetType: "table",
        targetId: params.id,
        storeId: table?.storeId ?? null,
        details: { ...updateData },
      });

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
    async ({ params, user, headers }) => {
      if (!user || !hasPermission(user.role, "table:write")) {
        return error("权限不足，需要 table:write", 403);
      }

      const ip = getClientIp(headers as Record<string, string | undefined>);
      const rateKey = `${TABLE_RATE_PREFIX}qrcode:${user.id || ip}`;
      if (!(await checkRateLimit(rateKey))) {
        return error("操作过于频繁，请稍后重试", 429);
      }

      const idempotencyKey = headers["idempotency-key"] as string | undefined;
      const idemKey = idempotencyKey ? `${TABLE_IDEM_PREFIX}qrcode:${idempotencyKey}` : undefined;
      const idemResult = await ensureIdempotent(idemKey);
      if (!idemResult.ok) {
        return error(idemResult.message || "重复请求", 409);
      }

      const [table] = await db.select().from(tables).where(eq(tables.id, params.id)).limit(1);
      if (!table) {
        await releaseIdempotent(idemResult.redisKey);
        return error("桌台不存在", 404);
      }

      const [updated] = await db
        .update(tables)
        .set({ qrCode: generateQrToken(table.storeId, Date.now()) })
        .where(eq(tables.id, params.id))
        .returning();

      await logOperation({
        adminId: user.id,
        action: "table_qrcode_regen",
        targetType: "table",
        targetId: params.id,
        storeId: table.storeId,
        details: { previous: table.qrCode, regenerated: updated?.qrCode },
      });

      await finalizeIdempotent(idemResult.redisKey);

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
    async ({ params, user, headers }) => {
      if (!user || !hasPermission(user.role, "table:write")) {
        return error("权限不足，需要 table:write", 403);
      }

      const ip = getClientIp(headers as Record<string, string | undefined>);
      const rateKey = `${TABLE_RATE_PREFIX}delete:${user.id || ip}`;
      if (!(await checkRateLimit(rateKey))) {
        return error("操作过于频繁，请稍后重试", 429);
      }

      const idempotencyKey = headers["idempotency-key"] as string | undefined;
      const idemKey = idempotencyKey ? `${TABLE_IDEM_PREFIX}delete:${idempotencyKey}` : undefined;
      const idemResult = await ensureIdempotent(idemKey);
      if (!idemResult.ok) {
        return error(idemResult.message || "重复请求", 409);
      }

      const [existing] = await db.select().from(tables).where(eq(tables.id, params.id)).limit(1);
      await db.delete(tables).where(eq(tables.id, params.id));

      await logOperation({
        adminId: user?.id,
        action: "delete",
        targetType: "table",
        targetId: params.id,
        storeId: existing?.storeId ?? null,
        details: { name: existing?.name },
      });

      await finalizeIdempotent(idemResult.redisKey);

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
