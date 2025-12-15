import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import { error } from "./utils";

// ==================== 类型定义 ====================

// 角色类型
export type Role = "SUPER_ADMIN" | "OWNER" | "STAFF";

// 权限类型 - 资源:操作
export type Permission =
  // 门店
  | "store:read"
  | "store:write"
  | "store:delete"
  // 桌台
  | "table:read"
  | "table:write"
  | "table:delete"
  // 分类
  | "category:read"
  | "category:write"
  | "category:delete"
  // 商品
  | "product:read"
  | "product:write"
  | "product:delete"
  // 订单
  | "order:read"
  | "order:write"
  | "order:refund"
  // 打印机
  | "printer:read"
  | "printer:write"
  | "printer:delete"
  // 会员
  | "member:read"
  | "member:write"
  // 优惠券
  | "coupon:read"
  | "coupon:write"
  | "coupon:delete"
  // 营销活动
  | "promotion:read"
  | "promotion:write"
  | "promotion:delete"
  // 员工
  | "staff:read"
  | "staff:write"
  | "staff:delete"
  // 系统设置
  | "settings:read"
  | "settings:write"
  // 数据报表
  | "report:read"
  // 服务呼叫
  | "service:read"
  | "service:write"
  // 轮播图
  | "banners:read"
  | "banners:create"
  | "banners:update"
  | "banners:delete"
  // 上传
  | "upload:write";

// 所有权限列表（用于前端展示和验证）
export const ALL_PERMISSIONS: Permission[] = [
  "store:read",
  "store:write",
  "store:delete",
  "table:read",
  "table:write",
  "table:delete",
  "category:read",
  "category:write",
  "category:delete",
  "product:read",
  "product:write",
  "product:delete",
  "order:read",
  "order:write",
  "order:refund",
  "printer:read",
  "printer:write",
  "printer:delete",
  "member:read",
  "member:write",
  "coupon:read",
  "coupon:write",
  "coupon:delete",
  "promotion:read",
  "promotion:write",
  "promotion:delete",
  "staff:read",
  "staff:write",
  "staff:delete",
  "settings:read",
  "settings:write",
  "report:read",
  "service:read",
  "service:write",
  "banners:read",
  "banners:create",
  "banners:update",
  "banners:delete",
  "upload:write",
];

// JWT Payload 类型
export interface JWTPayload {
  id: number;
  username: string;
  role: Role;
  storeId: number | null;
}

// ==================== RBAC 权限矩阵 ====================

// 角色拥有的权限
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    // 超级管理员拥有所有权限
    "store:read",
    "store:write",
    "store:delete",
    "table:read",
    "table:write",
    "table:delete",
    "category:read",
    "category:write",
    "category:delete",
    "product:read",
    "product:write",
    "product:delete",
    "order:read",
    "order:write",
    "order:refund",
    "printer:read",
    "printer:write",
    "printer:delete",
    "member:read",
    "member:write",
    "coupon:read",
    "coupon:write",
    "coupon:delete",
    "promotion:read",
    "promotion:write",
    "promotion:delete",
    "staff:read",
    "staff:write",
    "staff:delete",
    "settings:read",
    "settings:write",
    "report:read",
    "service:read",
    "service:write",
    "upload:write",
  ],
  OWNER: [
    // 店长拥有除门店管理外的所有权限
    "store:read", // 只能读取自己门店
    "table:read",
    "table:write",
    "table:delete",
    "category:read",
    "category:write",
    "category:delete",
    "product:read",
    "product:write",
    "product:delete",
    "order:read",
    "order:write",
    "order:refund",
    "printer:read",
    "printer:write",
    "printer:delete",
    "member:read",
    "member:write",
    "coupon:read",
    "coupon:write",
    "coupon:delete",
    "promotion:read",
    "promotion:write",
    "promotion:delete",
    "staff:read",
    "staff:write", // 可以管理本店员工
    "settings:read",
    "settings:write",
    "report:read",
    "service:read",
    "service:write",
    "upload:write",
  ],
  STAFF: [
    // 员工只有基础操作权限
    "table:read",
    "category:read",
    "product:read",
    "order:read",
    "order:write", // 可以处理订单
    "printer:read",
    "service:read",
    "service:write", // 可以处理服务呼叫
  ],
};

/**
 * 从数据库获取角色权限（带缓存和回退到默认值）
 * 这是异步函数，需要在登录/获取用户信息时调用
 */
