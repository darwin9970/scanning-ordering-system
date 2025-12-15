import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db, rolePermissions } from "../db";
import { success, error } from "../lib/utils";
import {
  requirePermission,
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  type Role,
  type Permission,
} from "../lib/auth";
import { logOperation } from "../lib/operation-log";

export const roleRoutes = new Elysia({ prefix: "/api/roles" })
  // 获取所有权限列表（供前端展示）
  .get(
    "/permissions",
    async () => {
      return success({
        permissions: ALL_PERMISSIONS,
        groups: {
          store: ["store:read", "store:write", "store:delete"],
          table: ["table:read", "table:write", "table:delete"],
          category: ["category:read", "category:write", "category:delete"],
          product: ["product:read", "product:write", "product:delete"],
          order: ["order:read", "order:write", "order:refund"],
          printer: ["printer:read", "printer:write", "printer:delete"],
          member: ["member:read", "member:write"],
          coupon: ["coupon:read", "coupon:write", "coupon:delete"],
          promotion: ["promotion:read", "promotion:write", "promotion:delete"],
          staff: ["staff:read", "staff:write", "staff:delete"],
          settings: ["settings:read", "settings:write"],
          report: ["report:read"],
          service: ["service:read", "service:write"],
        },
      });
    },
    {
      detail: { tags: ["Roles"], summary: "获取所有权限列表" },
    }
  )

  // 获取所有角色的权限配置
  .get(
    "/",
    async () => {
      // 从数据库获取已配置的角色权限
      const dbConfigs = await db.select().from(rolePermissions);

      // 创建角色配置映射
      const configMap = new Map(dbConfigs.map((c) => [c.role, c]));

      // 返回所有角色的配置（如果数据库没有则使用默认值）
      const roles: Role[] = ["SUPER_ADMIN", "OWNER", "STAFF"];
      const result = roles.map((role) => {
        const dbConfig = configMap.get(role);
        return {
          role,
          permissions: dbConfig?.permissions || ROLE_PERMISSIONS[role],
          description: dbConfig?.description || getDefaultDescription(role),
          updatedAt: dbConfig?.updatedAt || null,
        };
      });

      return success(result);
    },
    {
      detail: { tags: ["Roles"], summary: "获取所有角色权限配置" },
    }
  )

  // 获取单个角色的权限配置
  .get(
    "/:role",
    async ({ params }) => {
      const role = params.role as Role;

      // 验证角色是否有效
      if (!["SUPER_ADMIN", "OWNER", "STAFF"].includes(role)) {
        return error("无效的角色", 400);
      }

      // 从数据库获取配置
      const [dbConfig] = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.role, role))
        .limit(1);

      return success({
        role,
        permissions: dbConfig?.permissions || ROLE_PERMISSIONS[role],
        description: dbConfig?.description || getDefaultDescription(role),
        updatedAt: dbConfig?.updatedAt || null,
      });
    },
    {
      params: t.Object({ role: t.String() }),
      detail: { tags: ["Roles"], summary: "获取单个角色权限配置" },
    }
  )

  // 更新角色权限配置（仅超管可用）
  .use(requirePermission("staff:write"))
  .put(
    "/:role",
    async ({ params, body, user }) => {
      const role = params.role as Role;

      // 验证角色是否有效
      if (!["SUPER_ADMIN", "OWNER", "STAFF"].includes(role)) {
        return error("无效的角色", 400);
      }

      // 超级管理员的权限不能被修改（保护措施）
      if (role === "SUPER_ADMIN") {
        return error("超级管理员权限不可修改", 403);
      }

      // 验证权限列表
      const invalidPermissions = body.permissions.filter(
        (p: string) => !ALL_PERMISSIONS.includes(p as Permission)
      );
      if (invalidPermissions.length > 0) {
        return error(`无效的权限: ${invalidPermissions.join(", ")}`, 400);
      }

      // 检查是否存在记录
      const [existing] = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.role, role))
        .limit(1);

      if (existing) {
        // 更新
        const [updated] = await db
          .update(rolePermissions)
          .set({
            permissions: body.permissions,
            description: body.description,
            updatedAt: new Date(),
            updatedBy: user?.id,
          })
          .where(eq(rolePermissions.role, role))
          .returning();

        return success(updated, "角色权限更新成功");
      } else {
        // 创建
        const [created] = await db
          .insert(rolePermissions)
          .values({
            role,
            permissions: body.permissions,
            description: body.description,
            updatedBy: user?.id,
          })
          .returning();

        return success(created, "角色权限配置成功");
      }
    },
    {
      params: t.Object({ role: t.String() }),
      body: t.Object({
        permissions: t.Array(t.String()),
        description: t.Optional(t.String()),
      }),
      detail: { tags: ["Roles"], summary: "更新角色权限配置" },
    }
  )

  // 重置角色权限为默认值
  .delete(
    "/:role",
    async ({ params, user }) => {
      const role = params.role as Role;

      // 验证角色是否有效
      if (!["SUPER_ADMIN", "OWNER", "STAFF"].includes(role)) {
        return error("无效的角色", 400);
      }

      // 删除自定义配置，恢复默认值
      await db.delete(rolePermissions).where(eq(rolePermissions.role, role));

      await logOperation({
        adminId: user?.id,
        action: "role_reset",
        targetType: "role",
        targetId: role,
        storeId: null,
        details: { role },
      });

      return success(
        {
          role,
          permissions: ROLE_PERMISSIONS[role],
          description: getDefaultDescription(role),
        },
        "已恢复默认权限"
      );
    },
    {
      params: t.Object({ role: t.String() }),
      detail: { tags: ["Roles"], summary: "重置角色权限为默认值" },
    }
  );

// 获取角色默认描述
function getDefaultDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    SUPER_ADMIN: "超级管理员，拥有系统所有权限",
    OWNER: "店长，拥有门店管理所有权限",
    STAFF: "员工，拥有基础操作权限",
  };
  return descriptions[role];
}
