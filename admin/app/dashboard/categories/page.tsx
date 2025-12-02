"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { categorySchema, type CategoryFormData } from "@/lib/validations";
import type { Category } from "@/types";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, GripVertical, Loader2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// 可拖拽的行组件
function SortableRow({
  category,
  onEdit,
  onDelete,
}: {
  category: any;
  onEdit: (cat: any) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{category.name}</TableCell>
      <TableCell>{category._count?.products || 0}</TableCell>
      <TableCell>{category.sort}</TableCell>
      <TableCell>
        <Badge variant={category.status === "ACTIVE" ? "default" : "secondary"}>
          {category.status === "ACTIVE" ? "启用" : "禁用"}
        </Badge>
      </TableCell>
      <TableCell>
        {category.printers?.map((p: any) => (
          <Badge key={p.printer.id} variant="outline" className="mr-1">
            {p.printer.name}
          </Badge>
        ))}
        {(!category.printers || category.printers.length === 0) && (
          <span className="text-muted-foreground">未绑定</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => onEdit(category)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(category.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSorting, setIsSorting] = useState(false);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      storeId: 1,
      name: "",
      sort: 0,
      icon: "",
    },
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories({ pageSize: 100 }),
  });

  // 拖拽排序相关
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedCategories = useMemo(() => {
    if (!categories?.list) return [];
    return [...categories.list].sort((a: any, b: any) => a.sort - b.sort);
  }, [categories?.list]);

  const categoryIds = useMemo(
    () => sortedCategories.map((c: any) => c.id),
    [sortedCategories]
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedCategories.findIndex((c: any) => c.id === active.id);
      const newIndex = sortedCategories.findIndex((c: any) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // 计算新的排序顺序
        const newOrder = arrayMove(sortedCategories, oldIndex, newIndex);
        
        // 更新排序值
        setIsSorting(true);
        try {
          const updates = newOrder.map((cat: any, index: number) => ({
            id: cat.id,
            sort: index,
          }));

          // 批量更新排序
          await api.request("/api/categories/sort", {
            method: "PUT",
            body: { items: updates },
          });

          queryClient.invalidateQueries({ queryKey: ["categories"] });
        } catch (error: any) {
          alert("排序失败: " + error.message);
        } finally {
          setIsSorting(false);
        }
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: CategoryFormData) => api.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CategoryFormData> }) =>
      api.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: any) => {
      alert(error.message);
    },
  });

  const openCreateDialog = () => {
    setEditingCategory(null);
    form.reset({ storeId: 1, name: "", sort: 0, icon: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      storeId: category.storeId,
      name: category.name,
      sort: category.sort,
      icon: category.icon || "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这个分类吗？分类下有商品时无法删除。")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">分类管理</h2>
          <p className="text-muted-foreground">管理菜品分类，可拖拽排序</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          添加分类
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>分类列表</CardTitle>
            {isSorting && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                保存排序中...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>分类名称</TableHead>
                    <TableHead>商品数量</TableHead>
                    <TableHead>排序</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>关联打印机</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
                    {sortedCategories.map((category: any) => (
                      <SortableRow
                        key={category.id}
                        category={category}
                        onEdit={openEditDialog}
                        onDelete={handleDelete}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* 添加/编辑分类弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "编辑分类" : "添加分类"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>分类名称 *</Label>
              <Input
                {...form.register("name")}
                placeholder="请输入分类名称（1-50字符）"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>排序</Label>
              <Input
                type="number"
                {...form.register("sort", { valueAsNumber: true })}
                placeholder="数字越小越靠前（0-999）"
              />
              {form.formState.errors.sort && (
                <p className="text-sm text-red-500">{form.formState.errors.sort.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingCategory ? "保存" : "添加"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
