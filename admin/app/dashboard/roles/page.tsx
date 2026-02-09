'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, RotateCcw, Shield, Crown, User, Info, Lock } from 'lucide-react'
import type { Permission, RoleConfig } from '@/types'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'

// 权限分组配置
const PERMISSION_GROUPS: Record<string, { label: string; permissions: Permission[] }> = {
  store: {
    label: '门店管理',
    permissions: ['store:read', 'store:write', 'store:delete']
  },
  table: {
    label: '桌台管理',
    permissions: ['table:read', 'table:write', 'table:delete']
  },
  category: {
    label: '分类管理',
    permissions: ['category:read', 'category:write', 'category:delete']
  },
  product: {
    label: '商品管理',
    permissions: ['product:read', 'product:write', 'product:delete']
  },
  order: {
    label: '订单管理',
    permissions: ['order:read', 'order:write', 'order:refund']
  },
  printer: {
    label: '打印机管理',
    permissions: ['printer:read', 'printer:write', 'printer:delete']
  },
  member: {
    label: '会员管理',
    permissions: ['member:read', 'member:write']
  },
  coupon: {
    label: '优惠券管理',
    permissions: ['coupon:read', 'coupon:write', 'coupon:delete']
  },
  promotion: {
    label: '营销活动',
    permissions: ['promotion:read', 'promotion:write', 'promotion:delete']
  },
  staff: {
    label: '员工管理',
    permissions: ['staff:read', 'staff:write', 'staff:delete']
  },
  settings: {
    label: '系统设置',
    permissions: ['settings:read', 'settings:write']
  },
  report: {
    label: '数据报表',
    permissions: ['report:read']
  },
  service: {
    label: '服务呼叫',
    permissions: ['service:read', 'service:write']
  }
}

// 权限操作名称映射
const PERMISSION_LABELS: Record<string, string> = {
  read: '查看',
  write: '编辑',
  delete: '删除',
  refund: '退款'
}

// 角色图标
const ROLE_ICONS = {
  SUPER_ADMIN: Shield,
  OWNER: Crown,
  STAFF: User
}

// 角色名称
const ROLE_NAMES = {
  SUPER_ADMIN: '超级管理员',
  OWNER: '店长',
  STAFF: '员工'
}

