"use client";

import { useAuthStore } from "@/store/auth";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "@/lib/permissions";
import type { Permission } from "@/types";

/**
 * 权限检查 Hook
 * 使用后端返回的权限列表进行检查
 */
export function usePermission() {
  const { user } = useAuthStore();
  const role = user?.role;
  const permissions = user?.permissions;

  return {
    // 当前用户角色
    role,

    // 当前用户权限列表
    permissions,

    // 检查单个权限
    can: (permission: Permission) => hasPermission(permissions, permission),

    // 检查是否拥有任一权限
    canAny: (perms: Permission[]) => hasAnyPermission(permissions, perms),

    // 检查是否拥有所有权限
    canAll: (perms: Permission[]) => hasAllPermissions(permissions, perms),

    // 是否是超级管理员
    isSuperAdmin: role === "SUPER_ADMIN",

    // 是否是店长及以上
    isManager: role === "SUPER_ADMIN" || role === "OWNER",

    // 是否是员工
    isStaff: role === "STAFF",
  };
}
