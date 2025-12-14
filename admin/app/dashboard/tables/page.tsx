"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { TABLE_STATUS_MAP } from "@/lib/utils";
import {
  tableSchema,
  tableBatchSchema,
  type TableFormData,
  type TableBatchFormData,
} from "@/lib/validations";
import type { Table } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, QrCode, RefreshCw, Edit, Trash2, Download, Eye } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

export default function TablesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTableId, setDeletingTableId] = useState<number | null>(null);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [regeneratingTableId, setRegeneratingTableId] = useState<number | null>(null);

  // 小程序基础URL（实际部署时替换为真实地址）
  const MINI_PROGRAM_URL =
    process.env.NEXT_PUBLIC_MINI_PROGRAM_URL || "https://your-mini-program.com";

  const form = useForm<TableFormData>({
    resolver: zodResolver(tableSchema),
    defaultValues: { storeId: 1, name: "", capacity: 4 },
  });

  const batchForm = useForm<TableBatchFormData>({
    resolver: zodResolver(tableBatchSchema),
    defaultValues: { storeId: 1, prefix: "A", startNum: 1, count: 10, capacity: 4 },
  });

  const { data: tables, isLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: () => api.getTables({ pageSize: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: TableFormData) => api.createTable(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setDialogOpen(false);
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: (data: TableBatchFormData) => api.createTablesBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setBatchDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TableFormData> }) =>
      api.updateTable(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteTable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const regenerateQrMutation = useMutation({
    mutationFn: (id: number) => api.regenerateQrCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const openCreateDialog = () => {
    setEditingTable(null);
    form.reset({ storeId: 1, name: "", capacity: 4 });
    setDialogOpen(true);
  };

  const openEditDialog = (table: Table) => {
    setEditingTable(table);
    form.reset({ storeId: table.storeId, name: table.name, capacity: table.capacity });
    setDialogOpen(true);
  };

  const onSubmit = (data: TableFormData) => {
    if (editingTable) {
      updateMutation.mutate({ id: editingTable.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const onBatchSubmit = (data: TableBatchFormData) => {
    createBatchMutation.mutate(data);
  };

  const handleDelete = (id: number) => {
    setDeletingTableId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingTableId !== null) {
      deleteMutation.mutate(deletingTableId);
      setDeletingTableId(null);
    }
  };

  const handleRegenerateQr = (id: number) => {
    setRegeneratingTableId(id);
    setRegenerateDialogOpen(true);
  };

  const confirmRegenerate = () => {
    if (regeneratingTableId !== null) {
      regenerateQrMutation.mutate(regeneratingTableId);
      setRegeneratingTableId(null);
    }
  };

  const handleViewQr = (table: Table) => {
    setSelectedTable(table);
    setQrDialogOpen(true);
  };

  const getQrCodeUrl = (table: Table) => {
    return `${MINI_PROGRAM_URL}/order?storeId=${table.storeId}&tableId=${table.id}&code=${table.qrCode}`;
  };

  const handleDownloadQr = () => {
    if (!selectedTable) return;

    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    // 创建canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 300, 300);

        const link = document.createElement("a");
        link.download = `桌台-${selectedTable.name}-二维码.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  // 按状态分组
  const groupedTables = tables?.list.reduce(
    (acc: any, table: any) => {
      acc[table.status] = acc[table.status] || [];
      acc[table.status].push(table);
      return acc;
    },
    { FREE: [], OCCUPIED: [], RESERVED: [] }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">桌台管理</h2>
          <p className="text-muted-foreground">管理门店桌台，生成点餐二维码</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBatchDialogOpen(true)}>
            批量创建
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            添加桌台
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">空闲桌台</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {groupedTables?.FREE?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">使用中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {groupedTables?.OCCUPIED?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已预约</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {groupedTables?.RESERVED?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 桌台列表 */}
      <Card>
        <CardHeader>
          <CardTitle>桌台列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {tables?.list.map((table: any) => (
                <Card key={table.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold">{table.name}</h3>
                        <p className="text-sm text-muted-foreground">{table.capacity}人桌</p>
                      </div>
                      <Badge className={TABLE_STATUS_MAP[table.status]?.color || ""}>
                        {TABLE_STATUS_MAP[table.status]?.label}
                      </Badge>
                    </div>
                    <div className="mt-4 flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewQr(table)}
                        title="查看二维码"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRegenerateQr(table.id)}
                        title="重新生成二维码"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(table)}
                        title="编辑"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(table.id)}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加/编辑桌台弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? "编辑桌台" : "添加桌台"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>桌台号 *</Label>
              <Input {...form.register("name")} placeholder="如 A01、B02（1-50字符）" />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>容纳人数</Label>
              <Input
                type="number"
                {...form.register("capacity", { valueAsNumber: true })}
                placeholder="1-50人"
              />
              {form.formState.errors.capacity && (
                <p className="text-sm text-red-500">{form.formState.errors.capacity.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingTable ? "保存" : "添加"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 批量创建弹窗 */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量创建桌台</DialogTitle>
          </DialogHeader>
          <form onSubmit={batchForm.handleSubmit(onBatchSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>前缀 *</Label>
                <Input {...batchForm.register("prefix")} placeholder="如 A、B" />
                {batchForm.formState.errors.prefix && (
                  <p className="text-sm text-red-500">
                    {batchForm.formState.errors.prefix.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>起始编号 *</Label>
                <Input type="number" {...batchForm.register("startNum", { valueAsNumber: true })} />
                {batchForm.formState.errors.startNum && (
                  <p className="text-sm text-red-500">
                    {batchForm.formState.errors.startNum.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>创建数量 *</Label>
                <Input type="number" {...batchForm.register("count", { valueAsNumber: true })} />
                {batchForm.formState.errors.count && (
                  <p className="text-sm text-red-500">{batchForm.formState.errors.count.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>容纳人数</Label>
                <Input type="number" {...batchForm.register("capacity", { valueAsNumber: true })} />
                {batchForm.formState.errors.capacity && (
                  <p className="text-sm text-red-500">
                    {batchForm.formState.errors.capacity.message}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              将创建: {batchForm.watch("prefix")}
              {String(batchForm.watch("startNum")).padStart(2, "0")} ~ {batchForm.watch("prefix")}
              {String(batchForm.watch("startNum") + batchForm.watch("count") - 1).padStart(2, "0")}
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBatchDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={batchForm.formState.isSubmitting}>
                批量创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 二维码预览弹窗 */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              桌台二维码 - {selectedTable?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedTable && (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-lg border bg-white p-4">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={getQrCodeUrl(selectedTable)}
                  size={240}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-lg">{selectedTable.name}</p>
                <p className="text-sm text-muted-foreground">{selectedTable.capacity}人桌</p>
              </div>
              <div className="text-xs text-muted-foreground break-all px-4 text-center">
                {getQrCodeUrl(selectedTable)}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
                  关闭
                </Button>
                <Button onClick={handleDownloadQr}>
                  <Download className="h-4 w-4 mr-2" />
                  下载二维码
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="确认删除桌台"
        description="删除后无法恢复，确定要删除这个桌台吗？"
        confirmText="删除"
        cancelText="取消"
      />

      <ConfirmDialog
        open={regenerateDialogOpen}
        onOpenChange={setRegenerateDialogOpen}
        onConfirm={confirmRegenerate}
        title="确认重新生成二维码"
        description="重新生成后，原二维码将失效，确定要继续吗？"
        confirmText="重新生成"
        cancelText="取消"
      />
    </div>
  );
}
