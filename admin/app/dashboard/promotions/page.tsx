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
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Zap, X } from "lucide-react";

interface Promotion {
  id: number;
  storeId: number | null;
  name: string;
  type: "FULL_REDUCE" | "DISCOUNT" | "NEW_USER" | "TIME_LIMITED";
  rules: Record<string, unknown>;
  startTime: string;
  endTime: string;
  description: string | null;
  priority: number;
  stackable: boolean;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

interface FullReduceTier {
  min: number;
  discount: number;
}

const typeLabels: Record<string, string> = {
  FULL_REDUCE: "满减活动",
  DISCOUNT: "折扣活动",
  NEW_USER: "新人专享",
  TIME_LIMITED: "限时特价",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" }> = {
  ACTIVE: { label: "进行中", variant: "default" },
  INACTIVE: { label: "已停用", variant: "secondary" },
};

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "FULL_REDUCE" as Promotion["type"],
    startTime: "",
    endTime: "",
    description: "",
    priority: "0",
    stackable: false,
  });
  
  // 满减规则
  const [fullReduceTiers, setFullReduceTiers] = useState<FullReduceTier[]>([
    { min: 50, discount: 5 },
  ]);
  
  // 折扣规则
  const [discountValue, setDiscountValue] = useState("0.8");
  const [maxDiscount, setMaxDiscount] = useState("");

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const res = await api.request<{ list: Promotion[] }>("/api/promotions");
      setPromotions(res.list);
    } catch (error) {
      console.error("Failed to fetch promotions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleCreate = () => {
    setEditingPromotion(null);
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    setFormData({
      name: "",
      type: "FULL_REDUCE",
      startTime: now.toISOString().slice(0, 16),
      endTime: nextMonth.toISOString().slice(0, 16),
      description: "",
      priority: "0",
      stackable: false,
    });
    setFullReduceTiers([{ min: 50, discount: 5 }]);
    setDiscountValue("0.8");
    setMaxDiscount("");
    setDialogOpen(true);
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      type: promotion.type,
      startTime: new Date(promotion.startTime).toISOString().slice(0, 16),
      endTime: new Date(promotion.endTime).toISOString().slice(0, 16),
      description: promotion.description || "",
      priority: promotion.priority.toString(),
      stackable: promotion.stackable,
    });

    // 解析规则
    if (promotion.type === "FULL_REDUCE") {
      const rules = promotion.rules as { tiers: FullReduceTier[] };
      setFullReduceTiers(rules.tiers || [{ min: 50, discount: 5 }]);
    } else if (promotion.type === "DISCOUNT" || promotion.type === "TIME_LIMITED") {
      const rules = promotion.rules as { discount: number; maxDiscount?: number };
      setDiscountValue(rules.discount?.toString() || "0.8");
      setMaxDiscount(rules.maxDiscount?.toString() || "");
    } else if (promotion.type === "NEW_USER") {
      const rules = promotion.rules as { discount: number };
      setDiscountValue(rules.discount?.toString() || "10");
    }

    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      let rules: Record<string, unknown> = {};

      if (formData.type === "FULL_REDUCE") {
        rules = { tiers: fullReduceTiers };
      } else if (formData.type === "DISCOUNT" || formData.type === "TIME_LIMITED") {
        rules = {
          discount: Number(discountValue),
          ...(maxDiscount ? { maxDiscount: Number(maxDiscount) } : {}),
        };
      } else if (formData.type === "NEW_USER") {
        rules = { discount: Number(discountValue) };
      }

      const data = {
        name: formData.name,
        type: formData.type,
        rules,
        startTime: formData.startTime,
        endTime: formData.endTime,
        description: formData.description || undefined,
        priority: Number(formData.priority),
        stackable: formData.stackable,
      };

      if (editingPromotion) {
        await api.request(`/api/promotions/${editingPromotion.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        await api.request("/api/promotions", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }

      setDialogOpen(false);
      fetchPromotions();
    } catch (error) {
      console.error("Failed to save promotion:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个活动吗？")) return;

    try {
      await api.request(`/api/promotions/${id}`, { method: "DELETE" });
      fetchPromotions();
    } catch (error) {
      console.error("Failed to delete promotion:", error);
    }
  };

  const handleToggleStatus = async (promotion: Promotion) => {
    const newStatus = promotion.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.request(`/api/promotions/${promotion.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      fetchPromotions();
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };

  const addTier = () => {
    const lastTier = fullReduceTiers[fullReduceTiers.length - 1];
    setFullReduceTiers([
      ...fullReduceTiers,
      { min: (lastTier?.min || 0) + 50, discount: (lastTier?.discount || 0) + 5 },
    ]);
  };

  const removeTier = (index: number) => {
    setFullReduceTiers(fullReduceTiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: "min" | "discount", value: number) => {
    const newTiers = [...fullReduceTiers];
    newTiers[index] = { ...newTiers[index]!, [field]: value };
    setFullReduceTiers(newTiers);
  };

  const formatRules = (promotion: Promotion) => {
    if (promotion.type === "FULL_REDUCE") {
      const rules = promotion.rules as { tiers: FullReduceTier[] };
      return rules.tiers
        ?.map((t) => `满${t.min}减${t.discount}`)
        .join(", ");
    } else if (promotion.type === "DISCOUNT" || promotion.type === "TIME_LIMITED") {
      const rules = promotion.rules as { discount: number; maxDiscount?: number };
      let text = `${(rules.discount * 10).toFixed(1)}折`;
      if (rules.maxDiscount) text += ` (最高减${rules.maxDiscount})`;
      return text;
    } else if (promotion.type === "NEW_USER") {
      const rules = promotion.rules as { discount: number };
      return `减 ${formatPrice(rules.discount)}`;
    }
    return "-";
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
          <h2 className="text-2xl font-bold tracking-tight">营销活动</h2>
          <p className="text-muted-foreground">创建和管理满减、折扣等营销活动</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新建活动
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            活动列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>活动名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>优惠规则</TableHead>
                <TableHead>有效期</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>可叠加</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promotion) => (
                <TableRow key={promotion.id}>
                  <TableCell className="font-medium">{promotion.name}</TableCell>
                  <TableCell>{typeLabels[promotion.type]}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {formatRules(promotion)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{new Date(promotion.startTime).toLocaleDateString()}</div>
                    <div className="text-muted-foreground">
                      ~ {new Date(promotion.endTime).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>{promotion.priority}</TableCell>
                  <TableCell>{promotion.stackable ? "是" : "否"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={statusLabels[promotion.status].variant}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(promotion)}
                    >
                      {statusLabels[promotion.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(promotion)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(promotion.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {promotions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    暂无活动，点击右上角创建
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPromotion ? "编辑活动" : "新建活动"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">活动名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：周末满减狂欢"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">活动类型</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as Promotion["type"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_REDUCE">满减活动</SelectItem>
                  <SelectItem value="DISCOUNT">折扣活动</SelectItem>
                  <SelectItem value="NEW_USER">新人专享</SelectItem>
                  <SelectItem value="TIME_LIMITED">限时特价</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 满减规则 */}
            {formData.type === "FULL_REDUCE" && (
              <div className="grid gap-2">
                <Label>满减规则</Label>
                <div className="space-y-2">
                  {fullReduceTiers.map((tier, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm">满</span>
                      <Input
                        type="number"
                        className="w-24"
                        value={tier.min}
                        onChange={(e) => updateTier(index, "min", Number(e.target.value))}
                      />
                      <span className="text-sm">减</span>
                      <Input
                        type="number"
                        className="w-24"
                        value={tier.discount}
                        onChange={(e) => updateTier(index, "discount", Number(e.target.value))}
                      />
                      {fullReduceTiers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTier(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addTier}>
                    <Plus className="mr-1 h-3 w-3" />
                    添加阶梯
                  </Button>
                </div>
              </div>
            )}

            {/* 折扣/限时特价规则 */}
            {(formData.type === "DISCOUNT" || formData.type === "TIME_LIMITED") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="discount">折扣 (0.8 = 8折)</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="0.8"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maxDiscount">最大优惠金额</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="不限"
                  />
                </div>
              </div>
            )}

            {/* 新人专享规则 */}
            {formData.type === "NEW_USER" && (
              <div className="grid gap-2">
                <Label htmlFor="newUserDiscount">优惠金额</Label>
                <Input
                  id="newUserDiscount"
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="10"
                />
              </div>
            )}

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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">优先级 (数值越大越优先)</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  id="stackable"
                  checked={formData.stackable}
                  onCheckedChange={(v) => setFormData({ ...formData, stackable: v })}
                />
                <Label htmlFor="stackable">可与其他活动叠加</Label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">活动说明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="可选，描述活动详情"
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
    </div>
  );
}
