"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Bell,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  User,
  Utensils,
  CreditCard,
} from "lucide-react";

interface ServiceCall {
  id: number;
  storeId: number;
  tableId: number;
  orderId: number | null;
  type: "CALL_WAITER" | "RUSH_ORDER" | "REQUEST_BILL";
  status: "PENDING" | "PROCESSING" | "COMPLETED";
  note: string | null;
  createdAt: string;
  updatedAt: string;
  table?: {
    id: number;
    name: string;
  };
  order?: {
    id: number;
    orderNo: string;
  };
}

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  CALL_WAITER: { label: "呼叫服务员", icon: User, color: "bg-blue-100 text-blue-800" },
  RUSH_ORDER: { label: "催单", icon: Utensils, color: "bg-orange-100 text-orange-800" },
  REQUEST_BILL: { label: "请求结账", icon: CreditCard, color: "bg-green-100 text-green-800" },
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  PENDING: { label: "待处理", variant: "destructive" },
  PROCESSING: { label: "处理中", variant: "secondary" },
  COMPLETED: { label: "已完成", variant: "default" },
};

export default function ServicePage() {
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [pendingCount, setPendingCount] = useState(0);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { storeId: 1 };
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.type = typeFilter;

      const queryString = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString();

      const res = await api.request<{ list: ServiceCall[] }>(
        `/api/service?${queryString}`
      );
      setCalls(res.list);
    } catch (error) {
      console.error("Failed to fetch service calls:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await api.request<{ count: number }>(
        "/api/service/pending-count?storeId=1"
      );
      setPendingCount(res.count);
    } catch (error) {
      console.error("Failed to fetch pending count:", error);
    }
  };

  useEffect(() => {
    fetchCalls();
    fetchPendingCount();

    // 每30秒自动刷新
    const interval = setInterval(() => {
      fetchCalls();
      fetchPendingCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [statusFilter, typeFilter]);

  const handleProcess = async (id: number) => {
    try {
      await api.request(`/api/service/${id}/process`, {
        method: "PUT",
        body: JSON.stringify({ status: "PROCESSING" }),
      });
      fetchCalls();
      fetchPendingCount();
    } catch (error) {
      console.error("Failed to process:", error);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await api.request(`/api/service/${id}/process`, {
        method: "PUT",
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      fetchCalls();
      fetchPendingCount();
    } catch (error) {
      console.error("Failed to complete:", error);
    }
  };

  const handleBatchComplete = async () => {
    const pendingIds = calls
      .filter((c) => c.status === "PENDING" || c.status === "PROCESSING")
      .map((c) => c.id);

    if (pendingIds.length === 0) return;

    try {
      await api.request("/api/service/batch-complete", {
        method: "PUT",
        body: JSON.stringify({ ids: pendingIds }),
      });
      fetchCalls();
      fetchPendingCount();
    } catch (error) {
      console.error("Failed to batch complete:", error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">服务呼叫</h2>
          <p className="text-muted-foreground">处理顾客的服务请求</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { fetchCalls(); fetchPendingCount(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          {calls.some((c) => c.status !== "COMPLETED") && (
            <Button onClick={handleBatchComplete}>
              <CheckCircle className="h-4 w-4 mr-2" />
              全部完成
            </Button>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={pendingCount > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待处理</CardTitle>
            <AlertCircle className={`h-4 w-4 ${pendingCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${pendingCount > 0 ? "text-red-600" : ""}`}>
              {pendingCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">呼叫服务员</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calls.filter((c) => c.type === "CALL_WAITER" && c.status !== "COMPLETED").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">催单</CardTitle>
            <Utensils className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calls.filter((c) => c.type === "RUSH_ORDER" && c.status !== "COMPLETED").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">请求结账</CardTitle>
            <CreditCard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calls.filter((c) => c.type === "REQUEST_BILL" && c.status !== "COMPLETED").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 服务呼叫列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              服务请求列表
            </CardTitle>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="CALL_WAITER">呼叫服务员</SelectItem>
                  <SelectItem value="RUSH_ORDER">催单</SelectItem>
                  <SelectItem value="REQUEST_BILL">请求结账</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="PENDING">待处理</SelectItem>
                  <SelectItem value="PROCESSING">处理中</SelectItem>
                  <SelectItem value="COMPLETED">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>桌台</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>订单</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      时间
                    </div>
                  </TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => {
                  const type = typeConfig[call.type];
                  const TypeIcon = type.icon;

                  return (
                    <TableRow key={call.id} className={call.status === "PENDING" ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">
                        {call.table?.name || `桌台 ${call.tableId}`}
                      </TableCell>
                      <TableCell>
                        <Badge className={type.color}>
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {type.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {call.order?.orderNo || "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {call.note || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTime(call.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[call.status].variant}>
                          {statusConfig[call.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {call.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleProcess(call.id)}
                            >
                              处理
                            </Button>
                          )}
                          {call.status !== "COMPLETED" && (
                            <Button
                              size="sm"
                              onClick={() => handleComplete(call.id)}
                            >
                              完成
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {calls.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      暂无服务请求
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
