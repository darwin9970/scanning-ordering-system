"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { staffSchema, type StaffFormData } from "@/lib/validations";
import { ROLE_MAP } from "@/lib/utils";
import type { Staff, Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<number | null>(null);

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      role: "STAFF",
      storeId: undefined,
    },
  });

  const { data: staffList, isLoading } = useQuery({
    queryKey: ["staff", page, roleFilter, keyword],
    queryFn: () =>
      api.getStaff({
        page,
        pageSize: 10,
        role: roleFilter ? (roleFilter as Role) : undefined,
        keyword: keyword || undefined,
      }),
  });

  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: () => api.getStores({ pageSize: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: StaffFormData) => api.createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "操作失败");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StaffFormData> }) =>
      api.updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("员工删除成功");
    },
    onError: (error: Error) => {
      toast.error(error.message || "删除员工失败");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "ACTIVE" | "INACTIVE" }) =>
      api.updateStaffStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });

  const openCreateDialog = () => {
    setEditingStaff(null);
    form.reset({
      username: "",
      password: "",
      name: "",
      role: "STAFF",
      storeId: undefined,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (staff: Staff) => {
    setEditingStaff(staff);
    form.reset({
      username: staff.username,
      password: "",
      name: staff.name,
      role: staff.role,
      storeId: staff.storeId || undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: StaffFormData) => {
    if (editingStaff) {
      const updateData: Partial<StaffFormData> = {
        name: data.name,
        role: data.role,
        storeId: data.storeId,
      };
      if (data.password) {
        updateData.password = data.password;
      }
      updateMutation.mutate({ id: editingStaff.id, data: updateData });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    setDeletingStaffId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingStaffId !== null) {
      deleteMutation.mutate(deletingStaffId);
      setDeletingStaffId(null);
    }
  };

  const handleStatusToggle = (staff: Staff) => {
    const newStatus = staff.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    statusMutation.mutate({ id: staff.id, status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">员工管理</h2>
          <p className="text-muted-foreground">管理门店员工账号和权限</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          添加员工
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>员工列表</CardTitle>
          <div className="flex gap-2 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索员工姓名..."
                className="pl-8 w-[200px]"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <Select
              value={roleFilter || "ALL"}
              onValueChange={(v) => setRoleFilter(v === "ALL" ? "" : v)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="全部角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部角色</SelectItem>
                <SelectItem value="SUPER_ADMIN">超级管理员</SelectItem>
                <SelectItem value="OWNER">店长</SelectItem>
                <SelectItem value="STAFF">店员</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户名</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>所属门店</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList?.list.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.username}</TableCell>
                      <TableCell>{staff.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            staff.role === "SUPER_ADMIN"
                              ? "default"
                              : staff.role === "OWNER"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {ROLE_MAP[staff.role]?.label || staff.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{staff.store?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={staff.status === "ACTIVE" ? "default" : "secondary"}>
                          {staff.status === "ACTIVE" ? "启用" : "禁用"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(staff.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusToggle(staff)}
                            title={staff.status === "ACTIVE" ? "禁用" : "启用"}
                          >
                            {staff.status === "ACTIVE" ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(staff)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {staff.role !== "SUPER_ADMIN" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(staff.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">共 {staffList?.total || 0} 条记录</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!staffList?.list || staffList.list.length < 10}
                    onClick={() => setPage(page + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 添加/编辑员工弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? "编辑员工" : "添加员工"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>用户名 *</Label>
              <Input
                {...form.register("username")}
                placeholder="登录用户名（3-50字符）"
                disabled={!!editingStaff}
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-500">{form.formState.errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{editingStaff ? "密码（留空不修改）" : "密码 *"}</Label>
              <Input
                type="password"
                {...form.register("password")}
                placeholder={editingStaff ? "留空表示不修改" : "至少6位"}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>姓名 *</Label>
              <Input {...form.register("name")} placeholder="员工姓名" />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>角色 *</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(v) => form.setValue("role", v as Role)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">店员</SelectItem>
                  <SelectItem value="OWNER">店长</SelectItem>
                  <SelectItem value="SUPER_ADMIN">超级管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>所属门店</Label>
              <Select
                value={form.watch("storeId")?.toString() || "NONE"}
                onValueChange={(v) =>
                  form.setValue("storeId", v === "NONE" ? undefined : Number(v))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择门店（超管可不选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">不绑定门店</SelectItem>
                  {stores?.list.map((store) => (
                    <SelectItem key={store.id} value={String(store.id)}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingStaff ? "保存" : "添加"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="确认删除员工"
        description="删除后无法恢复，确定要删除这个员工吗？"
        confirmText="删除"
        cancelText="取消"
      />
    </div>
  );
}
