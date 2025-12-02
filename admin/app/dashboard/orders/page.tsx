"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatPrice, formatDate, ORDER_STATUS_MAP } from "@/lib/utils";
import type { OrderStatus, Order } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Eye, RefreshCw, Check, X } from "lucide-react";

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [keyword, setKeyword] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["orders", page, status, keyword],
    queryFn: () =>
      api.getOrders({
        page,
        pageSize: 10,
        status: (status as OrderStatus) || undefined,
        orderNo: keyword || undefined,
      }),
  });

  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      refetch();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "操作失败");
    }
  };

  const handleRefund = async (orderId: number) => {
    if (!confirm("确定要退款吗？")) return;
    try {
      await api.refundOrder(orderId, "商家操作退款");
      refetch();
      setDetailOpen(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const viewDetail = async (orderId: number) => {
    try {
      const order = await api.getOrder(orderId);
      setSelectedOrder(order);
      setDetailOpen(true);
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">订单管理</h2>
          <p className="text-muted-foreground">查看和管理所有订单</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          刷新
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>订单列表</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索订单号..."
                  className="pl-8 w-[200px]"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <Select value={status || "ALL"} onValueChange={(v) => setStatus(v === "ALL" ? "" : v as OrderStatus)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部状态</SelectItem>
                  <SelectItem value="PENDING">待支付</SelectItem>
                  <SelectItem value="PAID">已支付</SelectItem>
                  <SelectItem value="PREPARING">制作中</SelectItem>
                  <SelectItem value="COMPLETED">已完成</SelectItem>
                  <SelectItem value="CANCELLED">已取消</SelectItem>
                  <SelectItem value="REFUNDED">已退款</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>桌台</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>下单时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.list.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNo}</TableCell>
                      <TableCell>{order.table?.name}</TableCell>
                      <TableCell>{formatPrice(order.payAmount)}</TableCell>
                      <TableCell>
                        <Badge className={ORDER_STATUS_MAP[order.status]?.color || ""}>
                          {ORDER_STATUS_MAP[order.status]?.label || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => viewDetail(order.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status === "PAID" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(order.id, "PREPARING" as OrderStatus)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {order.status === "PREPARING" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(order.id, "COMPLETED" as OrderStatus)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">共 {data?.total || 0} 条记录</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data?.list || data.list.length < 10}
                    onClick={() => setPage(page + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 订单详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
            <DialogDescription>订单号: {selectedOrder?.orderNo}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">桌台:</span> {selectedOrder.table?.name}
                </div>
                <div>
                  <span className="text-muted-foreground">状态:</span>{" "}
                  <Badge className={ORDER_STATUS_MAP[selectedOrder.status]?.color || ""}>
                    {ORDER_STATUS_MAP[selectedOrder.status]?.label}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">下单时间:</span>{" "}
                  {formatDate(selectedOrder.createdAt)}
                </div>
                <div>
                  <span className="text-muted-foreground">支付时间:</span>{" "}
                  {selectedOrder.payTime ? formatDate(selectedOrder.payTime) : "-"}
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">商品列表</h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.snapshot?.name} x {item.quantity}
                      </span>
                      <span>{formatPrice(Number(item.price) * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between font-medium">
                  <span>合计</span>
                  <span>{formatPrice(selectedOrder.payAmount)}</span>
                </div>
              </div>
              {selectedOrder.remark && (
                <div className="text-sm">
                  <span className="text-muted-foreground">备注:</span> {selectedOrder.remark}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedOrder && ["PAID", "PREPARING"].includes(selectedOrder.status) && (
              <Button variant="destructive" onClick={() => handleRefund(selectedOrder.id)}>
                退款
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