export async function getRolePermissions(role: Role): Promise<Permission[]> {
  try {
    // 动态导入避免循环依赖
    const { db, rolePermissions } = await import("../db");

    const [config] = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.role, role))
      .limit(1);

    if (config && config.permissions && config.permissions.length > 0) {
      return config.permissions as Permission[];
    }
  } catch {
    // 数据库错误时回退到默认值
    console.warn(`Failed to get permissions from DB for role ${role}, using defaults`);
  }

  // 回退到默认权限
  return ROLE_PERMISSIONS[role] || [];
}

// 检查角色是否拥有权限
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// 检查角色是否拥有任意一个权限
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

// 检查角色是否拥有所有权限
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

// ==================== 便捷角色检查 ====================

export const ROLES = {
  // 所有登录用户
  authenticated: ["SUPER_ADMIN", "OWNER", "STAFF"] as Role[],
  // 店长及以上
  manager: ["SUPER_ADMIN", "OWNER"] as Role[],
  // 仅超级管理员
  admin: ["SUPER_ADMIN"] as Role[],
};

// 创建 JWT 插件实例
export const jwtPlugin = jwt({
  name: "jwt",
  secret: process.env.JWT_SECRET || "your-super-secret-key-change-in-production",
});

// 认证中间件 - 验证 token 并提取用户信息
export const authPlugin = new Elysia({ name: "auth" })
  .use(jwtPlugin)
  .derive({ as: "global" }, async ({ headers, jwt }) => {
    const authorization = headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return { user: null };
    }

    const token = authorization.slice(7);

    try {
      const payload = await jwt.verify(token);
      if (!payload) {
        return { user: null };
      }
      return { user: payload as unknown as JWTPayload };
    } catch {
      return { user: null };
    }
  });

// 需要登录的守卫
export const requireAuth = new Elysia({ name: "requireAuth" })
  .use(authPlugin)
  .onBeforeHandle(({ user }) => {
    if (!user) {
      return error("未授权，请先登录", 401);
    }
  });

// 需要特定角色的守卫
export const requireRole = (allowedRoles: Role[]) => {
  return new Elysia({ name: `requireRole:${allowedRoles.join(",")}` })
    .use(authPlugin)
    .onBeforeHandle(({ user }) => {
      if (!user) {
        return error("未授权，请先登录", 401);
      }
      if (!allowedRoles.includes(user.role)) {
        return error("权限不足", 403);
      }
    });
};

// 便捷的角色守卫
export const requireManager = requireRole(ROLES.manager);
export const requireAdmin = requireRole(ROLES.admin);

// 需要特定权限的守卫
export const requirePermission = (requiredPermissions: Permission | Permission[]) => {
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];
  return new Elysia({ name: `requirePermission:${permissions.join(",")}` })
    .use(authPlugin)
    .onBeforeHandle(({ user }) => {
      if (!user) {
        return error("未授权，请先登录", 401);
      }
      if (!hasAnyPermission(user.role, permissions)) {
        return error(`权限不足，需要: ${permissions.join(" 或 ")}`, 403);
      }
    });
};

// 需要所有指定权限的守卫
export const requireAllPermissions = (requiredPermissions: Permission[]) => {
  return new Elysia({ name: `requireAllPermissions:${requiredPermissions.join(",")}` })
    .use(authPlugin)
    .onBeforeHandle(({ user }) => {
      if (!user) {
        return error("未授权，请先登录", 401);
      }
      if (!hasAllPermissions(user.role, requiredPermissions)) {
        return error(`权限不足，需要: ${requiredPermissions.join(" 和 ")}`, 403);
      }
    });
};

// 门店数据隔离守卫 - 确保用户只能访问自己门店的数据
export const requireStoreAccess = new Elysia({ name: "requireStoreAccess" })
  .use(authPlugin)
  .onBeforeHandle(({ user, query, params }) => {
    if (!user) {
      return error("未授权，请先登录", 401);
    }

    // 超级管理员可以访问所有门店
    if (user.role === "SUPER_ADMIN") {
      return;
    }

    // 检查请求中的 storeId 是否与用户所属门店匹配
    const requestStoreId = (query as any)?.storeId || (params as any)?.storeId;

    if (requestStoreId && Number(requestStoreId) !== user.storeId) {
      return error("无权访问该门店数据", 403);
    }
  });

// 获取用户可访问的门店 ID
export function getAccessibleStoreId(
  user: JWTPayload | null,
  requestedStoreId?: number
): number | null {
  if (!user) return null;

  // 超级管理员可以指定任意门店，默认返回请求的或 1
  if (user.role === "SUPER_ADMIN") {
    return requestedStoreId || 1;
  }

  // 其他角色只能访问自己的门店
  return user.storeId;
}
