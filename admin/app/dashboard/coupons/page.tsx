"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Ticket } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";

interface Coupon {
  id: number;
  storeId: number | null;
  name: string;
  type: "FIXED" | "PERCENT" | "NO_THRESHOLD";
  value: string;
  minAmount: string;
  maxDiscount: string | null;
  totalCount: number;
  usedCount: number;
  claimedCount: number;
  perUserLimit: number;
  startTime: string;
  endTime: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  FIXED: "满减券",
  PERCENT: "折扣券",
  NO_THRESHOLD: "无门槛券",
};

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  ACTIVE: { label: "进行中", variant: "default" },
  INACTIVE: { label: "已停用", variant: "secondary" },
  EXPIRED: { label: "已过期", variant: "destructive" },
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCouponId, setDeletingCouponId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "FIXED" as "FIXED" | "PERCENT" | "NO_THRESHOLD",
    value: "",
    minAmount: "0",
    maxDiscount: "",
    totalCount: "-1",
    perUserLimit: "1",
    startTime: "",
    endTime: "",
    description: "",
  });

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.request<{ list: Coupon[] }>("/api/coupons");
      setCoupons(res.list);
    } catch (error) {
      console.error("Failed to fetch coupons:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = () => {
    setEditingCoupon(null);
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    setFormData({
      name: "",
      type: "FIXED",
      value: "",
      minAmount: "0",
      maxDiscount: "",
      totalCount: "-1",
      perUserLimit: "1",
      startTime: now.toISOString().slice(0, 16),
      endTime: nextMonth.toISOString().slice(0, 16),
      description: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      name: coupon.name,
      type: coupon.type,
      value: coupon.value,
      minAmount: coupon.minAmount,
      maxDiscount: coupon.maxDiscount || "",
      totalCount: coupon.totalCount.toString(),
      perUserLimit: coupon.perUserLimit.toString(),
      startTime: new Date(coupon.startTime).toISOString().slice(0, 16),
      endTime: new Date(coupon.endTime).toISOString().slice(0, 16),
      description: coupon.description || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const data = {
        name: formData.name,
        type: formData.type,
        value: Number(formData.value),
        minAmount: Number(formData.minAmount),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
        totalCount: Number(formData.totalCount),
        perUserLimit: Number(formData.perUserLimit),
        startTime: formData.startTime,
        endTime: formData.endTime,
        description: formData.description || undefined,
      };

      if (editingCoupon) {
        await api.request(`/api/coupons/${editingCoupon.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        await api.request("/api/coupons", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }

      setDialogOpen(false);
      fetchCoupons();
    } catch (error) {
      console.error("Failed to save coupon:", error);
    }
  };

  const handleDelete = (id: number) => {
    setDeletingCouponId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingCouponId === null) return;

    try {
      await api.request(`/api/coupons/${deletingCouponId}`, { method: "DELETE" });
      fetchCoupons();
      toast.success("优惠券删除成功");
      setDeletingCouponId(null);
    } catch (error) {
      console.error("Failed to delete coupon:", error);
      toast.error(error instanceof Error ? error.message : "删除优惠券失败");
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    const newStatus = coupon.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.request(`/api/coupons/${coupon.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      fetchCoupons();
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };

  const formatCouponValue = (coupon: Coupon) => {
    if (coupon.type === "FIXED" || coupon.type === "NO_THRESHOLD") {
      return `减 ${formatPrice(coupon.value)}`;
    }
    return `${(Number(coupon.value) * 10).toFixed(1)} 折`;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">优惠券管理</h2>
          <p className="text-muted-foreground">创建和管理优惠券</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新建优惠券
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            优惠券列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>优惠内容</TableHead>
                <TableHead>使用门槛</TableHead>
                <TableHead>领取/使用</TableHead>
                <TableHead>有效期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium">{coupon.name}</TableCell>
                  <TableCell>{typeLabels[coupon.type]}</TableCell>
                  <TableCell>{formatCouponValue(coupon)}</TableCell>
                  <TableCell>
                    {Number(coupon.minAmount) > 0
                      ? `满 ${formatPrice(coupon.minAmount)}`
                      : "无门槛"}
                  </TableCell>
                  <TableCell>
                    {coupon.claimedCount}/{coupon.totalCount === -1 ? "∞" : coupon.totalCount}
                    <span className="text-muted-foreground ml-1">(已用 {coupon.usedCount})</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{new Date(coupon.startTime).toLocaleDateString()}</div>
                    <div className="text-muted-foreground">
                      ~ {new Date(coupon.endTime).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusLabels[coupon.status].variant}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(coupon)}
                    >
                      {statusLabels[coupon.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {coupons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    暂无优惠券，点击右上角创建
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "编辑优惠券" : "新建优惠券"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">优惠券名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：新人专享满50减10"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, type: v as "FIXED" | "PERCENT" | "NO_THRESHOLD" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">满减券</SelectItem>
                    <SelectItem value="PERCENT">折扣券</SelectItem>
                    <SelectItem value="NO_THRESHOLD">无门槛券</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="value">
                  {formData.type === "PERCENT" ? "折扣 (0.8=8折)" : "优惠金额"}
                </Label>
                <Input
                  id="value"
                  type="number"
                  step={formData.type === "PERCENT" ? "0.01" : "1"}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === "PERCENT" ? "0.8" : "10"}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="minAmount">最低消费金额</Label>
                <Input
                  id="minAmount"
                  type="number"
                  value={formData.minAmount}
                  onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                  placeholder="0 表示无门槛"
                />
              </div>
              {formData.type === "PERCENT" && (
                <div className="grid gap-2">
                  <Label htmlFor="maxDiscount">最大优惠金额</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    placeholder="不限"
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="totalCount">发放总量</Label>
                <Input
                  id="totalCount"
                  type="number"
                  value={formData.totalCount}
                  onChange={(e) => setFormData({ ...formData, totalCount: e.target.value })}
                  placeholder="-1 表示不限"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="perUserLimit">每人限领</Label>
                <Input
                  id="perUserLimit"
                  type="number"
                  value={formData.perUserLimit}
                  onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">开始时间</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">结束时间</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">使用说明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="可选，描述优惠券的使用条件"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="确认删除优惠券"
        description="删除后无法恢复，确定要删除这个优惠券吗？"
        confirmText="删除"
        cancelText="取消"
      />
    </div>
  );
}
