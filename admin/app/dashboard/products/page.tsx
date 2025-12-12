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
import { Plus, Search, Edit, Trash2, ImageIcon, X, Package } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Variant {
  id?: number;
  name: string;
  price: number;
  stock: number;
}

interface Attribute {
  id?: number;
  name: string;
  options: string[];
  required: boolean;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [productType, setProductType] = useState<"SINGLE" | "VARIANT">("SINGLE");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [stock, setStock] = useState<number>(999);

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
    setImageUrl(undefined);
    setProductType("SINGLE");
    setVariants([]);
    setAttributes([]);
    setStock(999);
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
    setImageUrl(product.imageUrl || undefined);
    setProductType(product.type as "SINGLE" | "VARIANT");
    // 加载规格
    setVariants(
      product.variants?.map((v) => ({
        id: v.id,
        name: v.name || "默认",
        price: Number(v.price),
        stock: v.stock ?? 999,
      })) || []
    );
    // 加载属性
    setAttributes(
      product.attributes?.map((a) => ({
        id: a.id,
        name: a.name,
        options: a.options,
        required: a.required ?? false,
      })) || []
    );
    setStock(999); // TODO: 从后端获取单品库存
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

  // 规格管理
  const addVariant = () => {
    setVariants([...variants, { name: "", price: 0, stock: 999 }]);
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // 属性管理
  const addAttribute = () => {
    setAttributes([...attributes, { name: "", options: [""], required: false }]);
  };

  const updateAttribute = (index: number, field: keyof Attribute, value: any) => {
    const newAttrs = [...attributes];
    newAttrs[index] = { ...newAttrs[index], [field]: value };
    setAttributes(newAttrs);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const addOption = (attrIndex: number) => {
    const newAttrs = [...attributes];
    newAttrs[attrIndex].options.push("");
    setAttributes(newAttrs);
  };

  const updateOption = (attrIndex: number, optIndex: number, value: string) => {
    const newAttrs = [...attributes];
    newAttrs[attrIndex].options[optIndex] = value;
    setAttributes(newAttrs);
  };

  const removeOption = (attrIndex: number, optIndex: number) => {
    const newAttrs = [...attributes];
    newAttrs[attrIndex].options = newAttrs[attrIndex].options.filter((_, i) => i !== optIndex);
    setAttributes(newAttrs);
  };

  const onSubmit = (data: ProductFormData) => {
    const submitData: any = {
      ...data,
      imageUrl,
      type: productType,
      variants: productType === "VARIANT" ? variants.filter((v) => v.name) : undefined,
      attributes: attributes.filter((a) => a.name && a.options.some((o) => o)),
    };
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
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

      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-xl font-bold">商品列表</CardTitle>
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
              <Select
                value={categoryId || "ALL"}
                onValueChange={(v) => setCategoryId(v === "ALL" ? "" : v)}
              >
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
          ) : products?.list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">暂无商品</h3>
              <p className="text-muted-foreground mb-4">点击上方按钮添加第一个商品</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                添加商品
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">图片</TableHead>
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
                  {products?.list.map((product, index) => (
                    <TableRow
                      key={product.id}
                      className="hover:bg-muted/50 even:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <TableCell>
                        {product.imageUrl ? (
                          <img
                            src={
                              product.imageUrl.startsWith("http")
                                ? product.imageUrl
                                : `${API_BASE}${product.imageUrl}`
                            }
                            alt={product.name}
                            className="h-12 w-12 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
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
                          <Button
                            size="sm"
                            variant="ghost"
                            className="hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="hover:bg-red-50 hover:text-red-600"
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "编辑商品" : "添加商品"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">基本信息</TabsTrigger>
                <TabsTrigger value="variants">规格/SKU</TabsTrigger>
                <TabsTrigger value="attributes">商品属性</TabsTrigger>
              </TabsList>

              {/* 基本信息 */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>商品图片</Label>
                  <ImageUpload value={imageUrl} onChange={setImageUrl} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>商品名称 *</Label>
                    <Input {...form.register("name")} placeholder="请输入商品名称" />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>所属分类 *</Label>
                    <Select
                      value={form.watch("categoryId") ? String(form.watch("categoryId")) : ""}
                      onValueChange={(v) =>
                        form.setValue("categoryId", Number(v), { shouldValidate: true })
                      }
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
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>基础价格 *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...form.register("basePrice", { valueAsNumber: true })}
                      placeholder="请输入价格"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>商品类型</Label>
                    <Select
                      value={productType}
                      onValueChange={(v) => setProductType(v as "SINGLE" | "VARIANT")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE">单品（统一价格）</SelectItem>
                        <SelectItem value="VARIANT">多规格（不同价格）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Textarea
                    {...form.register("description")}
                    placeholder="请输入商品描述（选填）"
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* 规格/SKU */}
              <TabsContent value="variants" className="space-y-4 mt-4">
                {productType === "SINGLE" ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>当前为单品模式</p>
                    <p className="text-sm">切换到「多规格」模式可添加不同规格和价格</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <Label>商品规格</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                        <Plus className="h-4 w-4 mr-1" />
                        添加规格
                      </Button>
                    </div>
                    {variants.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        暂无规格，点击上方按钮添加
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {variants.map((variant, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <Input
                                placeholder="规格名称（如：大份、小份）"
                                value={variant.name}
                                onChange={(e) => updateVariant(index, "name", e.target.value)}
                              />
                            </div>
                            <div className="w-24">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="价格"
                                value={variant.price}
                                onChange={(e) =>
                                  updateVariant(index, "price", Number(e.target.value))
                                }
                              />
                            </div>
                            <div className="w-20">
                              <Input
                                type="number"
                                placeholder="库存"
                                value={variant.stock}
                                onChange={(e) =>
                                  updateVariant(index, "stock", Number(e.target.value))
                                }
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeVariant(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      多规格商品的基础价格仅作参考，实际按规格价格计算
                    </p>
                  </>
                )}
              </TabsContent>

              {/* 商品属性 */}
              <TabsContent value="attributes" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label>自定义属性（如辣度、温度）</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addAttribute}>
                    <Plus className="h-4 w-4 mr-1" />
                    添加属性
                  </Button>
                </div>
                {attributes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    暂无属性，点击上方按钮添加
                  </p>
                ) : (
                  <div className="space-y-4">
                    {attributes.map((attr, attrIndex) => (
                      <div key={attrIndex} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="属性名称（如：辣度）"
                            value={attr.name}
                            onChange={(e) => updateAttribute(attrIndex, "name", e.target.value)}
                            className="flex-1"
                          />
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={attr.required}
                              onCheckedChange={(v) => updateAttribute(attrIndex, "required", v)}
                            />
                            <span className="text-sm text-muted-foreground">必选</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAttribute(attrIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {attr.options.map((opt, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-1">
                              <Input
                                placeholder="选项"
                                value={opt}
                                onChange={(e) => updateOption(attrIndex, optIndex, e.target.value)}
                                className="w-24"
                              />
                              {attr.options.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => removeOption(attrIndex, optIndex)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(attrIndex)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  属性用于顾客点餐时的个性化选择，不影响价格
                </p>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
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
