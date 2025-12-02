import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import { db, admins, stores } from "../db";
import { hashPassword, verifyPassword, success, error } from "../lib/utils";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "your-super-secret-key-change-in-production",
    })
  )
  .post(
    "/login",
    async ({ body, jwt }) => {
      const { username, password } = body;

      const result = await db
        .select()
        .from(admins)
        .leftJoin(stores, eq(admins.storeId, stores.id))
        .where(eq(admins.username, username))
        .limit(1);

      const admin = result[0];

      if (!admin) {
        return error("用户名或密码错误", 401);
      }

      if (!verifyPassword(password, admin.admins.password)) {
        return error("用户名或密码错误", 401);
      }

      if (admin.admins.status !== "ACTIVE") {
        return error("账号已被禁用", 403);
      }

      const token = await jwt.sign({
        id: admin.admins.id,
        username: admin.admins.username,
        role: admin.admins.role,
        storeId: admin.admins.storeId,
      });

      return success({
        token,
        user: {
          id: admin.admins.id,
          username: admin.admins.username,
          name: admin.admins.name,
          role: admin.admins.role,
          store: admin.stores,
        },
      });
    },
    {
      body: t.Object({
        username: t.String({ minLength: 1 }),
        password: t.String({ minLength: 1 }),
      }),
      detail: {
        tags: ["Auth"],
        summary: "管理员登录",
      },
    }
  )
  .post(
    "/register",
    async ({ body }) => {
      const { username, password, name, role, storeId } = body;

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
        })
        .returning();

      return success({
        id: admin!.id,
        username: admin!.username,
        name: admin!.name,
        role: admin!.role,
      });
    },
    {
      body: t.Object({
        username: t.String({ minLength: 3, maxLength: 50 }),
        password: t.String({ minLength: 6 }),
        name: t.String({ minLength: 1, maxLength: 50 }),
        role: t.Optional(
          t.Union([t.Literal("SUPER_ADMIN"), t.Literal("OWNER"), t.Literal("STAFF")])
        ),
        storeId: t.Optional(t.Number()),
      }),
      detail: {
        tags: ["Auth"],
        summary: "注册管理员 (仅超管可用)",
      },
    }
  )
  .get(
    "/me",
    async ({ headers, jwt }) => {
      const authorization = headers.authorization;
      if (!authorization?.startsWith("Bearer ")) {
        return error("未授权", 401);
      }

      const token = authorization.slice(7);
      const payload = await jwt.verify(token);

      if (!payload) {
        return error("Token 无效或已过期", 401);
      }

      const result = await db
        .select()
        .from(admins)
        .leftJoin(stores, eq(admins.storeId, stores.id))
        .where(eq(admins.id, payload.id as number))
        .limit(1);

      const admin = result[0];

      if (!admin) {
        return error("用户不存在", 404);
      }

      return success({
        id: admin.admins.id,
        username: admin.admins.username,
        name: admin.admins.name,
        role: admin.admins.role,
        store: admin.stores,
      });
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "获取当前用户信息",
      },
    }
  );
