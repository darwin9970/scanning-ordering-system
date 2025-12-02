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
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  ImageIcon,
  X,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Product {
  id: number;
  name: string;
  basePrice: string;
  imageUrl: string | null;
}

interface ComboItem {
  id?: number;
  productId: number;
  variantId?: number;
  quantity: number;
  isOptional: boolean;
  optionGroup?: string;
  product?: Product;
}

interface Combo {
  id: number;
  storeId: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  originalPrice: string;
  price: string;
  sales: number;
  stock: number;
  sort: number;
  status: "AVAILABLE" | "SOLDOUT" | "HIDDEN";
  items: ComboItem[];
  createdAt: string;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  AVAILABLE: { label: "在售", variant: "default" },
  SOLDOUT: { label: "售罄", variant: "destructive" },
  HIDDEN: { label: "隐藏", variant: "secondary" },
};

export default function CombosPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
  });
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);

  const fetchCombos = async () => {
    setLoading(true);
    try {
      const res = await api.request<{ list: Combo[] }>("/api/combos?storeId=1");
      setCombos(res.list);
    } catch (error) {
      console.error("Failed to fetch combos:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.request<{ list: Product[] }>("/api/products?storeId=1&pageSize=100");
      setProducts(res.list);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  useEffect(() => {
    fetchCombos();
    fetchProducts();
  }, []);

  const handleCreate = () => {
    setEditingCombo(null);
    setFormData({
      name: "",
      description: "",
      price: "",
    });
    setImageUrl(undefined);
    setComboItems([]);
    setDialogOpen(true);
  };

  const handleEdit = (combo: Combo) => {
    setEditingCombo(combo);
    setFormData({
      name: combo.name,
      description: combo.description || "",
      price: combo.price,
    });
    setImageUrl(combo.imageUrl || undefined);
    setComboItems(
      combo.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        isOptional: item.isOptional,
        optionGroup: item.optionGroup,
        product: item.product,
      }))
    );
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price || comboItems.length === 0) {
      alert("请填写完整信息并添加套餐商品");
      return;
    }

    try {
      const data = {
        storeId: 1,
        name: formData.name,
        description: formData.description || undefined,
        imageUrl,
        price: Number(formData.price),
        items: comboItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          isOptional: item.isOptional,
          optionGroup: item.optionGroup,
        })),
      };

      if (editingCombo) {
        await api.request(`/api/combos/${editingCombo.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        await api.request("/api/combos", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }

      setDialogOpen(false);
      fetchCombos();
    } catch (error) {
      console.error("Failed to save combo:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个套餐吗？")) return;

    try {
      await api.request(`/api/combos/${id}`, { method: "DELETE" });
      fetchCombos();
    } catch (error) {
      console.error("Failed to delete combo:", error);
    }
  };

  const handleToggleStatus = async (combo: Combo) => {
    const newStatus = combo.status === "AVAILABLE" ? "HIDDEN" : "AVAILABLE";
    try {
      await api.request(`/api/combos/${combo.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      fetchCombos();
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };

  const addComboItem = () => {
    setComboItems([
      ...comboItems,
      { productId: 0, quantity: 1, isOptional: false },
    ]);
  };

  const removeComboItem = (index: number) => {
    setComboItems(comboItems.filter((_, i) => i !== index));
  };

  const updateComboItem = (index: number, field: keyof ComboItem, value: any) => {
    const newItems = [...comboItems];
    newItems[index] = { ...newItems[index]!, [field]: value };
    
    // 如果更新了 productId，同时更新 product 信息
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      newItems[index]!.product = product;
    }
    
    setComboItems(newItems);
  };

  // 计算原价
  const calculateOriginalPrice = () => {
    return comboItems.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        return sum + Number(product.basePrice) * item.quantity;
      }
      return sum;
    }, 0);
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
          <h2 className="text-2xl font-bold tracking-tight">套餐管理</h2>
          <p className="text-muted-foreground">创建和管理套餐组合</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新建套餐
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            套餐列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">图片</TableHead>
                <TableHead>套餐名称</TableHead>
                <TableHead>包含商品</TableHead>
                <TableHead>原价</TableHead>
                <TableHead>套餐价</TableHead>
                <TableHead>销量</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combos.map((combo) => (
                <TableRow key={combo.id}>
                  <TableCell>
                    {combo.imageUrl ? (
                      <img
                        src={combo.imageUrl.startsWith("http") ? combo.imageUrl : `${API_BASE}${combo.imageUrl}`}
                        alt={combo.name}
                        className="h-12 w-12 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{combo.name}</TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {combo.items.length} 个商品
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground line-through">
                    {formatPrice(combo.originalPrice)}
                  </TableCell>
                  <TableCell className="font-medium text-primary">
                    {formatPrice(combo.price)}
                  </TableCell>
                  <TableCell>{combo.sales}</TableCell>
                  <TableCell>
                    <Badge
                      variant={statusLabels[combo.status].variant}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(combo)}
                    >
                      {statusLabels[combo.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(combo)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(combo.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {combos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    暂无套餐，点击右上角创建
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCombo ? "编辑套餐" : "新建套餐"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>套餐图片</Label>
              <ImageUpload value={imageUrl} onChange={setImageUrl} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">套餐名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：双人套餐"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price">套餐价格 *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="输入套餐售价"
              />
              {comboItems.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  原价合计: {formatPrice(calculateOriginalPrice())}
                  {formData.price && (
                    <span className="ml-2 text-green-600">
                      (节省 {formatPrice(calculateOriginalPrice() - Number(formData.price))})
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">套餐描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="可选，描述套餐内容"
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>套餐商品 *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addComboItem}>
                  <Plus className="mr-1 h-3 w-3" />
                  添加商品
                </Button>
              </div>
              
              {comboItems.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
                  请添加套餐包含的商品
                </div>
              ) : (
                <div className="space-y-2">
                  {comboItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-lg border p-2"
                    >
                      <Select
                        value={item.productId ? String(item.productId) : ""}
                        onValueChange={(v) => updateComboItem(index, "productId", Number(v))}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="选择商品" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={String(product.id)}>
                              {product.name} - {formatPrice(product.basePrice)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">×</span>
                        <Input
                          type="number"
                          min="1"
                          className="w-16"
                          value={item.quantity}
                          onChange={(e) =>
                            updateComboItem(index, "quantity", Number(e.target.value))
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeComboItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
