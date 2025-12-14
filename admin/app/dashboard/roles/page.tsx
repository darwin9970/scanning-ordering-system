"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, RotateCcw, Shield, Crown, User } from "lucide-react";
import type { Permission } from "@/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

// 权限分组配置
const PERMISSION_GROUPS: Record<string, { label: string; permissions: Permission[] }> = {
  store: {
    label: "门店管理",
    permissions: ["store:read", "store:write", "store:delete"],
  },
  table: {
    label: "桌台管理",
    permissions: ["table:read", "table:write", "table:delete"],
  },
  category: {
    label: "分类管理",
    permissions: ["category:read", "category:write", "category:delete"],
  },
  product: {
    label: "商品管理",
    permissions: ["product:read", "product:write", "product:delete"],
  },
  order: {
    label: "订单管理",
    permissions: ["order:read", "order:write", "order:refund"],
  },
  printer: {
    label: "打印机管理",
    permissions: ["printer:read", "printer:write", "printer:delete"],
  },
  member: {
    label: "会员管理",
    permissions: ["member:read", "member:write"],
  },
  coupon: {
    label: "优惠券管理",
    permissions: ["coupon:read", "coupon:write", "coupon:delete"],
  },
  promotion: {
    label: "营销活动",
    permissions: ["promotion:read", "promotion:write", "promotion:delete"],
  },
  staff: {
    label: "员工管理",
    permissions: ["staff:read", "staff:write", "staff:delete"],
  },
  settings: {
    label: "系统设置",
    permissions: ["settings:read", "settings:write"],
  },
  report: {
    label: "数据报表",
    permissions: ["report:read"],
  },
  service: {
    label: "服务呼叫",
    permissions: ["service:read", "service:write"],
  },
};

// 权限操作名称映射
const PERMISSION_LABELS: Record<string, string> = {
  read: "查看",
  write: "编辑",
  delete: "删除",
  refund: "退款",
};

// 角色图标
const ROLE_ICONS = {
  SUPER_ADMIN: Shield,
  OWNER: Crown,
  STAFF: User,
};

// 角色名称
const ROLE_NAMES = {
  SUPER_ADMIN: "超级管理员",
  OWNER: "店长",
  STAFF: "员工",
};

