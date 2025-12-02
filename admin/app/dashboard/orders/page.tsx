"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatPrice, formatDate, ORDER_STATUS_MAP } from "@/lib/utils";
import type { OrderStatus, Order, Product } from "@/types";
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
import { Search, Eye, RefreshCw, Check, X, Plus, Minus, Receipt, Coins, Ticket, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddItemCart {
  variantId: number;
  productName: string;
  variantName: string;
  price: number;
  quantity: number;
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [keyword, setKeyword] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // 部分退款
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundItems, setRefundItems] = useState<{ itemId: number; quantity: number }[]>([]);
  const [refundReason, setRefundReason] = useState("");

  // 加菜
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [addItemsCart, setAddItemsCart] = useState<AddItemCart[]>([]);
  const [addItemsSearch, setAddItemsSearch] = useState("");

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
    if (!confirm("确定要全额退款吗？")) return;
    try {
      await api.refundOrder(orderId, "商家操作退款");
      refetch();
      setDetailOpen(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  // 打开部分退款对话框
  const openPartialRefund = () => {
    if (!selectedOrder) return;
    setRefundItems(
      selectedOrder.items?.map((item: any) => ({
        itemId: item.id,
        quantity: 0,
      })) || []
    );
    setRefundReason("");
    setRefundDialogOpen(true);
  };

  // 更新退款数量
  const updateRefundQuantity = (itemId: number, delta: number) => {
    const item = selectedOrder?.items?.find((i: any) => i.id === itemId);
    if (!item) return;
    
    setRefundItems((prev) =>
      prev.map((ri) => {
        if (ri.itemId === itemId) {
          const newQty = Math.max(0, Math.min(item.quantity - (item.refundedQuantity || 0), ri.quantity + delta));
          return { ...ri, quantity: newQty };
        }
        return ri;
      })
    );
  };

  // 提交部分退款
  const handlePartialRefund = async () => {
    if (!selectedOrder) return;
    const itemsToRefund = refundItems.filter((ri) => ri.quantity > 0);
    if (itemsToRefund.length === 0) {
      alert("请选择要退款的商品");
      return;
    }

    try {
      await api.request(`/api/orders/${selectedOrder.id}/partial-refund`, {
        method: "POST",
        body: { items: itemsToRefund, reason: refundReason },
      });
      refetch();
      setRefundDialogOpen(false);
      setDetailOpen(false);
      alert("部分退款成功");
    } catch (error: any) {
      alert(error.message);
    }
  };

  // 获取可退款数量
  const getRefundableQty = (item: any) => {
    return item.quantity - (item.refundedQuantity || 0);
  };

  // 计算退款金额
  const calculateRefundAmount = () => {
    if (!selectedOrder) return 0;
    return refundItems.reduce((sum, ri) => {
      const item = selectedOrder.items?.find((i: any) => i.id === ri.itemId);
      if (!item) return sum;
      return sum + Number(item.price) * ri.quantity;
    }, 0);
  };

  // 加菜功能 - 获取商品列表
  const { data: productsData } = useQuery({
    queryKey: ["products-for-add", addItemsSearch],
    queryFn: () => api.getProducts({ pageSize: 50, keyword: addItemsSearch || undefined }),
    enabled: addItemDialogOpen,
  });

  // 打开加菜对话框
  const openAddItemDialog = () => {
    if (!selectedOrder) return;
    setAddItemsCart([]);
    setAddItemsSearch("");
    setAddItemDialogOpen(true);
  };

  // 添加商品到加菜购物车
  const addToCart = (product: any, variant: any) => {
    const existingIndex = addItemsCart.findIndex((item) => item.variantId === variant.id);
    if (existingIndex >= 0) {
      const newCart = [...addItemsCart];
      newCart[existingIndex].quantity += 1;
      setAddItemsCart(newCart);
    } else {
      setAddItemsCart([
        ...addItemsCart,
        {
          variantId: variant.id,
          productName: product.name,
          variantName: variant.name || "默认",
          price: Number(variant.price),
          quantity: 1,
        },
      ]);
    }
  };

  // 更新加菜购物车数量
  const updateCartQuantity = (variantId: number, delta: number) => {
    setAddItemsCart((prev) =>
      prev
        .map((item) => {
          if (item.variantId === variantId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  // 从加菜购物车移除
  const removeFromCart = (variantId: number) => {
    setAddItemsCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  // 计算加菜总金额
  const calculateAddItemsTotal = () => {
    return addItemsCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  // 提交加菜
  const handleAddItems = async () => {
    if (!selectedOrder || addItemsCart.length === 0) return;

    try {
      await api.request(`/api/orders/${selectedOrder.id}/add-items`, {
        method: "POST",
        body: {
          items: addItemsCart.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        },
      });
      refetch();
      setAddItemDialogOpen(false);
      setDetailOpen(false);
      alert("加菜成功");
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                {(selectedOrder as any).dinerCount && (
                  <div>
                    <span className="text-muted-foreground">就餐人数:</span>{" "}
                    {(selectedOrder as any).dinerCount} 人
                  </div>
                )}
              </div>

              {/* 优惠信息 */}
              {((selectedOrder as any).couponDiscount > 0 || (selectedOrder as any).pointsUsed > 0) && (
                <div className="bg-orange-50 rounded-lg p-3 space-y-1">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-orange-500" />
                    优惠信息
                  </h4>
                  <div className="text-sm space-y-1">
                    {(selectedOrder as any).couponDiscount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">优惠券抵扣</span>
                        <span className="text-orange-600">-{formatPrice((selectedOrder as any).couponDiscount)}</span>
                      </div>
                    )}
                    {(selectedOrder as any).pointsUsed > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          积分抵扣（{(selectedOrder as any).pointsUsed}积分）
                        </span>
                        <span className="text-orange-600">-{formatPrice((selectedOrder as any).pointsDeduction || 0)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 商品列表 */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  商品列表
                </h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{item.snapshot?.name} x {item.quantity}</span>
                        {item.refundedQuantity > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            已退{item.refundedQuantity}件
                          </Badge>
                        )}
                      </div>
                      <span>{formatPrice(Number(item.price) * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">商品小计</span>
                    <span>{formatPrice(selectedOrder.totalAmount)}</span>
                  </div>
                  {(selectedOrder as any).couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>优惠券</span>
                      <span>-{formatPrice((selectedOrder as any).couponDiscount)}</span>
                    </div>
                  )}
                  {(selectedOrder as any).pointsDeduction > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>积分抵扣</span>
                      <span>-{formatPrice((selectedOrder as any).pointsDeduction)}</span>
                    </div>
                  )}
                  {(selectedOrder as any).refundAmount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>已退款</span>
                      <span>-{formatPrice((selectedOrder as any).refundAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>实付金额</span>
                    <span className="text-lg">{formatPrice(selectedOrder.payAmount)}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.remark && (
                <div className="text-sm">
                  <span className="text-muted-foreground">备注:</span> {selectedOrder.remark}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            {selectedOrder && ["PAID", "PREPARING"].includes(selectedOrder.status) && (
              <>
                <Button onClick={openAddItemDialog}>
                  <UtensilsCrossed className="h-4 w-4 mr-2" />
                  加菜
                </Button>
                <Button variant="outline" onClick={openPartialRefund}>
                  部分退款
                </Button>
                <Button variant="destructive" onClick={() => handleRefund(selectedOrder.id)}>
                  全额退款
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 部分退款弹窗 */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>部分退款</DialogTitle>
            <DialogDescription>选择要退款的商品和数量</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedOrder.items?.map((item: any) => {
                  const refundItem = refundItems.find((ri) => ri.itemId === item.id);
                  const refundableQty = getRefundableQty(item);
                  
                  if (refundableQty <= 0) {
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <span className="text-muted-foreground line-through">{item.snapshot?.name}</span>
                        <Badge variant="secondary">已全部退款</Badge>
                      </div>
                    );
                  }

                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">{item.snapshot?.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {formatPrice(item.price)}/件
                        </span>
                        <p className="text-xs text-muted-foreground">
                          可退: {refundableQty} 件
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateRefundQuantity(item.id, -1)}
                          disabled={(refundItem?.quantity || 0) <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {refundItem?.quantity || 0}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateRefundQuantity(item.id, 1)}
                          disabled={(refundItem?.quantity || 0) >= refundableQty}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label>退款原因</Label>
                <Textarea
                  placeholder="请输入退款原因（可选）"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="font-medium">退款金额</span>
                <span className="text-xl font-bold text-red-600">
                  {formatPrice(calculateRefundAmount())}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handlePartialRefund}
              disabled={calculateRefundAmount() <= 0}
            >
              确认退款
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 加菜弹窗 */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              加菜 - {selectedOrder?.table?.name}
            </DialogTitle>
            <DialogDescription>
              订单号: {selectedOrder?.orderNo}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            {/* 左侧：商品列表 */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索商品..."
                  className="pl-8"
                  value={addItemsSearch}
                  onChange={(e) => setAddItemsSearch(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-2">
                  {productsData?.list?.map((product: any) => (
                    <div key={product.id} className="border rounded-lg p-3">
                      <div className="font-medium mb-2">{product.name}</div>
                      <div className="space-y-1">
                        {product.variants?.length > 0 ? (
                          product.variants.map((variant: any) => (
                            <div
                              key={variant.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-muted-foreground">
                                {variant.name || "默认"} - {formatPrice(variant.price)}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addToCart(product, variant)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center justify-between text-sm">
                            <span>{formatPrice(product.basePrice)}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                addToCart(product, {
                                  id: product.id * 1000, // 临时ID
                                  name: "默认",
                                  price: product.basePrice,
                                })
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {productsData?.list?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      没有找到商品
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* 右侧：已选商品 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="font-medium">已选商品</span>
                <Badge variant="secondary">{addItemsCart.length}</Badge>
              </div>
              <ScrollArea className="h-[350px] pr-4">
                {addItemsCart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    请从左侧选择要加的菜品
                  </div>
                ) : (
                  <div className="space-y-2">
                    {addItemsCart.map((item) => (
                      <div
                        key={item.variantId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.variantName} - {formatPrice(item.price)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateCartQuantity(item.variantId, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateCartQuantity(item.variantId, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500"
                            onClick={() => removeFromCart(item.variantId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* 合计 */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium">加菜金额</span>
                <span className="text-xl font-bold text-green-600">
                  {formatPrice(calculateAddItemsTotal())}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleAddItems}
              disabled={addItemsCart.length === 0}
            >
              确认加菜
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
