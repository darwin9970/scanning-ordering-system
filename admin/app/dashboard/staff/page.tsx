'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '@/lib/api'
import { staffSchema, type StaffFormData } from '@/lib/validations'
import { ROLE_MAP } from '@/lib/utils'
import type { Staff, Role } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  User,
  ShieldCheck,
  Store,
  KeyRound
} from 'lucide-react'
import { toast } from 'sonner'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'

export default function StaffPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [keyword, setKeyword] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingStaffId, setDeletingStaffId] = useState<number | null>(null)

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      username: '',
      password: '',
      name: '',
      role: 'STAFF',
      storeId: undefined
    }
  })

  const { data: staffList, isLoading } = useQuery({
    queryKey: ['staff', page, roleFilter, keyword],
    queryFn: () =>
      api.getStaff({
        page,
        pageSize: 10,
        role: roleFilter ? (roleFilter as Role) : undefined,
        keyword: keyword || undefined
      })
  })

  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.getStores({ pageSize: 100 })
  })

  const createMutation = useMutation({
    mutationFn: (data: StaffFormData) => api.createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      setDialogOpen(false)
      toast.success('员工账号创建成功')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : '操作失败')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StaffFormData> }) =>
      api.updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      setDialogOpen(false)
      toast.success('员工信息已同步')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('员工已被安全移出系统')
      setDeletingStaffId(null)
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'ACTIVE' | 'INACTIVE' }) =>
      api.updateStaffStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('员工状态已切换')
    }
  })

  const openCreateDialog = () => {
    setEditingStaff(null)
    form.reset({
      username: '',
      password: '',
      name: '',
      role: 'STAFF',
      storeId: undefined
    })
    setDialogOpen(true)
  }

  const openEditDialog = (staff: Staff) => {
    setEditingStaff(staff)
    form.reset({
      username: staff.username,
      password: '',
      name: staff.name,
      role: staff.role,
      storeId: staff.storeId || undefined
    })
    setDialogOpen(true)
  }

  const onSubmit = (data: StaffFormData) => {
    if (editingStaff) {
      const updateData: Partial<StaffFormData> = {
        name: data.name,
        role: data.role,
        storeId: data.storeId
      }
      if (data.password) {
        updateData.password = data.password
      }
      updateMutation.mutate({ id: editingStaff.id, data: updateData })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = (id: number) => {
    setDeletingStaffId(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (deletingStaffId !== null) {
      deleteMutation.mutate(deletingStaffId)
    }
  }

  const handleStatusToggle = (staff: Staff) => {
    const newStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    statusMutation.mutate({ id: staff.id, status: newStatus })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">员工架构管理</h2>
          <p className="text-muted-foreground text-sm">维护系统账号完整性，分配岗位职权</p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="rounded-full px-6 bg-primary shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          新增员工账号
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="bg-linear-to-r from-muted/30 to-transparent pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              账号资产
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="快速定位姓名..."
                  className="pl-8 w-[200px] h-9 rounded-xl focus:ring-primary/20 transition-all"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <Select
                value={roleFilter || 'ALL'}
                onValueChange={(v) => setRoleFilter(v === 'ALL' ? '' : v)}
              >
                <SelectTrigger className="w-[130px] h-9 rounded-xl">
                  <SelectValue placeholder="全部岗位" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">全部岗位</SelectItem>
                  <SelectItem value="SUPER_ADMIN">超级管理员</SelectItem>
                  <SelectItem value="OWNER">店长</SelectItem>
                  <SelectItem value="STAFF">店员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">账户标识</TableHead>
                    <TableHead>实名</TableHead>
                    <TableHead>权限层级</TableHead>
                    <TableHead>常驻门店</TableHead>
                    <TableHead>活跃状态</TableHead>
                    <TableHead className="text-right pr-6">操作管理</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList?.list.map((staff) => (
                    <TableRow key={staff.id} className="hover:bg-muted/5 transition-colors group">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                            {staff.username.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-700">{staff.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`rounded-full border-0 font-bold text-[10px] px-2.5 py-0.5 ${
                            staff.role === 'SUPER_ADMIN'
                              ? 'bg-purple-50 text-purple-600'
                              : staff.role === 'OWNER'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-slate-50 text-slate-600'
                          }`}
                        >
                          {ROLE_MAP[staff.role]?.label || staff.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Store className="h-3 w-3" />
                          {staff.store?.name || (
                            <span className="opacity-40 font-mono">SYSTEM_CORE</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${staff.status === 'ACTIVE' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`}
                          />
                          <span
                            className={`text-xs font-bold ${staff.status === 'ACTIVE' ? 'text-green-600' : 'text-slate-400'}`}
                          >
                            {staff.status === 'ACTIVE' ? '在线' : '离线'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-slate-100"
                            onClick={() => handleStatusToggle(staff)}
                            title={staff.status === 'ACTIVE' ? '冻结账户' : '解冻账户'}
                          >
                            {staff.status === 'ACTIVE' ? (
                              <UserX className="h-3.5 w-3.5 text-red-400" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5 text-green-500" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-slate-100"
                            onClick={() => openEditDialog(staff)}
                          >
                            <Edit className="h-3.5 w-3.5 text-blue-500" />
                          </Button>
                          {staff.role !== 'SUPER_ADMIN' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:bg-red-50"
                              onClick={() => handleDelete(staff.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between p-6 border-t">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Total Accounts: {staffList?.total || 0}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    className="rounded-xl h-8 px-4 font-bold text-xs"
                    onClick={() => setPage(page - 1)}
                  >
                    PREV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!staffList?.list || staffList.list.length < 10}
                    className="rounded-xl h-8 px-4 font-bold text-xs"
                    onClick={() => setPage(page + 1)}
                  >
                    NEXT
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              {editingStaff ? '更新员工机密空间' : '签发新入职通行证'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  安全认证账号 (UID)
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    {...form.register('username')}
                    placeholder="例如: Darwin_007"
                    disabled={!!editingStaff}
                    className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
                {form.formState.errors.username && (
                  <p className="text-[10px] font-bold text-red-500 flash-animation">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  访问密钥 (Passcode)
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    {...form.register('password')}
                    placeholder={editingStaff ? '加密隐藏 - 输入则重置' : '设置初始复杂密钥'}
                    className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    现实姓名
                  </Label>
                  <Input
                    {...form.register('name')}
                    placeholder="真实姓名"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    授权职等
                  </Label>
                  <Select
                    value={form.watch('role')}
                    onValueChange={(v) => form.setValue('role', v as Role)}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="STAFF">普通店员</SelectItem>
                      <SelectItem value="OWNER">核心店长</SelectItem>
                      <SelectItem value="SUPER_ADMIN">超级管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  分配常驻坐标
                </Label>
                <Select
                  value={form.watch('storeId')?.toString() || 'NONE'}
                  onValueChange={(v) =>
                    form.setValue('storeId', v === 'NONE' ? undefined : Number(v))
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl bg-primary/5 border-primary/10">
                    <SelectValue placeholder="选择受控门店" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="NONE">全局/暂无分配</SelectItem>
                    {stores?.list.map((store) => (
                      <SelectItem key={store.id} value={String(store.id)}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="border-t pt-6 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl flex-1 font-bold"
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="rounded-xl flex-1 bg-primary font-bold shadow-lg shadow-primary/20"
              >
                {editingStaff ? 'SYNC DATA' : 'CONFIRM ISSUANCE'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="安全警示：注销账户"
        description="该员工的所有系统访问凭证将被吊销。这将是永久性的数据清理动作。请确认该员工已完成职权交接。"
        confirmText="确认注销"
        cancelText="取消"
      />
    </div>
  )
}