export default function RolesPage() {
  const queryClient = useQueryClient()
  const [activeRole, setActiveRole] = useState<string>('OWNER')
  const [editedPermissions, setEditedPermissions] = useState<Record<string, string[]>>({})
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({})

  // 获取所有角色配置
  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      return api.request<RoleConfig[]>('/api/roles')
    }
  })

  // 更新角色权限
  const updateMutation = useMutation({
    mutationFn: async ({ role, permissions }: { role: string; permissions: string[] }) => {
      return api.request(`/api/roles/${role}`, {
        method: 'PUT',
        body: { permissions }
      })
    },
    onSuccess: (_, { role }) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setHasChanges((prev) => ({ ...prev, [role]: false }))
      toast.success('权限配置更新成功')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : '保存失败')
    }
  })

  // 重置角色权限
  const resetMutation = useMutation({
    mutationFn: async (role: string) => {
      return api.request(`/api/roles/${role}`, { method: 'DELETE' })
    },
    onSuccess: (_, role) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setEditedPermissions((prev) => {
        const newState = { ...prev }
        delete newState[role]
        return newState
      })
      setHasChanges((prev) => ({ ...prev, [role]: false }))
      toast.success('已恢复为出厂配置')
    }
  })

  // 获取当前角色的权限列表
  const getCurrentPermissions = (role: string): string[] => {
    if (editedPermissions[role]) {
      return editedPermissions[role]
    }
    const roleConfig = roles?.find((r) => r.role === role)
    return roleConfig?.permissions || []
  }

  // 切换权限
  const togglePermission = (role: string, permission: string) => {
    const current = getCurrentPermissions(role)
    const newPermissions = current.includes(permission)
      ? current.filter((p) => p !== permission)
      : [...current, permission]

    setEditedPermissions((prev) => ({ ...prev, [role]: newPermissions }))
    setHasChanges((prev) => ({ ...prev, [role]: true }))
  }

  // 切换整组权限
  const toggleGroup = (role: string, groupPermissions: string[]) => {
    const current = getCurrentPermissions(role)
    const allChecked = groupPermissions.every((p) => current.includes(p))

    const newPermissions = allChecked
      ? current.filter((p) => !groupPermissions.includes(p))
      : [...new Set([...current, ...groupPermissions])]

    setEditedPermissions((prev) => ({ ...prev, [role]: newPermissions }))
    setHasChanges((prev) => ({ ...prev, [role]: true }))
  }

  // 保存
  const handleSave = (role: string) => {
    const permissions = getCurrentPermissions(role)
    updateMutation.mutate({ role, permissions })
  }

  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resettingRole, setResettingRole] = useState<string | null>(null)

  // 重置
  const handleReset = (role: string) => {
    setResettingRole(role)
    setResetDialogOpen(true)
  }

  const confirmReset = () => {
    if (resettingRole !== null) {
      resetMutation.mutate(resettingRole)
      setResettingRole(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">权限矩阵控制台</h2>
          <p className="text-muted-foreground text-sm">精细化定义各层级角色的系统操作边界</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
          <Info className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-bold text-blue-600 uppercase tracking-tighter">
            Security Hardening Mode Enabled
          </span>
        </div>
      </div>

      <Tabs value={activeRole} onValueChange={setActiveRole} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-14 bg-muted/30 p-1.5 rounded-2xl">
          {(['SUPER_ADMIN', 'OWNER', 'STAFF'] as const).map((role) => {
            const Icon = ROLE_ICONS[role]
            return (
              <TabsTrigger
                key={role}
                value={role}
                disabled={role === 'SUPER_ADMIN'}
                className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 gap-3"
              >
                <div
                  className={`p-1.5 rounded-lg ${activeRole === role ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="font-bold tracking-tight">{ROLE_NAMES[role]}</span>
                {hasChanges[role] && (
                  <Badge
                    className="ml-1.5 h-2 w-2 rounded-full p-0 bg-orange-500 animate-pulse"
                    title="未保存修改"
                  />
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {(['SUPER_ADMIN', 'OWNER', 'STAFF'] as const).map((role) => (
          <TabsContent
            key={role}
            value={role}
            className="mt-6 outline-none animate-in fade-in duration-300"
          >
            {role === 'SUPER_ADMIN' ? (
              <Card className="border-0 shadow-sm overflow-hidden bg-slate-50">
                <CardHeader className="border-b bg-white/50 py-10">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                    <Lock className="h-8 w-8 text-slate-400" />
                  </div>
                  <CardTitle className="text-center text-2xl font-extrabold text-slate-700 tracking-tight">
                    核心系统锁死
                  </CardTitle>
                  <CardDescription className="text-center text-base max-w-md mx-auto">
                    超级管理员权限链路受底层协议保护，不允许动态热修改。此账户始终保持全局原子操作权限。
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    如需调整超级管理员账户，请通过服务器容器环境变量或数据库控制台直接操作。
                  </p>
                  <Button variant="outline" disabled className="rounded-full">
                    解除协议封印 (管理员限制)
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center">
                      <ROLE_ICONS.STAFF className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 leading-tight">
                        {ROLE_NAMES[role]} 权限配置
                      </h3>
                      <p className="text-xs text-muted-foreground">正在通过 API 更新实时授权树</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => handleReset(role)}
                      disabled={resetMutation.isPending}
                      className="text-slate-500 hover:bg-slate-50"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      恢复默认
                    </Button>
                    <Button
                      onClick={() => handleSave(role)}
                      disabled={!hasChanges[role] || updateMutation.isPending}
                      className="bg-primary shadow-lg shadow-primary/20 hover:primary/90 px-8"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      同步配置
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
                    const currentPermissions = getCurrentPermissions(role)
                    const checkedCount = group.permissions.filter((p) =>
                      currentPermissions.includes(p)
                    ).length
                    const allChecked = checkedCount === group.permissions.length
                    const someChecked = checkedCount > 0 && !allChecked

                    return (
                      <Card
                        key={groupKey}
                        className="border border-slate-200/60 shadow-none hover:shadow-md transition-all group rounded-2xl"
                      >
                        <CardHeader className="pb-3 bg-slate-50/50 group-hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-extrabold text-slate-700 tracking-wide uppercase">
                              {group.label}
                            </CardTitle>
                            <Checkbox
                              checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                              onCheckedChange={() => toggleGroup(role, group.permissions)}
                              className="rounded-md border-slate-300"
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 pb-4 space-y-1.5">
                          {group.permissions.map((permission) => {
                            const action = permission.split(':')[1]
                            return (
                              <label
                                key={permission}
                                className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group/item"
                              >
                                <span className="text-sm font-medium text-slate-600 group-hover/item:text-slate-900">
                                  {PERMISSION_LABELS[action] || action}权限
                                </span>
                                <Checkbox
                                  id={`${role}-${permission}`}
                                  checked={currentPermissions.includes(permission)}
                                  onCheckedChange={() => togglePermission(role, permission)}
                                  className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:bg-primary"
                                />
                              </label>
                            )
                          })}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        onConfirm={confirmReset}
        title="安全警告：权限重置"
        description="该操作将导致所选角色的所有权限回退到系统初始化状态（出厂配置）。关联员工的访问权限将立刻发生变更。确定继续吗？"
        confirmText="确认回滚"
        cancelText="取消"
        variant="destructive"
      />
    </div>
  )
}
