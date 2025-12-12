"use client";

import { usePermission } from "@/hooks/use-permission";
import type { Permission } from "@/types";

interface PermissionGuardProps {
  /** 需要的权限（满足任一即可） */
  permissions: Permission | Permission[];
  /** 需要所有权限都满足 */
  requireAll?: boolean;
  /** 无权限时显示的内容 */
  fallback?: React.ReactNode;
  /** 子元素 */
  children: React.ReactNode;
}

/**
 * 权限守卫组件
 * 用于包裹需要权限才能显示的 UI 元素
 *
 * @example
 * // 单个权限
 * <PermissionGuard permissions="order:refund">
 *   <Button>退款</Button>
 * </PermissionGuard>
 *
 * // 多个权限（满足任一即可）
 * <PermissionGuard permissions={["product:write", "product:delete"]}>
 *   <Button>编辑/删除</Button>
 * </PermissionGuard>
 *
 * // 多个权限（需要全部满足）
 * <PermissionGuard permissions={["order:write", "order:refund"]} requireAll>
 *   <Button>操作</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { can, canAny, canAll } = usePermission();

  const permissionList = Array.isArray(permissions) ? permissions : [permissions];

  const hasAccess = requireAll
    ? canAll(permissionList)
    : permissionList.length === 1
      ? can(permissionList[0])
      : canAny(permissionList);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * 便捷的权限守卫组件 - 需要写入权限
 */
export function CanWrite({
  resource,
  children,
  fallback,
}: {
  resource: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard permissions={`${resource}:write` as Permission} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * 便捷的权限守卫组件 - 需要删除权限
 */
export function CanDelete({
  resource,
  children,
  fallback,
}: {
  resource: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard permissions={`${resource}:delete` as Permission} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}
