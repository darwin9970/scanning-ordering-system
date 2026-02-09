'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import type { Promotion, PromotionType, FullReduceTier } from '@/types'
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
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, Zap, X, Calendar, Layers, ToggleLeft } from 'lucide-react'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { toast } from 'sonner'

const typeLabels: Record<PromotionType, string> = {
  FULL_REDUCE: '满减活动',
  DISCOUNT: '折扣活动',
  NEW_USER: '新人专享',
  TIME_LIMITED: '限时特价',
  SECOND_HALF_PRICE: '第二份半价',
  QUANTITY_DISCOUNT: '满件折扣',
  BUY_ONE_GET_ONE: '买一送一'
}

const statusLabels: Record<
  'ACTIVE' | 'INACTIVE',
  { label: string; variant: 'default' | 'secondary' }
> = {
  ACTIVE: { label: '进行中', variant: 'default' },
  INACTIVE: { label: '已停用', variant: 'secondary' }
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingPromotionId, setDeletingPromotionId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'FULL_REDUCE' as PromotionType,
    startTime: '',
    endTime: '',
    description: '',
    priority: '0',
    stackable: false
  })

  // 满减规则
  const [fullReduceTiers, setFullReduceTiers] = useState<FullReduceTier[]>([
    { min: 50, discount: 5 }
  ])

  // 折扣规则
  const [discountValue, setDiscountValue] = useState('0.8')
  const [maxDiscount, setMaxDiscount] = useState('')

  // 满件折扣规则
  const [quantityTiers, setQuantityTiers] = useState<
    Array<{ minQuantity: string; discount: string }>
  >([{ minQuantity: '3', discount: '0.9' }])

  // 买一送一规则
  const [buyOneGetOneData, setBuyOneGetOneData] = useState({
    buyProductId: '',
    getProductId: '',
    buyQuantity: '1',
    getQuantity: '1',
    maxSets: '',
    getProductPrice: ''
  })

  const fetchPromotions = async () => {
    setLoading(true)
    try {
      const res = await api.request<{ list: Promotion[] }>('/api/promotions')
      setPromotions(res.list)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '获取活动列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPromotions()
  }, [])

  const handleCreate = () => {
    setEditingPromotion(null)
    const now = new Date()
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    setFormData({
      name: '',
      type: 'FULL_REDUCE',
      startTime: now.toISOString().slice(0, 16),
      endTime: nextMonth.toISOString().slice(0, 16),
      description: '',
      priority: '0',
      stackable: false
    })
    setFullReduceTiers([{ min: 50, discount: 5 }])
    setDiscountValue('0.8')
    setMaxDiscount('')
    setQuantityTiers([{ minQuantity: '3', discount: '0.9' }])
    setBuyOneGetOneData({
      buyProductId: '',
      getProductId: '',
      buyQuantity: '1',
      getQuantity: '1',
      maxSets: '',
      getProductPrice: ''
    })
    setDialogOpen(true)
  }

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setFormData({
      name: promotion.name,
      type: promotion.type as PromotionType,
      startTime: new Date(promotion.startTime).toISOString().slice(0, 16),
      endTime: new Date(promotion.endTime).toISOString().slice(0, 16),
      description: promotion.description || '',
      priority: promotion.priority.toString(),
      stackable: promotion.stackable
    })

    // 解析规则
    if (promotion.type === 'FULL_REDUCE') {
      const rules = promotion.rules as { tiers: FullReduceTier[] }
      setFullReduceTiers(rules.tiers || [{ min: 50, discount: 5 }])
    } else if (promotion.type === 'DISCOUNT' || promotion.type === 'TIME_LIMITED') {
      const rules = promotion.rules as { discount: number; maxDiscount?: number }
      setDiscountValue(rules.discount?.toString() || '0.8')
      setMaxDiscount(rules.maxDiscount?.toString() || '')
    } else if (promotion.type === 'NEW_USER') {
      const rules = promotion.rules as { discount: number }
      setDiscountValue(rules.discount?.toString() || '10')
    } else if (promotion.type === 'QUANTITY_DISCOUNT') {
      const rules = promotion.rules as { tiers: Array<{ minQuantity: number; discount: number }> }
      setQuantityTiers(
        rules.tiers?.map((t) => ({
          minQuantity: t.minQuantity.toString(),
          discount: t.discount.toString()
        })) || [{ minQuantity: '3', discount: '0.9' }]
      )
    } else if (promotion.type === 'BUY_ONE_GET_ONE') {
      const rules = promotion.rules as {
        buyProductId: number
        getProductId: number
        buyQuantity: number
        getQuantity: number
        maxSets?: number
        getProductPrice?: number
      }
      setBuyOneGetOneData({
        buyProductId: rules.buyProductId?.toString() || '',
        getProductId: rules.getProductId?.toString() || '',
        buyQuantity: rules.buyQuantity?.toString() || '1',
        getQuantity: rules.getQuantity?.toString() || '1',
        maxSets: rules.maxSets?.toString() || '',
        getProductPrice: rules.getProductPrice?.toString() || ''
      })
    }

    setDialogOpen(true)
  }

  const validateRequiredField = (value: string, fieldName: string): boolean => {
    if (!value || value.trim() === '') {
      toast.error(`${fieldName}不能为空`)
      return false
    }
    return true
  }

  const validateNumber = (
    value: string,
    fieldName: string,
    options?: { min?: number; max?: number; allowZero?: boolean }
  ): number | null => {
    const num = parseFloat(value)
    if (isNaN(num)) {
      toast.error(`${fieldName}必须是有效的数字`)
      return null
    }
    if (options?.min !== undefined && num < options.min) {
      toast.error(`${fieldName}不能小于${options.min}`)
      return null
    }
    if (options?.max !== undefined && num > options.max) {
      toast.error(`${fieldName}不能大于${options.max}`)
      return null
    }
    if (!options?.allowZero && num === 0) {
      toast.error(`${fieldName}不能为0`)
      return null
    }
    return num
  }

  const handleSubmit = async () => {
    try {
      if (!validateRequiredField(formData.name, '活动名称')) return
      if (!validateRequiredField(formData.startTime, '开始时间')) return
      if (!validateRequiredField(formData.endTime, '结束时间')) return

      const startTime = new Date(formData.startTime)
      const endTime = new Date(formData.endTime)
      if (endTime <= startTime) {
        toast.error('结束时间必须晚于开始时间')
        return
      }

      const priority = parseInt(formData.priority, 10)
      if (isNaN(priority)) {
        toast.error('优先级必须是有效的整数')
        return
      }

      let rules: Record<string, unknown> = {}

      if (formData.type === 'FULL_REDUCE') {
        rules = { tiers: fullReduceTiers }
      } else if (formData.type === 'DISCOUNT' || formData.type === 'TIME_LIMITED') {
        const discount = parseFloat(discountValue)
        rules = { discount, maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined }
      } else if (formData.type === 'NEW_USER') {
        rules = { discount: parseFloat(discountValue) }
      } else if (formData.type === 'QUANTITY_DISCOUNT') {
        rules = {
          tiers: quantityTiers.map((t) => ({
            minQuantity: parseInt(t.minQuantity, 10),
            discount: parseFloat(t.discount)
          }))
        }
      } else if (formData.type === 'BUY_ONE_GET_ONE') {
        rules = {
          buyProductId: parseInt(buyOneGetOneData.buyProductId, 10),
          getProductId: parseInt(buyOneGetOneData.getProductId, 10),
          buyQuantity: parseInt(buyOneGetOneData.buyQuantity, 10),
          getQuantity: parseInt(buyOneGetOneData.getQuantity, 10),
          maxSets: buyOneGetOneData.maxSets ? parseInt(buyOneGetOneData.maxSets, 10) : undefined,
          getProductPrice: buyOneGetOneData.getProductPrice
            ? parseFloat(buyOneGetOneData.getProductPrice)
            : undefined
        }
      }

      const payload = {
        ...formData,
        priority,
        rules
      }

      if (editingPromotion) {
        await api.request(`/api/promotions/${editingPromotion.id}`, {
          method: 'PUT',
          body: payload
        })
        toast.success('活动更新成功')
      } else {
        await api.request('/api/promotions', {
          method: 'POST',
          body: payload
        })
        toast.success('活动创建成功')
      }

      setDialogOpen(false)
      fetchPromotions()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '保存活动失败')
    }
  }

  const handleDelete = (id: number) => {
    setDeletingPromotionId(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (deletingPromotionId === null) return

    try {
      await api.request(`/api/promotions/${deletingPromotionId}`, { method: 'DELETE' })
      fetchPromotions()
      toast.success('活动删除成功')
      setDeletingPromotionId(null)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '删除活动失败')
    }
  }

  const handleToggleStatus = async (promotion: Promotion) => {
    const newStatus = promotion.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await api.request(`/api/promotions/${promotion.id}`, {
        method: 'PUT',
        body: { status: newStatus }
      })
      toast.success(`活动已${newStatus === 'ACTIVE' ? '启用' : '停用'}`)
      fetchPromotions()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '状态切换失败')
    }
  }

  const addTier = () => {
    const lastTier = fullReduceTiers[fullReduceTiers.length - 1]
    setFullReduceTiers([
      ...fullReduceTiers,
      { min: (lastTier?.min || 0) + 50, discount: (lastTier?.discount || 0) + 5 }
    ])
  }

  const removeTier = (index: number) => {
    if (fullReduceTiers.length <= 1) return
    setFullReduceTiers(fullReduceTiers.filter((_, i) => i !== index))
  }

  const updateTier = (index: number, field: keyof FullReduceTier, value: number) => {
    const newTiers = [...fullReduceTiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    setFullReduceTiers(newTiers)
  }

  const formatRules = (promotion: Promotion) => {
    try {
      if (promotion.type === 'FULL_REDUCE') {
        const rules = promotion.rules as { tiers?: FullReduceTier[] }
        return rules.tiers?.map((t) => `满${t.min}减${t.discount}`).join(', ') || '-'
      } else if (promotion.type === 'DISCOUNT' || promotion.type === 'TIME_LIMITED') {
        const rules = promotion.rules as { discount?: number; maxDiscount?: number }
        let text = `${((rules.discount || 1) * 10).toFixed(1)}折`
        if (rules.maxDiscount) text += ` (顶额-${rules.maxDiscount})`
        return text
      } else if (promotion.type === 'NEW_USER') {
        const rules = promotion.rules as { discount?: number }
        return `首单立减 ${formatPrice(rules.discount || 0)}`
      } else if (promotion.type === 'SECOND_HALF_PRICE') {
        const rules = promotion.rules as { discountRate?: number }
        return `次件${((rules.discountRate || 0.5) * 10).toFixed(1)}折`
      } else if (promotion.type === 'QUANTITY_DISCOUNT') {
        const rules = promotion.rules as {
          tiers?: Array<{ minQuantity: number; discount: number }>
        }
        return (
          rules.tiers
            ?.map((t) => `满${t.minQuantity}件${(t.discount * 10).toFixed(1)}折`)
            .join(', ') || '-'
        )
      } else if (promotion.type === 'BUY_ONE_GET_ONE') {
        return '买一送一'
      }
      return '-'
    } catch {
      return '-'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">营销中心</h2>
          <p className="text-muted-foreground text-sm">通过多样化的营销活动提升客单价与留存率</p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          创建营销活动
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="bg-linear-to-r from-muted/50 to-transparent">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            生效中的活动
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/5 text-[11px] uppercase tracking-wider">
              <TableRow>
                <TableHead className="pl-6">活动名称</TableHead>
                <TableHead>营销类型</TableHead>
                <TableHead>优惠逻辑</TableHead>
                <TableHead>周期有效期</TableHead>
                <TableHead className="text-center">权重</TableHead>
                <TableHead className="text-center">状态</TableHead>
                <TableHead className="text-right pr-6">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promotion) => (
                <TableRow key={promotion.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="pl-6">
                    <div className="font-bold text-slate-700">{promotion.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-medium bg-slate-50 border-slate-200">
                      {typeLabels[promotion.type as PromotionType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span className="text-xs font-medium text-primary bg-primary/5 px-2 py-1 rounded-sm border border-primary/10">
                      {formatRules(promotion)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(promotion.startTime).toLocaleDateString()}
                    </div>
                    <div className="pl-4.5 opacity-60">
                      ~ {new Date(promotion.endTime).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="px-2 py-0">
                      {promotion.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div
                      className="inline-flex cursor-pointer transform hover:scale-105 transition-transform"
                      onClick={() => handleToggleStatus(promotion)}
                    >
                      <Badge
                        variant={statusLabels[promotion.status as 'ACTIVE' | 'INACTIVE'].variant}
                      >
                        {statusLabels[promotion.status as 'ACTIVE' | 'INACTIVE'].label}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => handleEdit(promotion)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-red-50 hover:text-red-500"
                        onClick={() => handleDelete(promotion.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {promotions.length === 0 && !loading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-24 text-muted-foreground border-none"
                  >
                    <div className="flex flex-col items-center gap-4 opacity-50">
                      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                        <Zap className="h-8 w-8" />
                      </div>
                      <p>当前没有任何营促销活动，立即创建一个吧</p>
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
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              {editingPromotion ? '编辑营销配置' : '策划新活动'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-6 border-b">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="name"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  活动名称
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 2024夏季满减狂欢"
                  className="h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="type"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  营销手段
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as PromotionType })}
                >
                  <SelectTrigger className="h-11 bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-muted/20 border border-muted/50 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ToggleLeft className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold">优惠规则定义</h4>
              </div>

              {formData.type === 'FULL_REDUCE' && (
                <div className="space-y-3">
                  {fullReduceTiers.map((tier, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 bg-white p-2 rounded-xl border"
                    >
                      <div className="flex flex-1 items-center gap-2">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500">
                          满
                        </Badge>
                        <Input
                          type="number"
                          className="h-9 border-0 bg-transparent focus-visible:ring-0 text-right font-bold w-24"
                          value={tier.min}
                          onChange={(e) => updateTier(index, 'min', Number(e.target.value))}
                        />
                        <span className="text-slate-400">元</span>
                      </div>
                      <div className="w-px h-6 bg-border" />
                      <div className="flex flex-1 items-center gap-2">
                        <Badge variant="secondary" className="bg-orange-50 text-orange-600">
                          减
                        </Badge>
                        <Input
                          type="number"
                          className="h-9 border-0 bg-transparent focus-visible:ring-0 text-right font-bold w-24 text-orange-600"
                          value={tier.discount}
                          onChange={(e) => updateTier(index, 'discount', Number(e.target.value))}
                        />
                        <span className="text-slate-400">元</span>
                      </div>
                      {fullReduceTiers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-600"
                          onClick={() => removeTier(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addTier}
                    className="w-full text-primary hover:bg-primary/5 border-dashed border"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    增加梯度档位
                  </Button>
                </div>
              )}

              {(formData.type === 'DISCOUNT' || formData.type === 'TIME_LIMITED') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] text-muted-foreground uppercase">
                      当前折扣 (0.1-0.99)
                    </Label>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border">
                      <Input
                        type="number"
                        step="0.01"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="h-8 border-0 bg-transparent focus-visible:ring-0 font-bold"
                      />
                      <Badge variant="outline">折</Badge>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] text-muted-foreground uppercase">优惠封顶</Label>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border">
                      <Input
                        type="number"
                        value={maxDiscount}
                        onChange={(e) => setMaxDiscount(e.target.value)}
                        placeholder="不封顶"
                        className="h-8 border-0 bg-transparent focus-visible:ring-0 font-bold"
                      />
                      <span className="text-xs text-muted-foreground pr-2">元</span>
                    </div>
                  </div>
                </div>
              )}

              {formData.type === 'NEW_USER' && (
                <div className="grid gap-2">
                  <Label className="text-xs">立减现金金额</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-orange-600 font-bold">¥</div>
                    <Input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="pl-8 h-11 text-lg font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">
                    活动起止周期
                  </Label>
                  <div className="grid gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="h-5 px-1 bg-white">
                        FROM
                      </Badge>
                      <Input
                        type="datetime-local"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="h-8 border-0 bg-transparent p-0 focus-visible:ring-0 text-xs"
                      />
                    </div>
                    <div className="h-px bg-slate-200 w-full" />
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="h-5 px-1 bg-white">
                        UNTO
                      </Badge>
                      <Input
                        type="datetime-local"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="h-8 border-0 bg-transparent p-0 focus-visible:ring-0 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">
                    权重与叠加
                  </Label>
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs">活动权重</span>
                      <Input
                        type="number"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-16 h-8 text-center font-bold"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">允许与优惠券叠加</span>
                      <Switch
                        checked={formData.stackable}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, stackable: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="desc" className="text-xs font-bold uppercase text-muted-foreground">
                活动内部说明
              </Label>
              <Textarea
                id="desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="仅管理员可见，记录活动背景或目标客户..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="px-8 border-slate-300"
            >
              放弃配置
            </Button>
            <Button onClick={handleSubmit} className="px-12 bg-primary shadow-xl shadow-primary/30">
              {editingPromotion ? '立即更新活动' : '上线活动'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="终止并删除活动"
        description="该操作无法撤销。删除后，相关营销规则将立即失效，正在下单的客户可能受到影响。"
      />
    </div>
  )
}
