"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Store,
  Clock,
  Settings,
  Wifi,
  Image,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Smartphone,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Banner, StoreStatus } from "@/types";

interface StoreData {
  id: number;
  name: string;
  address: string;
  phone: string;
  logo: string;
  coverImage: string;
  description: string;
  announcement: string;
  status: StoreStatus;
  businessHours: {
    open: string;
    close: string;
    restDays?: number[];
  } | null;
  minOrderAmount: string;
  serviceChargeRate: string;
  autoConfirmOrder: boolean;
  autoCompleteMinutes: number;
  wifiName: string;
  wifiPassword: string;
  contactName: string;
  contactPhone: string;
  welcomeText: string;
  orderTip: string;
}

const WEEKDAYS = [
  { value: 0, label: "周日" },
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
];

const POSITIONS = [
  { value: "MENU_TOP", label: "菜单页顶部" },
  { value: "HOME_TOP", label: "首页顶部" },
];

const LINK_TYPES = [
  { value: "", label: "无跳转" },
  { value: "product", label: "商品详情" },
  { value: "category", label: "商品分类" },
  { value: "promotion", label: "活动页" },
];

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState<StoreData | null>(null);

  // 轮播图状态
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerForm, setBannerForm] = useState<{
    title: string;
    image: string;
    position: "HOME_TOP" | "MENU_TOP" | "CATEGORY" | "PROMOTION";
    linkType: string;
    linkValue: string;
    sort: number;
    isActive: boolean;
  }>({
    title: "",
    image: "",
    position: "MENU_TOP",
    linkType: "",
    linkValue: "",
    sort: 0,
    isActive: true,
  });

  useEffect(() => {
    loadStore();
    loadBanners();
  }, [storeId]);

  const loadStore = async () => {
    try {
      const data = await api.getStore(storeId);
      setStore(data as unknown as StoreData);
    } catch (error) {
      toast.error("加载门店信息失败");
    } finally {
      setLoading(false);
    }
  };

  // 加载轮播图
  const loadBanners = async () => {
    try {
      const data = await api.getBanners({ storeId });
      setBanners(data.list || []);
    } catch (error) {
      console.error("加载轮播图失败", error);
    }
  };

  // 打开添加轮播图弹窗
  const openBannerDialog = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setBannerForm({
        title: banner.title,
        image: banner.image,
        position: banner.position,
        linkType: banner.linkType || "",
        linkValue: banner.linkValue || "",
        sort: banner.sort,
        isActive: banner.isActive,
      });
    } else {
      setEditingBanner(null);
      setBannerForm({
        title: "",
        image: "",
        position: "MENU_TOP",
        linkType: "",
        linkValue: "",
        sort: 0,
        isActive: true,
      });
    }
    setBannerDialogOpen(true);
  };

  // 保存轮播图
  const saveBanner = async () => {
    if (!bannerForm.title || !bannerForm.image) {
      toast.error("请填写标题和上传图片");
      return;
    }

    try {
      if (editingBanner) {
        await api.updateBanner(editingBanner.id, bannerForm);
        toast.success("更新成功");
      } else {
        await api.createBanner({
          ...bannerForm,
          storeId,
          position: bannerForm.position as "MENU_TOP" | "HOME_TOP",
        });
        toast.success("添加成功");
      }
      setBannerDialogOpen(false);
      loadBanners();
    } catch (error) {
      toast.error("操作失败");
    }
  };

  const [deleteBannerDialogOpen, setDeleteBannerDialogOpen] = useState(false);
  const [deletingBannerId, setDeletingBannerId] = useState<number | null>(null);

  // 删除轮播图
  const deleteBanner = (id: number) => {
    setDeletingBannerId(id);
    setDeleteBannerDialogOpen(true);
  };

  const confirmDeleteBanner = async () => {
    if (deletingBannerId === null) return;

    try {
      await api.deleteBanner(deletingBannerId);
      toast.success("删除成功");
      loadBanners();
    } catch (error) {
      toast.error("删除失败");
    }
  };

  // 切换轮播图状态
  const toggleBanner = async (id: number) => {
    try {
      await api.toggleBanner(id);
      loadBanners();
    } catch (error) {
      toast.error("操作失败");
    }
  };

  // 上传轮播图图片
  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await api.upload(file);
      setBannerForm({ ...bannerForm, image: res.url });
      toast.success("上传成功");
    } catch (error) {
      toast.error("上传失败");
    }
  };

  const handleSave = async () => {
    if (!store) return;

    setSaving(true);
    try {
      await api.updateStore(storeId, {
        name: store.name,
        address: store.address || undefined,
        phone: store.phone || undefined,
        logo: store.logo || undefined,
        coverImage: store.coverImage || undefined,
        description: store.description || undefined,
        announcement: store.announcement || undefined,
        status: store.status,
        businessHours: store.businessHours || undefined,
        minOrderAmount: store.minOrderAmount ? Number(store.minOrderAmount) : 0,
        serviceChargeRate: store.serviceChargeRate ? Number(store.serviceChargeRate) : 0,
        autoConfirmOrder: store.autoConfirmOrder,
        autoCompleteMinutes: store.autoCompleteMinutes,
        wifiName: store.wifiName || undefined,
        wifiPassword: store.wifiPassword || undefined,
        contactName: store.contactName || undefined,
        contactPhone: store.contactPhone || undefined,
        welcomeText: store.welcomeText || undefined,
        orderTip: store.orderTip || undefined,
      });
      toast.success("保存成功");
    } catch (error) {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const updateStore = (key: keyof StoreData, value: unknown) => {
    if (!store) return;
    setStore({ ...store, [key]: value });
  };

  const updateBusinessHours = (key: string, value: unknown) => {
    if (!store) return;
    const hours = store.businessHours || { open: "09:00", close: "22:00" };
    setStore({
      ...store,
      businessHours: { ...hours, [key]: value },
    });
  };

  const toggleRestDay = (day: number) => {
    if (!store) return;
    const hours = store.businessHours || { open: "09:00", close: "22:00", restDays: [] };
    const restDays = hours.restDays || [];
    const newRestDays = restDays.includes(day)
      ? restDays.filter((d) => d !== day)
      : [...restDays, day];
    setStore({
      ...store,
      businessHours: { ...hours, restDays: newRestDays },
    });
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "logo" | "coverImage"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await api.upload(file);
      updateStore(field, res.url);
      toast.success("上传成功");
    } catch (error) {
      toast.error("上传失败");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <p className="text-muted-foreground">门店不存在</p>
        <Button variant="link" onClick={() => router.back()}>
          返回列表
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Store className="h-6 w-6" />
              {store.name}
            </h1>
            <p className="text-muted-foreground">{store.address || "暂无地址"}</p>
          </div>
          <Badge variant={store.status === "ACTIVE" ? "default" : "secondary"}>
            {store.status === "ACTIVE" ? "营业中" : store.status === "CLOSED" ? "已打烊" : "已停用"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/stores/${storeId}/design`)}
          >
            <Smartphone className="mr-2 h-4 w-4" />
            页面装修
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "保存中..." : "保存配置"}
          </Button>
        </div>
      </div>

      {/* 配置标签页 */}
      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="business">营业设置</TabsTrigger>
          <TabsTrigger value="order">订单设置</TabsTrigger>
          <TabsTrigger value="banners">轮播图</TabsTrigger>
          <TabsTrigger value="mini">小程序设置</TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                门店信息
              </CardTitle>
              <CardDescription>基本的门店资料配置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>门店名称 *</Label>
                  <Input value={store.name} onChange={(e) => updateStore("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>门店状态</Label>
                  <Select value={store.status} onValueChange={(v) => updateStore("status", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">营业中</SelectItem>
                      <SelectItem value="CLOSED">已打烊</SelectItem>
                      <SelectItem value="DISABLED">已停用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>门店地址</Label>
                <Input
                  value={store.address || ""}
                  onChange={(e) => updateStore("address", e.target.value)}
                  placeholder="请输入详细地址"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>联系人</Label>
                  <Input
                    value={store.contactName || ""}
                    onChange={(e) => updateStore("contactName", e.target.value)}
                    placeholder="负责人姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label>联系电话</Label>
                  <Input
                    value={store.contactPhone || ""}
                    onChange={(e) => updateStore("contactPhone", e.target.value)}
                    placeholder="负责人电话"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>门店电话 (对外)</Label>
                <Input
                  value={store.phone || ""}
                  onChange={(e) => updateStore("phone", e.target.value)}
                  placeholder="顾客可拨打的电话"
                />
              </div>

              <div className="space-y-2">
                <Label>门店简介</Label>
                <Textarea
                  value={store.description || ""}
                  onChange={(e) => updateStore("description", e.target.value)}
                  placeholder="简短介绍门店特色"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                门店图片
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>门店 Logo</Label>
                  <div className="flex items-center gap-4">
                    {store.logo ? (
                      <img
                        src={store.logo}
                        alt="Logo"
                        className="h-20 w-20 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-lg border bg-muted flex items-center justify-center">
                        <Store className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <Label
                        htmlFor="logo-upload"
                        className="cursor-pointer text-primary hover:underline"
                      >
                        上传 Logo
                      </Label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, "logo")}
                      />
                      <p className="text-xs text-muted-foreground mt-1">建议 200x200</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>门店封面图</Label>
                  <div className="flex items-center gap-4">
                    {store.coverImage ? (
                      <img
                        src={store.coverImage}
                        alt="Cover"
                        className="h-20 w-32 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="h-20 w-32 rounded-lg border bg-muted flex items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <Label
                        htmlFor="cover-upload"
                        className="cursor-pointer text-primary hover:underline"
                      >
                        上传封面
                      </Label>
                      <input
                        id="cover-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, "coverImage")}
                      />
                      <p className="text-xs text-muted-foreground mt-1">建议 750x400</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                便利服务
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>WiFi 名称</Label>
                  <Input
                    value={store.wifiName || ""}
                    onChange={(e) => updateStore("wifiName", e.target.value)}
                    placeholder="店内 WiFi 名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label>WiFi 密码</Label>
                  <Input
                    value={store.wifiPassword || ""}
                    onChange={(e) => updateStore("wifiPassword", e.target.value)}
                    placeholder="WiFi 密码"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 营业设置 */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                营业时间
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>开始营业</Label>
                  <Input
                    type="time"
                    value={store.businessHours?.open || "09:00"}
                    onChange={(e) => updateBusinessHours("open", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>结束营业</Label>
                  <Input
                    type="time"
                    value={store.businessHours?.close || "22:00"}
                    onChange={(e) => updateBusinessHours("close", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>休息日</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={
                        store.businessHours?.restDays?.includes(day.value) ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => toggleRestDay(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">选择门店休息的日期</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>店内公告</CardTitle>
              <CardDescription>显示在小程序菜单页顶部</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={store.announcement || ""}
                onChange={(e) => updateStore("announcement", e.target.value)}
                placeholder="如：本店新推出夏日特饮，欢迎品尝！"
                rows={3}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 订单设置 */}
        <TabsContent value="order" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                订单规则
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>起订金额 (元)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={store.minOrderAmount || "0"}
                    onChange={(e) => updateStore("minOrderAmount", e.target.value)}
                    placeholder="0 表示无限制"
                  />
                  <p className="text-xs text-muted-foreground">订单金额低于此值无法下单</p>
                </div>
                <div className="space-y-2">
                  <Label>服务费率 (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={Number(store.serviceChargeRate || 0) * 100}
                    onChange={(e) =>
                      updateStore("serviceChargeRate", (Number(e.target.value) / 100).toString())
                    }
                    placeholder="0 表示不收取"
                  />
                  <p className="text-xs text-muted-foreground">按订单金额收取服务费</p>
                </div>
              </div>

              <div className="flex items-center justify-between py-4 border-t">
                <div>
                  <Label>自动确认订单</Label>
                  <p className="text-sm text-muted-foreground">新订单自动变为"已确认"状态</p>
                </div>
                <Switch
                  checked={store.autoConfirmOrder || false}
                  onCheckedChange={(v) => updateStore("autoConfirmOrder", v)}
                />
              </div>

              <div className="space-y-2">
                <Label>自动完成时间 (分钟)</Label>
                <Input
                  type="number"
                  min="0"
                  value={store.autoCompleteMinutes || 60}
                  onChange={(e) => updateStore("autoCompleteMinutes", Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  订单确认后多久自动完成，0 表示不自动完成
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 轮播图管理 */}
        <TabsContent value="banners" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    轮播图管理
                  </CardTitle>
                  <CardDescription>管理小程序菜单页顶部的轮播图</CardDescription>
                </div>
                <Button onClick={() => openBannerDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加轮播图
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {banners.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无轮播图，点击上方按钮添加
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">排序</TableHead>
                      <TableHead className="w-24">图片</TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead>位置</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {banners.map((banner) => (
                      <TableRow key={banner.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            {banner.sort}
                          </div>
                        </TableCell>
                        <TableCell>
                          <img
                            src={banner.image}
                            alt={banner.title}
                            className="w-20 h-10 object-cover rounded"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{banner.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {POSITIONS.find((p) => p.value === banner.position)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={banner.isActive}
                            onCheckedChange={() => toggleBanner(banner.id)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openBannerDialog(banner)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteBanner(banner.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 小程序设置 */}
        <TabsContent value="mini" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>小程序显示</CardTitle>
              <CardDescription>自定义小程序中的文字和提示</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>欢迎语</Label>
                <Input
                  value={store.welcomeText || ""}
                  onChange={(e) => updateStore("welcomeText", e.target.value)}
                  placeholder="欢迎光临"
                />
                <p className="text-xs text-muted-foreground">显示在扫码入座后的欢迎文字</p>
              </div>

              <div className="space-y-2">
                <Label>点餐提示</Label>
                <Textarea
                  value={store.orderTip || ""}
                  onChange={(e) => updateStore("orderTip", e.target.value)}
                  placeholder="如：本店所有菜品现点现做，请耐心等待"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">显示在确认订单页面的提示信息</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 轮播图编辑弹窗 */}
      <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBanner ? "编辑轮播图" : "添加轮播图"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>标题 *</Label>
              <Input
                value={bannerForm.title}
                onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                placeholder="轮播图标题"
              />
            </div>

            <div className="space-y-2">
              <Label>图片 *</Label>
              <div className="flex gap-4">
                {bannerForm.image ? (
                  <img
                    src={bannerForm.image}
                    alt="预览"
                    className="w-40 h-20 object-cover rounded border"
                  />
                ) : (
                  <div className="w-40 h-20 bg-muted rounded border flex items-center justify-center">
                    <Image className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col justify-center">
                  <Label
                    htmlFor="banner-image-upload"
                    className="cursor-pointer text-primary hover:underline"
                  >
                    上传图片
                  </Label>
                  <input
                    id="banner-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerImageUpload}
                  />
                  <p className="text-xs text-muted-foreground mt-1">建议尺寸: 750 x 280</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>展示位置</Label>
                <Select
                  value={bannerForm.position}
                  onValueChange={(v) =>
                    setBannerForm({
                      ...bannerForm,
                      position: v as "HOME_TOP" | "MENU_TOP" | "CATEGORY" | "PROMOTION",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>排序 (越大越靠前)</Label>
                <Input
                  type="number"
                  value={bannerForm.sort}
                  onChange={(e) => setBannerForm({ ...bannerForm, sort: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>跳转类型</Label>
                <Select
                  value={bannerForm.linkType || "none"}
                  onValueChange={(v) =>
                    setBannerForm({ ...bannerForm, linkType: v === "none" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="无跳转" />
                  </SelectTrigger>
                  <SelectContent>
                    {LINK_TYPES.map((t) => (
                      <SelectItem key={t.value || "none"} value={t.value || "none"}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>跳转值</Label>
                <Input
                  value={bannerForm.linkValue}
                  onChange={(e) => setBannerForm({ ...bannerForm, linkValue: e.target.value })}
                  placeholder="ID 或链接"
                  disabled={!bannerForm.linkType}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={bannerForm.isActive}
                onCheckedChange={(v) => setBannerForm({ ...bannerForm, isActive: v })}
              />
              <Label>启用</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBannerDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={saveBanner}>{editingBanner ? "保存" : "添加"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
