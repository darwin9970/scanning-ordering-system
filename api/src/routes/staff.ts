import { Elysia, t } from "elysia";
import { eq, and, like, count, desc } from "drizzle-orm";
import { db, admins, stores } from "../db";
import { hashPassword, success, error } from "../lib/utils";
import { requirePermission } from "../lib/auth";
import { logOperation } from "../lib/operation-log";

export const staffRoutes = new Elysia({ prefix: "/api/staff" })
  // 应用权限守卫：需要 staff:read 权限
  .use(requirePermission("staff:read"))
  // 获取员工列表
  .get(
    "/",
    async ({ query }) => {
      const { page = 1, pageSize = 10, storeId, role, keyword, status } = query;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (storeId) conditions.push(eq(admins.storeId, storeId));
      if (role) conditions.push(eq(admins.role, role as "SUPER_ADMIN" | "OWNER" | "STAFF"));
      if (status) conditions.push(eq(admins.status, status as "ACTIVE" | "INACTIVE"));
      if (keyword) conditions.push(like(admins.name, `%${keyword}%`));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [result, totalResult] = await Promise.all([
        db
          .select({
            admin: admins,
            store: stores,
          })
          .from(admins)
          .leftJoin(stores, eq(admins.storeId, stores.id))
          .where(whereClause)
          .orderBy(desc(admins.createdAt))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: count() }).from(admins).where(whereClause),
      ]);

      return success({
        list: result.map((r) => ({
          id: r.admin.id,
          username: r.admin.username,
          name: r.admin.name,
          role: r.admin.role,
          status: r.admin.status,
          storeId: r.admin.storeId,
          store: r.store,
          createdAt: r.admin.createdAt,
          updatedAt: r.admin.updatedAt,
        })),
        total: totalResult[0]?.count ?? 0,
        page,
        pageSize,
      });
    },
    {
      query: t.Object({
        page: t.Optional(t.Number()),
        pageSize: t.Optional(t.Number()),
        storeId: t.Optional(t.Number()),
        role: t.Optional(t.String()),
        keyword: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
      detail: { tags: ["Staff"], summary: "获取员工列表" },
    }
  )
  // 获取员工详情
  .get(
    "/:id",
    async ({ params }) => {
      const result = await db
        .select({
          admin: admins,
          store: stores,
        })
        .from(admins)
        .leftJoin(stores, eq(admins.storeId, stores.id))
        .where(eq(admins.id, params.id))
        .limit(1);

      if (result.length === 0) {
        return error("员工不存在", 404);
      }

      const r = result[0]!;
      return success({
        id: r.admin.id,
        username: r.admin.username,
        name: r.admin.name,
        role: r.admin.role,
        status: r.admin.status,
        storeId: r.admin.storeId,
        store: r.store,
        createdAt: r.admin.createdAt,
        updatedAt: r.admin.updatedAt,
      });
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Staff"], summary: "获取员工详情" },
    }
  )
  // 创建员工
  .post(
    "/",
    async ({ body }) => {
      const { username, password, name, role, storeId } = body;

      // 检查用户名是否已存在
      const existing = await db.select().from(admins).where(eq(admins.username, username)).limit(1);

      if (existing.length > 0) {
        return error("用户名已存在", 400);
      }

      const [admin] = await db
        .insert(admins)
        .values({
          username,
          password: hashPassword(password),
          name,
          role: (role || "STAFF") as "SUPER_ADMIN" | "OWNER" | "STAFF",
          storeId,
          status: "ACTIVE",
        })
        .returning();

      return success(
        {
          id: admin!.id,
          username: admin!.username,
          name: admin!.name,
          role: admin!.role,
          status: admin!.status,
          storeId: admin!.storeId,
        },
        "员工创建成功"
      );
    },
    {
      body: t.Object({
        username: t.String({ minLength: 3, maxLength: 50, error: "用户名3-50字符" }),
        password: t.String({ minLength: 6, maxLength: 100, error: "密码至少6位" }),
        name: t.String({ minLength: 1, maxLength: 50, error: "姓名1-50字符" }),
        role: t.Optional(
          t.Union([t.Literal("SUPER_ADMIN"), t.Literal("OWNER"), t.Literal("STAFF")])
        ),
        storeId: t.Optional(t.Number()),
      }),
      detail: { tags: ["Staff"], summary: "创建员工" },
    }
  )
  // 更新员工
  .put(
    "/:id",
    async ({ params, body }) => {
      const updateData: Record<string, unknown> = {};

      if (body.name !== undefined) updateData.name = body.name;
      if (body.role !== undefined) updateData.role = body.role;
      if (body.storeId !== undefined) updateData.storeId = body.storeId;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.password) updateData.password = hashPassword(body.password);

      const [admin] = await db
        .update(admins)
        .set(updateData)
        .where(eq(admins.id, params.id))
        .returning();

      if (!admin) {
        return error("员工不存在", 404);
      }

      return success(
        {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          role: admin.role,
          status: admin.status,
          storeId: admin.storeId,
        },
        "员工更新成功"
      );
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
        password: t.Optional(t.String({ minLength: 6, maxLength: 100 })),
        role: t.Optional(
          t.Union([t.Literal("SUPER_ADMIN"), t.Literal("OWNER"), t.Literal("STAFF")])
        ),
        storeId: t.Optional(t.Number()),
        status: t.Optional(t.Union([t.Literal("ACTIVE"), t.Literal("INACTIVE")])),
      }),
      detail: { tags: ["Staff"], summary: "更新员工" },
    }
  )
  // 删除员工
  .delete(
    "/:id",
    async ({ params, user }) => {
      const [admin] = await db.select().from(admins).where(eq(admins.id, params.id)).limit(1);

      if (!admin) {
        return error("员工不存在", 404);
      }

      // 不能删除自己或超级管理员
      if (admin.role === "SUPER_ADMIN") {
        return error("不能删除超级管理员", 403);
      }

      await db.delete(admins).where(eq(admins.id, params.id));

      await logOperation({
        adminId: user?.id,
        action: "delete",
        targetType: "staff",
        targetId: params.id,
        storeId: admin.storeId ?? null,
        details: { username: admin.username, role: admin.role },
      });

      return success(null, "员工删除成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Staff"], summary: "删除员工" },
    }
  )
  // 切换员工状态
  .put(
    "/:id/status",
    async ({ params, body }) => {
      const [admin] = await db
        .update(admins)
        .set({ status: body.status as "ACTIVE" | "INACTIVE" })
        .where(eq(admins.id, params.id))
        .returning();

      if (!admin) {
        return error("员工不存在", 404);
      }

      return success(admin, body.status === "ACTIVE" ? "员工已启用" : "员工已禁用");
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        status: t.Union([t.Literal("ACTIVE"), t.Literal("INACTIVE")]),
      }),
      detail: { tags: ["Staff"], summary: "切换员工状态" },
    }
  );
