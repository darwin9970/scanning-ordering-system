"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatPrice, formatDate, ORDER_STATUS_MAP } from "@/lib/utils";
import { ShoppingCart, DollarSign, Clock, TrendingUp, Package, Users } from "lucide-react";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewData, ordersData, productsData] = await Promise.all([
          api.getDashboardOverview(),
          api.getRecentOrders(undefined, 5),
          api.getTopProducts(undefined, 5),
        ]);
        setOverview(overviewData);
        setRecentOrders(ordersData);
        setTopProducts(productsData);
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

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日订单</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.today.orders || 0}</div>
            <p className="text-xs text-muted-foreground">
              较昨日{" "}
              <span className={Number(orderGrowth) >= 0 ? "text-green-600" : "text-red-600"}>
                {Number(orderGrowth) >= 0 ? "+" : ""}
                {orderGrowth}%
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日营收</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(overview?.today.revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              较昨日{" "}
              <span className={Number(revenueGrowth) >= 0 ? "text-green-600" : "text-red-600"}>
                {Number(revenueGrowth) >= 0 ? "+" : ""}
                {revenueGrowth}%
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待处理订单</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.today.pendingOrders || 0}</div>
            <p className="text-xs text-muted-foreground">需要及时处理</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">在售商品</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.total.products || 0}</div>
            <p className="text-xs text-muted-foreground">共 {overview?.total.tables || 0} 个桌台</p>
          </CardContent>
        </Card>
      </div>

      {/* 最近订单和热销商品 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              最近订单
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">暂无订单</p>
              ) : (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              热销商品
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">暂无数据</p>
              ) : (
                topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 border-b pb-3 last:border-0"
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
