"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PRINTER_TYPE_MAP } from "@/lib/utils";
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
import { Plus, Printer, Edit, Trash2, Link2, TestTube } from "lucide-react";

export default function PrintersPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bindDialogOpen, setBindDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<any>(null);
  const [bindingPrinter, setBindingPrinter] = useState<any>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    sn: "",
    key: "",
    name: "",
    type: "KITCHEN",
  });

  const { data: printers, isLoading } = useQuery({
    queryKey: ["printers"],
    queryFn: () => api.getPrinters({ pageSize: 100 }),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories({ pageSize: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createPrinter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      alert(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updatePrinter(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deletePrinter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: number) => api.testPrinter(id),
    onSuccess: () => {
      alert("测试打印请求已发送");
    },
    onError: (error: any) => {
      alert(error.message);
    },
  });

  const bindMutation = useMutation({
    mutationFn: ({ id, categoryIds }: { id: number; categoryIds: number[] }) =>
      api.bindPrinterCategories(id, categoryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      setBindDialogOpen(false);
    },
  });

  const resetForm = () => {
    setFormData({ sn: "", key: "", name: "", type: "KITCHEN" });
    setEditingPrinter(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (printer: any) => {
    setEditingPrinter(printer);
    setFormData({
      sn: printer.sn,
      key: printer.key,
      name: printer.name,
      type: printer.type,
    });
    setDialogOpen(true);
  };

  const openBindDialog = (printer: any) => {
    setBindingPrinter(printer);
    setSelectedCategories(printer.categories?.map((c: any) => c.category.id) || []);
    setBindDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      storeId: 1,
      ...formData,
    };

    if (editingPrinter) {
      updateMutation.mutate({ id: editingPrinter.id, data: formData });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这台打印机吗？")) {
      deleteMutation.mutate(id);
    }
  };

  const handleBind = () => {
    if (bindingPrinter) {
      bindMutation.mutate({ id: bindingPrinter.id, categoryIds: selectedCategories });
    }
  };

  const toggleCategory = (catId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">打印机配置</h2>
          <p className="text-muted-foreground">管理云打印机，配置分单规则</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          添加打印机
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>打印机列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>打印机名称</TableHead>
                  <TableHead>SN码</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>绑定分类</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printers?.list.map((printer: any) => (
                  <TableRow key={printer.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Printer className="h-4 w-4 text-muted-foreground" />
                        {printer.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{printer.sn}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{PRINTER_TYPE_MAP[printer.type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {printer.categories?.map((c: any) => (
                          <Badge key={c.category.id} variant="secondary">
                            {c.category.name}
                          </Badge>
                        ))}
                        {(!printer.categories || printer.categories.length === 0) && (
                          <span className="text-muted-foreground text-sm">未绑定</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={printer.status === "ACTIVE" ? "default" : "secondary"}>
                        {printer.status === "ACTIVE" ? "在线" : "离线"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => testMutation.mutate(printer.id)}
                          title="测试打印"
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openBindDialog(printer)}
                          title="绑定分类"
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(printer)}
                          title="编辑"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(printer.id)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 添加/编辑打印机弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPrinter ? "编辑打印机" : "添加打印机"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>打印机名称</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：后厨打印机"
              />
            </div>
            <div className="space-y-2">
              <Label>SN码</Label>
              <Input
                value={formData.sn}
                onChange={(e) => setFormData({ ...formData, sn: e.target.value })}
                placeholder="打印机背面的SN码"
              />
            </div>
            <div className="space-y-2">
              <Label>Key</Label>
              <Input
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="打印机密钥"
              />
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KITCHEN">后厨</SelectItem>
                  <SelectItem value="CASHIER">收银</SelectItem>
                  <SelectItem value="BAR">吧台</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.sn}>
              {editingPrinter ? "保存" : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 绑定分类弹窗 */}
      <Dialog open={bindDialogOpen} onOpenChange={setBindDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>绑定分类 - {bindingPrinter?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              选择该打印机需要打印的商品分类，实现自动分单
            </p>
            <div className="grid grid-cols-2 gap-2">
              {categories?.list.map((cat: any) => (
                <Button
                  key={cat.id}
                  variant={selectedCategories.includes(cat.id) ? "default" : "outline"}
                  onClick={() => toggleCategory(cat.id)}
                  className="justify-start"
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBindDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleBind}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
