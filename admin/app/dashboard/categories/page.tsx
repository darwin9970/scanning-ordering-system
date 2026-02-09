'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '@/lib/api'
import { categorySchema, type CategoryFormData } from '@/lib/validations'
import type { Category } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Loader2,
  Tags,
  Layers,
  Printer,
  BarChart3,
  ArrowUpDown
} from 'lucide-react'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// 可拖拽的行组件
function SortableRow({
  category,
  onEdit,
  onDelete
}: {
  category: Category
  onEdit: (cat: Category) => void
  onDelete: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`group/row transition-colors ${isDragging ? 'bg-slate-50 border-primary/20 shadow-2xl scale-[1.01] rounded-2xl' : 'hover:bg-slate-50/50'}`}
    >
      <TableCell className="pl-6 w-10">
        <button
          type="button"
          className="p-1 px-2 rounded-lg bg-slate-100/50 text-slate-400 opacity-0 group-hover/row:opacity-100 hover:bg-slate-200 hover:text-slate-600 cursor-grab active:cursor-grabbing touch-none transition-all"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-bold text-slate-700">{category.name}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="h-6 gap-1 bg-blue-50/50 text-blue-600 border-blue-100 rounded-lg"
          >
            <Layers className="h-3 w-3" />
            {category._count?.products || 0} ITEMS
          </Badge>
        </div>
      </TableCell>
      <TableCell className="font-mono text-[10px] font-bold text-slate-400">
        # {String(category.sort).padStart(3, '0')}
      </TableCell>
      <TableCell>
        <Badge
          className={`rounded-full border-0 text-[10px] font-black tracking-tighter uppercase px-2 py-0.5 ${
            category.status === 'ACTIVE'
              ? 'bg-green-100 text-green-600'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          {category.status === 'ACTIVE' ? 'Active' : 'Disabled'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {category.printers?.map((p) => (
            <Badge
              key={p.printer?.id}
              variant="outline"
              className="h-5 text-[9px] bg-slate-50 border-slate-200 text-slate-500 flex items-center gap-1"
            >
              <Printer className="h-2.5 w-2.5" />
              {p.printer?.name}
            </Badge>
          ))}
          {(!category.printers || category.printers.length === 0) && (
            <span className="text-[10px] italic text-slate-300 font-medium">Auto Routing Only</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right pr-6">
        <div className="flex justify-end gap-1 translate-x-2 group-hover/row:translate-x-0 opacity-0 group-hover/row:opacity-100 transition-all">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-blue-50 text-blue-500"
            onClick={() => onEdit(category)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-red-50 text-red-500"
            onClick={() => onDelete(category.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isSorting, setIsSorting] = useState(false)

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      storeId: 1,
      name: '',
      sort: 0,
      icon: ''
    }
  })

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories({ pageSize: 100 })
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const sortedCategories = useMemo(() => {
    if (!categories?.list) return []
    return [...categories.list].sort((a, b) => a.sort - b.sort)
  }, [categories?.list])

  const categoryIds = useMemo(() => sortedCategories.map((c) => c.id), [sortedCategories])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortedCategories.findIndex((c) => c.id === active.id)
      const newIndex = sortedCategories.findIndex((c) => c.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sortedCategories, oldIndex, newIndex)
        setIsSorting(true)
        try {
          const updates = newOrder.map((cat, index: number) => ({ id: cat.id, sort: index }))
          await api.request('/api/categories/sort', { method: 'PUT', body: { items: updates } })
          queryClient.invalidateQueries({ queryKey: ['categories'] })
          toast.success('目录排序链路已重构')
        } catch (error: unknown) {
          toast.error('排序失败: ' + (error instanceof Error ? error.message : '未知错误'))
        } finally {
          setIsSorting(false)
        }
      }
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: CategoryFormData) => api.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setDialogOpen(false)
      toast.success('新经营类目已挂载')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CategoryFormData> }) =>
      api.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setDialogOpen(false)
      toast.success('基础数据同步完成')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('类目已安全下线')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : '移除失败')
    }
  })

  const openCreateDialog = () => {
    setEditingCategory(null)
    form.reset({ storeId: 1, name: '', sort: 0, icon: '' })
    setDialogOpen(true)
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    form.reset({
      storeId: category.storeId,
      name: category.name,
      sort: category.sort,
      icon: category.icon || ''
    })
    setDialogOpen(true)
  }

  const onSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null)

  const handleDelete = (id: number) => {
    setDeletingCategoryId(id)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 px-2 rounded bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest">
              Structure Mode
            </div>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
            <Tags className="h-8 w-8 text-primary" />
            经营品类矩阵
          </h2>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            管理商品分类及其在用户终端的呈现时序
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="rounded-full shadow-lg shadow-primary/20 bg-primary px-8 hover:scale-105 transition-transform active:scale-95"
        >
          <Plus className="mr-2 h-4 w-4" />
          拓展新类目
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden rounded-3xl">
        <CardHeader className="bg-slate-50/50 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>
              <CardTitle className="text-lg font-bold">层级脉络</CardTitle>
            </div>
            {isSorting && (
              <Badge className="bg-primary/10 text-primary border-0 animate-pulse gap-1.5 py-1 px-3">
                <Loader2 className="h-3 w-3 animate-spin" />
                正在重新校准排序规则...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader className="bg-slate-50/30">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="pl-6 w-10"></TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                      类目标识
                    </TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                      负载计数
                    </TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                      权重
                    </TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                      状态
                    </TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                      路由策略
                    </TableHead>
                    <TableHead className="text-right pr-6 font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                      节点控制
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
                    {sortedCategories.map((category) => (
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              {editingCategory ? '编辑现有类目节点' : '构建新经营节点'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  类目核心命名 *
                </Label>
                <div className="relative">
                  <Tags className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                  <Input
                    {...form.register('name')}
                    placeholder="例如: 招牌锅底 / 主厨推荐"
                    className="pl-10 h-11 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white"
                  />
                </div>
                {form.formState.errors.name && (
                  <p className="text-[10px] font-bold text-red-500">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  排序权重 (0-999)
                </Label>
                <div className="relative">
                  <ArrowUpDown className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                  <Input
                    type="number"
                    {...form.register('sort', { valueAsNumber: true })}
                    className="pl-10 h-11 rounded-2xl bg-slate-50 border-slate-100"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 rounded-2xl font-bold"
                onClick={() => setDialogOpen(false)}
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="flex-1 rounded-2xl font-bold bg-primary shadow-lg shadow-primary/20"
              >
                {editingCategory ? 'CONFIRM SYNC' : 'DEPLOY NODE'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          if (deletingCategoryId !== null) {
            deleteMutation.mutate(deletingCategoryId)
            setDeletingCategoryId(null)
          }
        }}
        title="警告：类目节点移除"
        description="该类目节点将从生产环境永久剥离。请确保该类目下的商品已完成迁移，否则移除动作将被底层数据库拒接。确定执行吗？"
        confirmText="确认剥离"
        cancelText="取消"
      />
    </div>
  )
}
