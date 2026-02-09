'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import type { Coupon, CreateCouponRequest, UpdateCouponRequest } from '@/types'
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
import { Plus, Pencil, Trash2, Ticket } from 'lucide-react'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { toast } from 'sonner'

const typeLabels: Record<string, string> = {
  FIXED: '满减券',
  PERCENT: '折扣券',
  NO_THRESHOLD: '无门槛券'
}

const statusLabels: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  ACTIVE: { label: '进行中', variant: 'default' },
  INACTIVE: { label: '已停用', variant: 'secondary' },
  EXPIRED: { label: '已过期', variant: 'destructive' }
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingCouponId, setDeletingCouponId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'FIXED' as 'FIXED' | 'PERCENT' | 'NO_THRESHOLD',
    value: '',
    minAmount: '0',
    maxDiscount: '',
    totalCount: '-1',
    perUserLimit: '1',
    startTime: '',
    endTime: '',
    description: ''
  })

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const res = await api.request<{ list: Coupon[] }>('/api/coupons')
      setCoupons(res.list)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '获取优惠券失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const handleCreate = () => {
    setEditingCoupon(null)
    const now = new Date()
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    setFormData({
      name: '',
      type: 'FIXED',
      value: '',
      minAmount: '0',
      maxDiscount: '',
      totalCount: '-1',
      perUserLimit: '1',
      startTime: now.toISOString().slice(0, 16),
      endTime: nextMonth.toISOString().slice(0, 16),
      description: ''
    })
    setDialogOpen(true)
  }

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      name: coupon.name,
      type: coupon.type,
      value: coupon.value,
      minAmount: coupon.minAmount,
      maxDiscount: coupon.maxDiscount || '',
      totalCount: coupon.totalCount.toString(),
      perUserLimit: coupon.perUserLimit.toString(),
      startTime: new Date(coupon.startTime).toISOString().slice(0, 16),
      endTime: new Date(coupon.endTime).toISOString().slice(0, 16),
      description: coupon.description || ''
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.value) {
      toast.error('请填写完整优惠券信息')
      return
    }

    try {
      const payload: CreateCouponRequest = {
        name: formData.name,
        type: formData.type,
        value: Number(formData.value),
        minAmount: Number(formData.minAmount),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
        totalCount: Number(formData.totalCount),
        perUserLimit: Number(formData.perUserLimit),
        startTime: formData.startTime,
        endTime: formData.endTime,
        description: formData.description || undefined
      }

      if (editingCoupon) {
        await api.request(`/api/coupons/${editingCoupon.id}`, {
          method: 'PUT',
          body: { ...payload, status: editingCoupon.status } as UpdateCouponRequest
        })
        toast.success('优惠券更新成功')
      } else {
        await api.request('/api/coupons', {
          method: 'POST',
          body: payload
        })
        toast.success('优惠券创建成功')
      }

      setDialogOpen(false)
      fetchCoupons()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '保存优惠券失败')
    }
  }

  const handleDelete = (id: number) => {
    setDeletingCouponId(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (deletingCouponId === null) return

    try {
      await api.request(`/api/coupons/${deletingCouponId}`, { method: 'DELETE' })
      fetchCoupons()
      toast.success('优惠券删除成功')
      setDeletingCouponId(null)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '删除优惠券失败')
    }
  }

  const handleToggleStatus = async (coupon: Coupon) => {
    const newStatus = coupon.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await api.request(`/api/coupons/${coupon.id}`, {
        method: 'PUT',
        body: { status: newStatus }
      })
      fetchCoupons()
      toast.success(newStatus === 'ACTIVE' ? '已启用' : '已停用')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '切换状态失败')
    }
  }

  const formatCouponValue = (coupon: Coupon) => {
    if (coupon.type === 'FIXED' || coupon.type === 'NO_THRESHOLD') {
      return `减 ${formatPrice(coupon.value)}`
    }
    return `${(Number(coupon.value) * 10).toFixed(1)} 折`
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
          <h2 className="text-2xl font-bold tracking-tight">优惠券管理</h2>
          <p className="text-muted-foreground">创建和管理营销优惠券</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新建优惠券
        </Button>
      </div>

      <Card className="shadow-sm border-0">
        <CardHeader className="bg-linear-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
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
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium whitespace-nowrap">{coupon.name}</TableCell>
                  <TableCell>{typeLabels[coupon.type] || coupon.type}</TableCell>
                  <TableCell className="text-primary font-medium">
                    {formatCouponValue(coupon)}
                  </TableCell>
                  <TableCell>
                    {Number(coupon.minAmount) > 0 ? (
                      `满 ${formatPrice(coupon.minAmount)}`
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        无门槛
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>
                        {coupon.claimedCount}/{coupon.totalCount === -1 ? '∞' : coupon.totalCount}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        已用 {coupon.usedCount}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="text-muted-foreground">
                      {new Date(coupon.startTime).toLocaleDateString()}
                    </div>
                    <div className="font-medium">
                      至 {new Date(coupon.endTime).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusLabels[coupon.status]?.variant || 'default'}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleToggleStatus(coupon)}
                    >
                      {statusLabels[coupon.status]?.label || coupon.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-blue-50"
                        onClick={() => handleEdit(coupon)}
                      >
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-red-50"
                        onClick={() => handleDelete(coupon.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {coupons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center">
                      <Ticket className="h-12 w-12 text-muted/50 mb-4" />
                      <p>暂无优惠券，立即点击创建</p>
                    </div>
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
            <DialogTitle>{editingCoupon ? '编辑优惠券' : '新建优惠券'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="font-semibold text-sm">
                优惠券名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：新人专享满50减10"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type" className="font-semibold text-sm">
                  优惠券类型
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, type: v as 'FIXED' | 'PERCENT' | 'NO_THRESHOLD' })
                  }
                >
                  <SelectTrigger className="h-9">
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
                <Label htmlFor="value" className="font-semibold text-sm">
                  {formData.type === 'PERCENT' ? '折扣 (如0.8为8折)' : '优惠金额 *'}
                </Label>
                <Input
                  id="value"
                  type="number"
                  step={formData.type === 'PERCENT' ? '0.01' : '1'}
                  className="h-9"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === 'PERCENT' ? '0.8' : '10'}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="minAmount" className="font-semibold text-sm">
                  最低消费门槛
                </Label>
                <Input
                  id="minAmount"
                  type="number"
                  className="h-9"
                  value={formData.minAmount}
                  onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                  placeholder="0 表示无门槛"
                />
              </div>
              {formData.type === 'PERCENT' && (
                <div className="grid gap-2">
                  <Label htmlFor="maxDiscount" className="font-semibold text-sm">
                    封顶优惠金额
                  </Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    className="h-9"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    placeholder="不限"
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="totalCount" className="font-semibold text-sm">
                  发放总量
                </Label>
                <Input
                  id="totalCount"
                  type="number"
                  className="h-9"
                  value={formData.totalCount}
                  onChange={(e) => setFormData({ ...formData, totalCount: e.target.value })}
                  placeholder="-1 表示不限量"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="perUserLimit" className="font-semibold text-sm">
                  每人限领次数
                </Label>
                <Input
                  id="perUserLimit"
                  type="number"
                  className="h-9"
                  value={formData.perUserLimit}
                  onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime" className="font-semibold text-sm">
                  生效时间
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  className="h-9 text-xs"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime" className="font-semibold text-sm">
                  失效时间
                </Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  className="h-9 text-xs"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="font-semibold text-sm">
                使用规则说明
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="描述优惠券的限制、商品范围等"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} className="px-8 shadow-md">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="确认删除优惠券"
        description="该操作不可撤销。删除后，未领取的优惠券将失效，已领取的优惠券的使用记录将被保留。"
        confirmText="彻底删除"
        cancelText="取消"
      />
    </div>
  )
}
