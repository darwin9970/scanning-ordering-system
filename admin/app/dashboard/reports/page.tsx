"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, TrendingUp, ShoppingBag } from "lucide-react";

export default function ReportsPage() {
  const [days, setDays] = useState("7");
  const [salesData, setSalesData] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sales, cats, products] = await Promise.all([
          api.getSalesChart(undefined, Number(days)),
          api.request<any[]>("/api/dashboard/category-stats"),
          api.getTopProducts(undefined, 10),
        ]);
        setSalesData(sales);
        setCategoryStats(cats);
        setTopProducts(products);
      } catch (error) {
        console.error("Failed to fetch report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [days]);

  const totalRevenue = salesData.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = salesData.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">数据报表</h2>
          <p className="text-muted-foreground">查看门店经营数据分析</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">最近7天</SelectItem>
            <SelectItem value="14">最近14天</SelectItem>
            <SelectItem value="30">最近30天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 汇总数据 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总营收</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">最近 {days} 天</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总订单数</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">最近 {days} 天</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">客单价</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(avgOrderValue)}</div>
            <p className="text-xs text-muted-foreground">平均每单</p>
          </CardContent>
        </Card>
      </div>

      {/* 销售趋势 */}
      <Card>
        <CardHeader>
          <CardTitle>销售趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {salesData.map((item) => (
              <div key={item.date} className="flex items-center gap-4">
                <div className="w-24 text-sm text-muted-foreground">{item.date}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 bg-primary/80 rounded"
                      style={{
                        width: `${Math.max((item.revenue / (totalRevenue / salesData.length)) * 50, 5)}%`,
                      }}
                    ></div>
                    <span className="text-sm font-medium">{formatPrice(item.revenue)}</span>
                  </div>
                </div>
                <div className="w-20 text-right text-sm text-muted-foreground">
                  {item.orders} 单
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 分类销售统计 */}
        <Card>
          <CardHeader>
            <CardTitle>分类销售统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryStats.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-sm text-muted-foreground">{cat.productCount} 个商品</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{cat.totalSales} 份</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 热销商品 Top 10 */}
        <Card>
          <CardHeader>
            <CardTitle>热销商品 Top 10</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-3">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      index < 3
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.category?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{product.sales} 份</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(product.basePrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
