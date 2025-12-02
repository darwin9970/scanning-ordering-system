import type { Permission } from "@/types";

// 重新导出 Permission 类型
export type { Permission } from "@/types";

/**
 * 检查用户是否拥有指定权限
 * @param userPermissions 用户拥有的权限列表（从后端获取）
 * @param permission 需要检查的权限
 */
export function hasPermission(
  userPermissions: Permission[] | undefined,
  permission: Permission
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  return userPermissions.includes(permission);
}

/**
 * 检查用户是否拥有任意一个指定权限
 */
export function hasAnyPermission(
  userPermissions: Permission[] | undefined,
  permissions: Permission[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  return permissions.some((p) => userPermissions.includes(p));
}

/**
 * 检查用户是否拥有所有指定权限
 */
export function hasAllPermissions(
  userPermissions: Permission[] | undefined,
  permissions: Permission[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  return permissions.every((p) => userPermissions.includes(p));
}
