'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Settings,
  Bell,
  Printer,
  Check,
  Loader2,
  Gauge,
  ShieldCheck,
  Headphones,
  Timer,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    order_timeout: '15',
    cart_expire: '120',
    gps_fence: '1000',
    stock_warning: '10',
    print_copies: '1',
    auto_confirm: 'false',
    notification_sound: 'true'
  })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings()
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        order_timeout: settings.order_timeout?.value || '15',
        cart_expire: settings.cart_expire?.value || '120',
        gps_fence: settings.gps_fence?.value || '1000',
        stock_warning: settings.stock_warning?.value || '10',
        print_copies: settings.print_copies?.value || '1',
        auto_confirm: settings.auto_confirm?.value || 'false',
        notification_sound: settings.notification_sound?.value || 'true'
      })
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: (items: { key: string; value: string }[]) => api.updateSettings(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('系统参数同步成功', {
        description: '更改已立即应用至全量终端'
      })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : '配置更新失败')
    }
  })

  const handleSave = () => {
    const items = Object.entries(formData).map(([key, value]) => ({
      key,
      value: String(value)
    }))
    saveMutation.mutate(items)
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Gauge className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs font-bold text-primary tracking-widest uppercase">
              Core System Engine
            </span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">系统全局设置</h2>
          <p className="text-muted-foreground text-sm mt-1">调整订单逻辑、硬件交互与自动化阈值</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
          <ShieldCheck className="h-3 w-3" />
          NETWORK: STABLE
        </div>
      </div>

      <div className="grid gap-6">
        {/* 订单路由逻辑 */}
        <Card className="border-0 shadow-sm bg-slate-50/30 overflow-hidden">
          <CardHeader className="pb-4 border-b bg-white">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold flex items-center gap-2 italic underline decoration-primary/30">
                  <Timer className="h-5 w-5 text-orange-500" />
                  生命周期与围栏
                </CardTitle>
                <CardDescription className="text-xs">
                  定义订单从发起至销毁的各项自动阈值
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-100">
                <Label className="text-xs font-bold uppercase text-slate-500">
                  订单超时 (Minutes)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.order_timeout}
                    onChange={(e) => setFormData({ ...formData, order_timeout: e.target.value })}
                    className="h-11 rounded-xl bg-slate-50 border-0 focus-visible:ring-1"
                  />
                </div>
                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">
                  指从未支付状态迁移至自动取消的冷却时长。
                </p>
              </div>
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-100">
                <Label className="text-xs font-bold uppercase text-slate-500">购物车存活周期</Label>
                <Input
                  type="number"
                  value={formData.cart_expire}
                  onChange={(e) => setFormData({ ...formData, cart_expire: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-0 focus-visible:ring-1"
                />
                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">
                  临时状态在服务端 Redis 缓存中的持久化时间。
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-100">
                <Label className="text-xs font-bold uppercase text-slate-500">
                  地理围栏半径 (Meters)
                </Label>
                <Input
                  type="number"
                  value={formData.gps_fence}
                  onChange={(e) => setFormData({ ...formData, gps_fence: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-0 focus-visible:ring-1"
                />
                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">
                  限制合法点餐的坐标偏移量，0 表示无限制。
                </p>
              </div>
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-100">
                <Label className="text-xs font-bold uppercase text-slate-500">全局熔断预警值</Label>
                <Input
                  type="number"
                  value={formData.stock_warning}
                  onChange={(e) => setFormData({ ...formData, stock_warning: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-0 focus-visible:ring-1"
                />
                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">
                  库存枯竭前的紧急同步信号阈值。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 硬件打印桥接 */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50">
                <Printer className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">打印引擎配置</CardTitle>
                <CardDescription className="text-xs">
                  管控云打印机与本地热敏设备的连通逻辑
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-bold">联排份数</Label>
                <p className="text-xs text-muted-foreground">
                  指单次出票命令触发后的物理纸张产出量
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.print_copies}
                  onChange={(e) => setFormData({ ...formData, print_copies: e.target.value })}
                  className="w-20 rounded-xl font-bold text-center"
                />
                <span className="text-xs font-bold text-slate-400">COPIES</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 自动化交互控制 */}
        <Card className="border-0 shadow-sm overflow-hidden bg-primary/5 border border-primary/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white shadow-sm">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">AI 与自动流</CardTitle>
                <CardDescription className="text-xs text-primary/70">
                  启用系统自动值守功能
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-6 pb-6">
            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-primary/10 transition-all hover:border-primary/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-extrabold">自动接单模式</Label>
                <p className="text-xs text-muted-foreground">
                  绕过人工二次确认，PAY → PRINT 链路完全自动化
                </p>
              </div>
              <Switch
                checked={formData.auto_confirm === 'true'}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    auto_confirm: checked ? 'true' : 'false'
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-primary/10 transition-all hover:border-primary/30">
              <div className="space-y-0.5 flex items-center gap-2">
                <Headphones className="h-4 w-4 text-primary opacity-50" />
                <div>
                  <Label className="text-sm font-extrabold">声学全频段提醒</Label>
                  <p className="text-xs text-muted-foreground">
                    全量浏览器终端同步播放新订单音频信号
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.notification_sound === 'true'}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    notification_sound: checked ? 'true' : 'false'
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* 固定底部操作栏 */}
        <div className="flex justify-end pt-4 sticky bottom-6">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="rounded-full h-14 px-10 bg-slate-900 shadow-2xl hover:bg-slate-800 group transition-all transform active:scale-95"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                SYNCING AGENT...
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5 group-hover:scale-125 transition-transform" />
                <span className="font-extrabold tracking-widest">DEPLOYS CHANGES</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
