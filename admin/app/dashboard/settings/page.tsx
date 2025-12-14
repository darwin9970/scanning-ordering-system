"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, Printer, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    order_timeout: "15",
    cart_expire: "120",
    gps_fence: "1000",
    stock_warning: "10",
    print_copies: "1",
    auto_confirm: "false",
    notification_sound: "true",
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        order_timeout: settings.order_timeout?.value || "15",
        cart_expire: settings.cart_expire?.value || "120",
        gps_fence: settings.gps_fence?.value || "1000",
        stock_warning: settings.stock_warning?.value || "10",
        print_copies: settings.print_copies?.value || "1",
        auto_confirm: settings.auto_confirm?.value || "false",
        notification_sound: settings.notification_sound?.value || "true",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (items: { key: string; value: string }[]) => api.updateSettings(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("设置保存成功");
    },
  });

  const handleSave = () => {
    const items = Object.entries(formData).map(([key, value]) => ({
      key,
      value: String(value),
    }));
    saveMutation.mutate(items);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">系统设置</h2>
        <p className="text-muted-foreground">管理系统配置和个人偏好</p>
      </div>

      <div className="grid gap-6">
        {/* 基本设置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>基本设置</CardTitle>
            </div>
            <CardDescription>配置系统基本参数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>订单超时时间（分钟）</Label>
                <Input
                  type="number"
                  value={formData.order_timeout}
                  onChange={(e) => setFormData({ ...formData, order_timeout: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">超过此时间未支付的订单将自动取消</p>
              </div>
              <div className="space-y-2">
                <Label>购物车有效期（分钟）</Label>
                <Input
                  type="number"
                  value={formData.cart_expire}
                  onChange={(e) => setFormData({ ...formData, cart_expire: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">超过此时间未操作的购物车将自动清空</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>GPS围栏距离（米）</Label>
                <Input
                  type="number"
                  value={formData.gps_fence}
                  onChange={(e) => setFormData({ ...formData, gps_fence: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">超过此距离无法点单</p>
              </div>
              <div className="space-y-2">
                <Label>库存预警阈值</Label>
                <Input
                  type="number"
                  value={formData.stock_warning}
                  onChange={(e) => setFormData({ ...formData, stock_warning: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">库存低于此值时显示预警</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 打印设置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              <CardTitle>打印设置</CardTitle>
            </div>
            <CardDescription>配置打印机相关参数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>默认打印份数</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.print_copies}
                  onChange={(e) => setFormData({ ...formData, print_copies: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">每份小票打印的份数</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 通知设置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>通知设置</CardTitle>
            </div>
            <CardDescription>配置系统通知方式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>自动确认订单</Label>
                <p className="text-xs text-muted-foreground">新订单支付后自动确认，无需人工操作</p>
              </div>
              <Switch
                checked={formData.auto_confirm === "true"}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    auto_confirm: checked ? "true" : "false",
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>新订单提示音</Label>
                <p className="text-xs text-muted-foreground">有新订单时播放提示音</p>
              </div>
              <Switch
                checked={formData.notification_sound === "true"}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    notification_sound: checked ? "true" : "false",
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                保存所有设置
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
