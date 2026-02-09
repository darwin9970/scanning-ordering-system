'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import type { Combo, ComboItem, Product, CreateComboRequest, UpdateComboRequest } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ImageUpload } from '@/components/ui/image-upload'
import { Plus, Pencil, Trash2, Package, ImageIcon, X } from 'lucide-react'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { toast } from 'sonner'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const statusLabels: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  AVAILABLE: { label: '在售', variant: 'default' },
  SOLDOUT: { label: '售罄', variant: 'destructive' },
  HIDDEN: { label: '隐藏', variant: 'secondary' }
}

export default function CombosPage() {
  const [combos, setCombos] = useState<Combo[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingComboId, setDeletingComboId] = useState<number | null>(null)

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: ''
  })
  const [imageUrl, setImageUrl] = useState<string | undefined>()
  const [comboItems, setComboItems] = useState<Partial<ComboItem>[]>([])

  const fetchCombos = async () => {
    setLoading(true)
    try {
      const res = await api.request<{ list: Combo[] }>('/api/combos?storeId=1')
      setCombos(res.list)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '获取套餐失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await api.request<{ list: Product[] }>('/api/products?storeId=1&pageSize=100')
      setProducts(res.list)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '获取商品失败')
    }
  }

  useEffect(() => {
    fetchCombos()
    fetchProducts()
  }, [])

  const handleCreate = () => {
    setEditingCombo(null)
    setFormData({
      name: '',
      description: '',
      price: ''
    })
    setImageUrl(undefined)
    setComboItems([])
    setDialogOpen(true)
  }

  const handleEdit = (combo: Combo) => {
    setEditingCombo(combo)
    setFormData({
      name: combo.name,
      description: combo.description || '',
      price: combo.price
    })
    setImageUrl(combo.imageUrl || undefined)
    setComboItems(
      combo.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        isOptional: item.isOptional,
        optionGroup: item.optionGroup,
        product: item.product
      }))
    )
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.price || comboItems.length === 0) {
      toast.error('请填写完整信息并添加套餐商品')
      return
    }

    try {
      const payload: CreateComboRequest = {
        storeId: 1,
        name: formData.name,
        description: formData.description || undefined,
        imageUrl,
        price: Number(formData.price),
        items: comboItems.map((item) => ({
          productId: item.productId || 0,
          variantId: item.variantId,
          quantity: item.quantity || 1,
          isOptional: item.isOptional,
          optionGroup: item.optionGroup
        }))
      }

      if (editingCombo) {
        await api.request(`/api/combos/${editingCombo.id}`, {
          method: 'PUT',
          body: { ...payload, status: editingCombo.status } as UpdateComboRequest
        })
        toast.success('套餐更新成功')
      } else {
        await api.request('/api/combos', {
          method: 'POST',
          body: payload
        })
        toast.success('套餐创建成功')
      }

      setDialogOpen(false)
      fetchCombos()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '保存套餐失败')
    }
  }

  const handleDelete = (id: number) => {
    setDeletingComboId(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (deletingComboId === null) return

    try {
      await api.request(`/api/combos/${deletingComboId}`, { method: 'DELETE' })
      fetchCombos()
      toast.success('套餐删除成功')
      setDeletingComboId(null)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '删除套餐失败')
    }
  }

  const handleToggleStatus = async (combo: Combo) => {
    const newStatus = combo.status === 'AVAILABLE' ? 'HIDDEN' : 'AVAILABLE'
    try {
      await api.request(`/api/combos/${combo.id}/status`, {
        method: 'PUT',
        body: { status: newStatus }
      })
      fetchCombos()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '切换状态失败')
    }
  }

  const addComboItem = () => {
    setComboItems([...comboItems, { productId: 0, quantity: 1, isOptional: false }])
  }

  const removeComboItem = (index: number) => {
    setComboItems(comboItems.filter((_, i) => i !== index))
  }

  const updateComboItem = (
    index: number,
    field: keyof ComboItem,
    value: string | number | boolean | Product | undefined
  ) => {
    const newItems = [...comboItems]
    newItems[index] = { ...newItems[index], [field]: value }

    // 如果更新了 productId，同时更新 product 信息
    if (field === 'productId') {
      const product = products.find((p) => p.id === value)
      newItems[index] = { ...newItems[index], product }
    }

    setComboItems(newItems)
  }

  // 计算原价
  const calculateOriginalPrice = () => {
    return comboItems.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)
      if (product) {
        return sum + Number(product.basePrice) * (item.quantity || 0)
      }
      return sum
    }, 0)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
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

      <Card className="shadow-sm border-0">
        <CardHeader className="bg-linear-to-r from-primary/5 to-transparent">
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
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combos.map((combo) => (
                <TableRow key={combo.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    {combo.imageUrl ? (
                      <img
                        src={
                          combo.imageUrl.startsWith('http')
                            ? combo.imageUrl
                            : `${API_BASE}${combo.imageUrl}`
                        }
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
                    <div className="text-sm text-muted-foreground">{combo.items.length} 个商品</div>
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
                      variant={statusLabels[combo.status]?.variant || 'default'}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(combo)}
                    >
                      {statusLabels[combo.status]?.label || combo.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-blue-50"
                        onClick={() => handleEdit(combo)}
                      >
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-red-50"
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
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center">
                      <Package className="h-12 w-12 text-muted/50 mb-4" />
                      <p>暂无套餐，点击右上角创建</p>
                    </div>
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
            <DialogTitle>{editingCombo ? '编辑套餐' : '新建套餐'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-3">
              <Label className="font-semibold text-sm">套餐图片</Label>
              <ImageUpload value={imageUrl} onChange={setImageUrl} />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="name" className="font-semibold text-sm">
                套餐名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：双人套餐"
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="price" className="font-semibold text-sm">
                套餐价格 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="输入套餐售价"
              />
              {comboItems.length > 0 && (
                <div className="bg-muted/30 p-3 rounded-lg flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">
                    原价合计: {formatPrice(calculateOriginalPrice())}
                  </span>
                  {formData.price && (
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-0"
                    >
                      立省 {formatPrice(calculateOriginalPrice() - Number(formData.price))}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="description" className="font-semibold text-sm">
                套餐描述
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="可选，描述套餐内容"
                rows={2}
              />
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-sm">
                  套餐商品 <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addComboItem}
                  className="h-8"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  添加商品
                </Button>
              </div>

              {comboItems.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed p-8 text-center bg-muted/10">
                  <p className="text-muted-foreground text-sm">点击上方按钮添加套餐商品</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comboItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-xl border bg-card/50 shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex-1 space-y-3">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                              选择商品
                            </Label>
                            <Select
                              value={item.productId ? String(item.productId) : ''}
                              onValueChange={(v) => updateComboItem(index, 'productId', Number(v))}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="搜索或选择商品" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={String(product.id)}>
                                    {product.name} ({formatPrice(product.basePrice)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                              数量
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              className="h-9"
                              value={item.quantity}
                              onChange={(e) =>
                                updateComboItem(index, 'quantity', Number(e.target.value))
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-5 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
          <DialogFooter className="pt-4 border-t gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="px-8">
              取消
            </Button>
            <Button onClick={handleSubmit} className="px-8 shadow-lg shadow-primary/20">
              确认保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="确认删除套餐"
        description="删除后无法恢复，确定要删除这个套餐吗？相关的用户订单记录不会受到影响。"
        confirmText="确认删除"
        cancelText="取消"
      />
    </div>
  )
}