interface RoleConfig {
  role: string;
  permissions: string[];
  description: string;
  updatedAt: string | null;
}

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [activeRole, setActiveRole] = useState<string>("OWNER");
  const [editedPermissions, setEditedPermissions] = useState<Record<string, string[]>>({});
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});

  // 获取所有角色配置
  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await api.request<RoleConfig[]>("/api/roles");
      return res;
    },
  });

  // 更新角色权限
  const updateMutation = useMutation({
    mutationFn: async ({ role, permissions }: { role: string; permissions: string[] }) => {
      return api.request(`/api/roles/${role}`, {
        method: "PUT",
        body: { permissions },
      });
    },
    onSuccess: (_, { role }) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setHasChanges((prev) => ({ ...prev, [role]: false }));
      toast.success("保存成功");
    },
    onError: (err: Error) => {
      toast.error(err.message || "保存失败");
    },
  });

  // 重置角色权限
  const resetMutation = useMutation({
    mutationFn: async (role: string) => {
      return api.request(`/api/roles/${role}`, { method: "DELETE" });
    },
    onSuccess: (_, role) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setEditedPermissions((prev) => {
        const newState = { ...prev };
        delete newState[role];
        return newState;
      });
      setHasChanges((prev) => ({ ...prev, [role]: false }));
      toast.success("已恢复默认权限");
    },
  });

  // 获取当前角色的权限列表
  const getCurrentPermissions = (role: string): string[] => {
    if (editedPermissions[role]) {
      return editedPermissions[role];
    }
    const roleConfig = roles?.find((r) => r.role === role);
    return roleConfig?.permissions || [];
  };

  // 切换权限
  const togglePermission = (role: string, permission: string) => {
    const current = getCurrentPermissions(role);
    const newPermissions = current.includes(permission)
      ? current.filter((p) => p !== permission)
      : [...current, permission];

    setEditedPermissions((prev) => ({ ...prev, [role]: newPermissions }));
    setHasChanges((prev) => ({ ...prev, [role]: true }));
  };

  // 切换整组权限
  const toggleGroup = (role: string, groupPermissions: string[]) => {
    const current = getCurrentPermissions(role);
    const allChecked = groupPermissions.every((p) => current.includes(p));

    const newPermissions = allChecked
      ? current.filter((p) => !groupPermissions.includes(p))
      : [...new Set([...current, ...groupPermissions])];

    setEditedPermissions((prev) => ({ ...prev, [role]: newPermissions }));
    setHasChanges((prev) => ({ ...prev, [role]: true }));
  };

  // 保存
  const handleSave = (role: string) => {
    const permissions = getCurrentPermissions(role);
    updateMutation.mutate({ role, permissions });
  };

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resettingRole, setResettingRole] = useState<string | null>(null);

  // 重置
  const handleReset = (role: string) => {
    setResettingRole(role);
    setResetDialogOpen(true);
  };

  const confirmReset = () => {
    if (resettingRole !== null) {
      resetMutation.mutate(resettingRole);
      setResettingRole(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">角色权限配置</h2>
        <p className="text-muted-foreground">配置不同角色的系统访问权限</p>
      </div>

      <Tabs value={activeRole} onValueChange={setActiveRole}>
        <TabsList className="grid w-full grid-cols-3">
          {(["SUPER_ADMIN", "OWNER", "STAFF"] as const).map((role) => {
            const Icon = ROLE_ICONS[role];
            return (
              <TabsTrigger
                key={role}
                value={role}
                disabled={role === "SUPER_ADMIN"}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {ROLE_NAMES[role]}
                {hasChanges[role] && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                    未保存
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(["SUPER_ADMIN", "OWNER", "STAFF"] as const).map((role) => (
          <TabsContent key={role} value={role} className="space-y-4">
            {role === "SUPER_ADMIN" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    超级管理员
                  </CardTitle>
                  <CardDescription>超级管理员拥有系统所有权限，不可修改</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                    为保证系统安全，超级管理员的权限不允许修改。超级管理员始终拥有所有权限。
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleReset(role)}
                    disabled={resetMutation.isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    恢复默认
                  </Button>
                  <Button
                    onClick={() => handleSave(role)}
                    disabled={!hasChanges[role] || updateMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    保存修改
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
                    const currentPermissions = getCurrentPermissions(role);
                    const checkedCount = group.permissions.filter((p) =>
                      currentPermissions.includes(p)
                    ).length;
                    const allChecked = checkedCount === group.permissions.length;
                    const someChecked = checkedCount > 0 && !allChecked;

                    return (
                      <Card key={groupKey}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{group.label}</CardTitle>
                            <Checkbox
                              checked={allChecked ? true : someChecked ? "indeterminate" : false}
                              onCheckedChange={() => toggleGroup(role, group.permissions)}
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {group.permissions.map((permission) => {
                            const action = permission.split(":")[1];
                            return (
                              <div
                                key={permission}
                                className="flex items-center justify-between py-1"
                              >
                                <label
                                  htmlFor={`${role}-${permission}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {PERMISSION_LABELS[action] || action}
                                </label>
                                <Checkbox
                                  id={`${role}-${permission}`}
                                  checked={currentPermissions.includes(permission)}
                                  onCheckedChange={() => togglePermission(role, permission)}
                                />
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        onConfirm={confirmReset}
        title="确认恢复默认权限"
        description="恢复后将重置为该角色的默认权限配置，确定要继续吗？"
        confirmText="恢复"
        cancelText="取消"
      />
    </div>
  );
}
