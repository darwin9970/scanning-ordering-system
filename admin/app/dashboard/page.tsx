'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { Order, Product, OrderStatus } from '@/types'
import { formatPrice, formatDate, ORDER_STATUS_MAP } from '@/lib/utils'
import {
  ShoppingCart,
  DollarSign,
  Clock,
  TrendingUp,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  LayoutDashboard,
  RefreshCcw
} from 'lucide-react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

interface OverviewData {
  today: {
    orders: number

    revenue: number
    pendingOrders: number
  }
  yesterday: {
    orders: number
    revenue: number
  }
  total: {
    products: number
    tables: number
  }
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [salesData, setSalesData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [overviewData, ordersData, productsData, chartData] = await Promise.all([
        api.getDashboardOverview(),
        api.getRecentOrders(undefined, 5),
        api.getTopProducts(undefined, 5),
        api.getSalesChart(undefined, 7)
      ])
      setOverview(overviewData)
      setRecentOrders(ordersData)
      setTopProducts(productsData)
      setSalesData(chartData)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  const orderGrowth = overview
    ? overview.yesterday.orders > 0
      ? (
          ((overview.today.orders - overview.yesterday.orders) / overview.yesterday.orders) *
          100
        ).toFixed(1)
      : '100'
    : '0'

  const revenueGrowth = overview
    ? overview.yesterday.revenue > 0
      ? (
          ((overview.today.revenue - overview.yesterday.revenue) / overview.yesterday.revenue) *
          100
        ).toFixed(1)
      : '100'
    : '0'

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">运营指挥塔</h2>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            实时监控门店生命指征与交易流向
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full bg-white shadow-sm hover:bg-slate-50 transition-all border-slate-200"
          onClick={() => {
            setLoading(true)
            fetchData()
          }}
        >
          <RefreshCcw className="mr-2 h-3.5 w-3.5" />
          刷新实时链路
        </Button>
      </div>

      {/* 核心指标矩阵 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* 指标卡片 1 - 今日订单 */}
        <Card className="relative overflow-hidden border-0 shadow-lg group hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingCart className="h-24 w-24 -mr-8 -mt-8 rotate-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">
              今日成交单量
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-800 tracking-tighter tabular-nums">
              {overview?.today.orders || 0}
            </div>
            <div
              className={`flex items-center gap-1.5 mt-3 text-xs font-bold ${Number(orderGrowth) >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              <div
                className={`p-0.5 rounded-full ${Number(orderGrowth) >= 0 ? 'bg-green-100' : 'bg-red-100'}`}
              >
                {Number(orderGrowth) >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
              </div>
              <span>{Math.abs(Number(orderGrowth))}%</span>
              <span className="text-slate-400 font-normal">VS 昨日</span>
            </div>
          </CardContent>
          <div className="h-1 w-full bg-blue-500" />
        </Card>

        {/* 指标卡片 2 - 今日营收 */}
        <Card className="relative overflow-hidden border-0 shadow-lg group hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="h-24 w-24 -mr-8 -mt-8 -rotate-12 text-green-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">
              今日实时营收
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-800 tracking-tighter tabular-nums">
              {formatPrice(overview?.today.revenue || 0)}
            </div>
            <div
              className={`flex items-center gap-1.5 mt-3 text-xs font-bold ${Number(revenueGrowth) >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              <div
                className={`p-0.5 rounded-full ${Number(revenueGrowth) >= 0 ? 'bg-green-100' : 'bg-red-100'}`}
              >
                {Number(revenueGrowth) >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
              </div>
              <span>{Math.abs(Number(revenueGrowth))}%</span>
              <span className="text-slate-400 font-normal">VS 昨日</span>
            </div>
          </CardContent>
          <div className="h-1 w-full bg-green-500" />
        </Card>

        {/* 指标卡片 3 - 待处理 */}
        <Card className="relative overflow-hidden border-0 shadow-lg group hover:shadow-xl transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">
              待决策任务
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 text-4xl font-black text-slate-800 tracking-tighter tabular-nums">
              {overview?.today.pendingOrders || 0}
              <span className="text-xs font-bold text-slate-400 tracking-normal uppercase">
                Unchecked
              </span>
            </div>
            <p className="text-[10px] text-orange-500 font-bold mt-3 animate-pulse uppercase">
              Waiting for response
            </p>
          </CardContent>
          <div className="h-1 w-full bg-orange-500" />
        </Card>

        {/* 指标卡片 4 - 资产库存 */}
        <Card className="relative overflow-hidden border-0 shadow-lg group hover:shadow-xl transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">
              在售资产总额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-800 tracking-tighter tabular-nums">
              {overview?.total.products || 0}
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 font-medium">
              <div className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
              <span>覆盖 {overview?.total.tables || 0} 个物理桌台</span>
            </div>
          </CardContent>
          <div className="h-1 w-full bg-purple-500" />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* 销售趋势曲线 */}
        <Card className="lg:col-span-4 border-0 shadow-sm bg-white overflow-hidden rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 py-6">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                7日营收波动曲线
              </CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-tighter">
                Financial Pulse Tracking
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-8 px-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="营收"
                    stroke="hsl(var(--primary))"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 右侧列表区域 */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  近期流水记录
                </CardTitle>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {recentOrders.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-slate-400">
                    <Package className="h-10 w-10 opacity-20 mb-2" />
                    <span className="text-xs italic tracking-widest">No Recent Streams</span>
                  </div>
                ) : (
                  recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between group hover:bg-slate-50 p-2 rounded-2xl transition-colors cursor-default border border-transparent hover:border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-400 group-hover:bg-white group-hover:text-primary transition-all">
                          {order.orderNo.slice(-4)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">
                            {order.table?.name || '未知台位'}
                          </p>
                          <p className="text-[10px] font-medium text-slate-400">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-800">
                          {formatPrice(order.payAmount)}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[8px] h-4 rounded-md border-0 uppercase font-black tracking-tighter ${ORDER_STATUS_MAP[order.status]?.color || 'bg-slate-100 text-slate-500'}`}
                        >
                          {ORDER_STATUS_MAP[order.status]?.label || order.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                爆款热力排行
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm">
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-4">
                    <span
                      className={`text-xl font-black italic ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-orange-300' : 'text-slate-200'}`}
                    >
                      0{index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-slate-700 leading-none mb-1">{product.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[8px] h-3 px-1 rounded bg-slate-50 text-slate-400 border-slate-100"
                        >
                          {product.category?.name}
                        </Badge>
                        <span className="text-[10px] text-slate-300">|</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          SOLD: {product.sales}
                        </span>
                      </div>
                    </div>
                    <p className="font-black text-primary/80 italic">
                      {formatPrice(product.basePrice)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
