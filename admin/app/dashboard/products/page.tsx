"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { formatPrice, PRODUCT_STATUS_MAP } from "@/lib/utils";
import { productSchema, type ProductFormData } from "@/lib/validations";
import type { ProductStatus, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Search, Edit, Trash2, MoreHorizontal } from "lucide-react";

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      storeId: 1,
      categoryId: 0,
      name: "",
      description: "",
      basePrice: 0,
      type: "SINGLE",
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", page, categoryId, keyword],
    queryFn: () =>
      api.getProducts({
        page,
        pageSize: 10,
        categoryId: categoryId ? Number(categoryId) : undefined,
        keyword: keyword || undefined,
      }),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories({ pageSize: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: ProductFormData) => api.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductFormData> }) =>
      api.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ProductStatus }) =>
      api.updateProductStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const openCreateDialog = () => {
    setEditingProduct(null);
    form.reset({
      storeId: 1,
      categoryId: 0,
      name: "",
      description: "",
      basePrice: 0,
      type: "SINGLE",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      storeId: product.storeId,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description || "",
      basePrice: Number(product.basePrice),
      type: product.type as "SINGLE" | "VARIANT",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这个商品吗？")) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusToggle = (product: Product) => {
    const newStatus: ProductStatus = product.status === "AVAILABLE" ? "SOLDOUT" : "AVAILABLE";
    statusMutation.mutate({ id: product.id, status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">菜品管理</h2>
          <p className="text-muted-foreground">管理菜单商品，设置价格和库存</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          添加商品
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>商品列表</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索商品..."
                  className="pl-8 w-[200px]"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <Select value={categoryId || "ALL"} onValueChange={(v) => setCategoryId(v === "ALL" ? "" : v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部分类</SelectItem>
                  {categories?.list.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                    <TableHead>商品名称</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>价格</TableHead>
                    <TableHead>销量</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.list.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category?.name}</TableCell>
                      <TableCell>{formatPrice(product.basePrice)}</TableCell>
                      <TableCell>{product.sales}</TableCell>
                      <TableCell>
                        <Badge variant={product.type === "VARIANT" ? "secondary" : "outline"}>
                          {product.type === "VARIANT" ? "多规格" : "单品"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={PRODUCT_STATUS_MAP[product.status]?.color || ""}
                          onClick={() => handleStatusToggle(product)}
                          style={{ cursor: "pointer" }}
                        >
                          {PRODUCT_STATUS_MAP[product.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">共 {products?.total || 0} 个商品</p>
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
                    disabled={!products?.list || products.list.length < 10}
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

      {/* 添加/编辑商品弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? "编辑商品" : "添加商品"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>商品名称 *</Label>
              <Input
                {...form.register("name")}
                placeholder="请输入商品名称（1-100字符）"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>所属分类 *</Label>
              <Select
                value={form.watch("categoryId") ? String(form.watch("categoryId")) : ""}
                onValueChange={(v) => form.setValue("categoryId", Number(v), { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.list.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.categoryId && (
                <p className="text-sm text-red-500">{form.formState.errors.categoryId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>价格 *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...form.register("basePrice", { valueAsNumber: true })}
                placeholder="请输入价格"
              />
              {form.formState.errors.basePrice && (
                <p className="text-sm text-red-500">{form.formState.errors.basePrice.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                {...form.register("description")}
                placeholder="请输入商品描述（选填，最多500字符）"
                rows={3}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingProduct ? "保存" : "添加"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
