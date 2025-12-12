"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatPrice, formatDate, ORDER_STATUS_MAP } from "@/lib/utils";
import {
  ShoppingCart,
  DollarSign,
  Clock,
  TrendingUp,
  Package,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface OverviewData {
  today: {
    orders: number;
    revenue: number;
    pendingOrders: number;
  };
  yesterday: {
    orders: number;
    revenue: number;
  };
  total: {
    products: number;
    tables: number;
  };
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewData, ordersData, productsData, chartData] = await Promise.all([
          api.getDashboardOverview(),
          api.getRecentOrders(undefined, 5),
          api.getTopProducts(undefined, 5),
          api.getSalesChart(undefined, 7),
        ]);
        setOverview(overviewData);
        setRecentOrders(ordersData);
        setTopProducts(productsData);
        setSalesData(chartData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const orderGrowth = overview
    ? overview.yesterday.orders > 0
      ? (
          ((overview.today.orders - overview.yesterday.orders) / overview.yesterday.orders) *
          100
        ).toFixed(1)
      : "100"
    : "0";

  const revenueGrowth = overview
    ? overview.yesterday.revenue > 0
      ? (
          ((overview.today.revenue - overview.yesterday.revenue) / overview.yesterday.revenue) *
          100
        ).toFixed(1)
      : "100"
    : "0";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">数据概览</h2>
        <p className="text-muted-foreground">欢迎回来，这是今日的运营数据</p>
      </div>

      {/* 统计卡片 - 使用渐变和更好的视觉层次 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border-0 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">今日订单</CardTitle>
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-1">{overview?.today.orders || 0}</div>
            <div className="flex items-center gap-2 mt-2">
              {Number(orderGrowth) >= 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span className="text-sm text-white/90">
                较昨日{" "}
                <span className="font-semibold">
                  {Number(orderGrowth) >= 0 ? "+" : ""}
                  {orderGrowth}%
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg border-0 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">今日营收</CardTitle>
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-1">
              {formatPrice(overview?.today.revenue || 0)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {Number(revenueGrowth) >= 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span className="text-sm text-white/90">
                较昨日{" "}
                <span className="font-semibold">
                  {Number(revenueGrowth) >= 0 ? "+" : ""}
                  {revenueGrowth}%
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg border-0 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">待处理订单</CardTitle>
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Clock className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-1">{overview?.today.pendingOrders || 0}</div>
            <p className="text-sm text-white/90 mt-2">需要及时处理</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg border-0 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">在售商品</CardTitle>
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Package className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-1">{overview?.total.products || 0}</div>
            <p className="text-sm text-white/90 mt-2">共 {overview?.total.tables || 0} 个桌台</p>
          </CardContent>
        </Card>
      </div>

      {/* 销售趋势图表 */}
      {salesData.length > 0 && (
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              销售趋势（近7天）
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={salesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="line" />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="营收"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", r: 5, strokeWidth: 2, stroke: "white" }}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: "white" }}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  name="订单数"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--chart-2))", r: 5, strokeWidth: 2, stroke: "white" }}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: "white" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 最近订单和热销商品 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              最近订单
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">暂无订单</h3>
                  <p className="text-muted-foreground text-sm">订单数据将在这里显示</p>
                </div>
              ) : (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 hover:bg-muted/50 transition-colors rounded-lg p-2 -mx-2"
                  >
                    <div>
                      <p className="font-medium">{order.orderNo}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.table?.name} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(order.payAmount)}</p>
                      <Badge className={ORDER_STATUS_MAP[order.status]?.color || ""}>
                        {ORDER_STATUS_MAP[order.status]?.label || order.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              热销商品
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">暂无数据</h3>
                  <p className="text-muted-foreground text-sm">热销商品数据将在这里显示</p>
                </div>
              ) : (
                topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 border-b pb-3 last:border-0 hover:bg-muted/50 transition-colors rounded-lg p-2 -mx-2"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.category?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(product.basePrice)}</p>
                      <p className="text-sm text-muted-foreground">销量 {product.sales}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
