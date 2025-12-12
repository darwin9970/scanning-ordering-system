"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Crown,
  Coins,
  TrendingUp,
  Search,
  Plus,
  Minus,
  Star,
  ShoppingBag,
  Settings2,
  Percent,
  Gift,
  Save,
} from "lucide-react";

interface User {
  id: number;
  openid: string;
  nickname: string | null;
  avatar: string | null;
  phone: string | null;
  createdAt: string;
  member: Member | null;
}

interface Member {
  id: number;
  userId: number;
  level: number;
  points: number;
  createdAt: string;
  user?: {
    id: number;
    nickname: string | null;
    phone: string | null;
    avatar: string | null;
  };
  stats?: {
    totalOrders: number;
    totalAmount: number;
  };
}

interface MemberStats {
  totalMembers: number;
  levelStats: { level: number; count: number }[];
  totalPoints: number;
}

interface LevelConfig {
  level: number;
  name: string;
  minPoints: number;
  discount: number; // 折扣率，如 0.95 表示 95折
  pointsMultiplier: number; // 积分倍率
  color: string;
}

const levelNames: Record<number, string> = {
  1: "普通会员",
  2: "银卡会员",
  3: "金卡会员",
  4: "铂金会员",
  5: "钻石会员",
};

const levelColors: Record<number, string> = {
  1: "bg-gray-100 text-gray-800",
  2: "bg-slate-200 text-slate-800",
  3: "bg-yellow-100 text-yellow-800",
  4: "bg-blue-100 text-blue-800",
  5: "bg-purple-100 text-purple-800",
};

// 默认等级配置
const defaultLevelConfigs: LevelConfig[] = [
  {
    level: 1,
    name: "普通会员",
    minPoints: 0,
    discount: 1.0,
    pointsMultiplier: 1.0,
    color: "bg-gray-100 text-gray-800",
  },
  {
    level: 2,
    name: "银卡会员",
    minPoints: 1000,
    discount: 0.98,
    pointsMultiplier: 1.2,
    color: "bg-slate-200 text-slate-800",
  },
  {
    level: 3,
    name: "金卡会员",
    minPoints: 5000,
    discount: 0.95,
    pointsMultiplier: 1.5,
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    level: 4,
    name: "铂金会员",
    minPoints: 20000,
    discount: 0.92,
    pointsMultiplier: 2.0,
    color: "bg-blue-100 text-blue-800",
  },
  {
    level: 5,
    name: "钻石会员",
    minPoints: 50000,
    discount: 0.88,
    pointsMultiplier: 3.0,
    color: "bg-purple-100 text-purple-800",
  },
];

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  // 等级配置
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[]>(defaultLevelConfigs);
  const [pointsPerYuan, setPointsPerYuan] = useState(1); // 每消费1元获得积分
  const [pointsToYuan, setPointsToYuan] = useState(100); // 多少积分抵扣1元
  const [savingConfig, setSavingConfig] = useState(false);

  // 调整积分/等级对话框
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [adjustType, setAdjustType] = useState<"points" | "level">("points");
  const [adjustValue, setAdjustValue] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  // 会员详情对话框
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [memberDetail, setMemberDetail] = useState<Member | null>(null);
  const [memberOrders, setMemberOrders] = useState<any[]>([]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (keyword) params.keyword = keyword;
      if (levelFilter !== "all") params.level = Number(levelFilter);

      const queryString = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString();

      const res = await api.request<{ list: Member[] }>(
        `/api/members${queryString ? `?${queryString}` : ""}`
      );
      setMembers(res.list);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.request<MemberStats>("/api/members/stats");
      setStats(res);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchStats();
  }, [levelFilter]);

  const handleSearch = () => {
    fetchMembers();
  };

  const handleAdjustPoints = (member: Member) => {
    setSelectedMember(member);
    setAdjustType("points");
    setAdjustValue("");
    setAdjustReason("");
    setAdjustDialogOpen(true);
  };

  const handleAdjustLevel = (member: Member) => {
    setSelectedMember(member);
    setAdjustType("level");
    setAdjustValue(member.level.toString());
    setAdjustReason("");
    setAdjustDialogOpen(true);
  };

  const handleSubmitAdjust = async () => {
    if (!selectedMember) return;

    try {
      if (adjustType === "points") {
        await api.request(`/api/members/${selectedMember.id}/points`, {
          method: "PUT",
          body: JSON.stringify({
            points: Number(adjustValue),
            reason: adjustReason,
          }),
        });
      } else {
        await api.request(`/api/members/${selectedMember.id}/level`, {
          method: "PUT",
          body: JSON.stringify({
            level: Number(adjustValue),
          }),
        });
      }

      setAdjustDialogOpen(false);
      fetchMembers();
      fetchStats();
    } catch (error) {
      console.error("Failed to adjust:", error);
    }
  };

  const handleViewDetail = async (member: Member) => {
    setMemberDetail(member);
    setDetailDialogOpen(true);

    try {
      const res = await api.request<{ list: any[] }>(
        `/api/members/${member.id}/orders?pageSize=10`
      );
      setMemberOrders(res.list);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  };

  const updateLevelConfig = (level: number, field: keyof LevelConfig, value: any) => {
    setLevelConfigs((prev) =>
      prev.map((cfg) => (cfg.level === level ? { ...cfg, [field]: value } : cfg))
    );
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      // 保存到 settings (使用批量更新API)
      await api.updateSettings([
        { key: "member_level_configs", value: JSON.stringify(levelConfigs) },
        { key: "points_per_yuan", value: pointsPerYuan.toString() },
        { key: "points_to_yuan", value: pointsToYuan.toString() },
      ]);
      alert("保存成功");
    } catch (error) {
      console.error("Failed to save config:", error);
      alert("保存失败");
    } finally {
      setSavingConfig(false);
    }
  };

  // 加载配置
  const loadConfig = async () => {
    try {
      const settings = await api.getSettings();
      if (settings.member_level_configs?.value) {
        setLevelConfigs(JSON.parse(settings.member_level_configs.value));
      }
      if (settings.points_per_yuan?.value) {
        setPointsPerYuan(Number(settings.points_per_yuan.value));
      }
      if (settings.points_to_yuan?.value) {
        setPointsToYuan(Number(settings.points_to_yuan.value));
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  if (loading && members.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">会员管理</h2>
        <p className="text-muted-foreground">管理用户会员等级和积分</p>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            会员列表
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            等级设置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {/* 统计卡片 */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总会员数</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMembers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">金卡及以上</CardTitle>
                  <Crown className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.levelStats
                      .filter((l) => l.level >= 3)
                      .reduce((sum, l) => sum + l.count, 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总积分池</CardTitle>
                  <Coins className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">等级分布</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-1 text-xs">
                    {stats.levelStats.map((l) => (
                      <span key={l.level} className="text-muted-foreground">
                        Lv{l.level}:{l.count}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 搜索和筛选 */}
          <Card>
            <CardHeader>
              <CardTitle>会员列表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-4">
                <div className="flex flex-1 gap-2">
                  <Input
                    placeholder="搜索昵称或手机号..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="会员等级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部等级</SelectItem>
                    <SelectItem value="1">普通会员</SelectItem>
                    <SelectItem value="2">银卡会员</SelectItem>
                    <SelectItem value="3">金卡会员</SelectItem>
                    <SelectItem value="4">铂金会员</SelectItem>
                    <SelectItem value="5">钻石会员</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>手机号</TableHead>
                    <TableHead>会员等级</TableHead>
                    <TableHead>积分</TableHead>
                    <TableHead>累计消费</TableHead>
                    <TableHead>订单数</TableHead>
                    <TableHead>注册时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {member.user?.avatar ? (
                            <img src={member.user.avatar} alt="" className="h-8 w-8 rounded-full" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <Users className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                          <span>{member.user?.nickname || "未设置"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{member.user?.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge className={levelColors[member.level]}>
                          <Star className="h-3 w-3 mr-1" />
                          {levelNames[member.level]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-orange-600">
                          {member.points.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>{formatPrice(member.stats?.totalAmount || 0)}</TableCell>
                      <TableCell>{member.stats?.totalOrders || 0} 单</TableCell>
                      <TableCell>{new Date(member.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(member)}
                          >
                            详情
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdjustPoints(member)}
                          >
                            <Coins className="h-3 w-3 mr-1" />
                            积分
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdjustLevel(member)}
                          >
                            <Crown className="h-3 w-3 mr-1" />
                            等级
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        暂无会员数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 等级设置 Tab */}
        <TabsContent value="settings" className="space-y-4">
          {/* 积分规则 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                积分规则
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>消费获取积分</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">每消费</span>
                    <Input type="number" className="w-20" value={1} disabled />
                    <span className="text-muted-foreground">元，获得</span>
                    <Input
                      type="number"
                      className="w-20"
                      value={pointsPerYuan}
                      onChange={(e) => setPointsPerYuan(Number(e.target.value))}
                    />
                    <span className="text-muted-foreground">积分</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>积分抵扣</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-20"
                      value={pointsToYuan}
                      onChange={(e) => setPointsToYuan(Number(e.target.value))}
                    />
                    <span className="text-muted-foreground">积分 = 1 元</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 等级配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                会员等级配置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">等级</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>升级所需积分</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Percent className="h-4 w-4" />
                        折扣
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Gift className="h-4 w-4" />
                        积分倍率
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {levelConfigs.map((config) => (
                    <TableRow key={config.level}>
                      <TableCell>
                        <Badge className={config.color}>
                          <Star className="h-3 w-3 mr-1" />
                          Lv{config.level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={config.name}
                          onChange={(e) => updateLevelConfig(config.level, "name", e.target.value)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={config.minPoints}
                          onChange={(e) =>
                            updateLevelConfig(config.level, "minPoints", Number(e.target.value))
                          }
                          className="w-28"
                          disabled={config.level === 1}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            min="0.5"
                            max="1"
                            value={config.discount}
                            onChange={(e) =>
                              updateLevelConfig(config.level, "discount", Number(e.target.value))
                            }
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">
                            ({Math.round((1 - config.discount) * 100)}% off)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            min="1"
                            value={config.pointsMultiplier}
                            onChange={(e) =>
                              updateLevelConfig(
                                config.level,
                                "pointsMultiplier",
                                Number(e.target.value)
                              )
                            }
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">x</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleSaveConfig} disabled={savingConfig}>
                  <Save className="h-4 w-4 mr-2" />
                  {savingConfig ? "保存中..." : "保存配置"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 等级说明 */}
          <Card>
            <CardHeader>
              <CardTitle>等级权益说明</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                {levelConfigs.map((config) => (
                  <div key={config.level} className="rounded-lg border p-4 space-y-2">
                    <Badge className={config.color}>
                      <Star className="h-3 w-3 mr-1" />
                      {config.name}
                    </Badge>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">升级条件：</span>
                        {config.minPoints === 0
                          ? "注册即可"
                          : `${config.minPoints.toLocaleString()} 积分`}
                      </p>
                      <p>
                        <span className="text-muted-foreground">消费折扣：</span>
                        {config.discount === 1
                          ? "无"
                          : `${Math.round(config.discount * 100) / 10} 折`}
                      </p>
                      <p>
                        <span className="text-muted-foreground">积分倍率：</span>
                        {config.pointsMultiplier}x
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 调整积分/等级对话框 */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustType === "points" ? "调整积分" : "调整等级"} - {selectedMember?.user?.nickname}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {adjustType === "points" ? (
              <>
                <div className="text-sm text-muted-foreground">
                  当前积分:{" "}
                  <span className="font-medium text-foreground">{selectedMember?.points}</span>
                </div>
                <div className="grid gap-2">
                  <Label>调整数值（正数增加，负数扣除）</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setAdjustValue((prev) => String(Number(prev || 0) - 100))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={adjustValue}
                      onChange={(e) => setAdjustValue(e.target.value)}
                      placeholder="输入调整数值"
                      className="text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setAdjustValue((prev) => String(Number(prev || 0) + 100))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>调整原因</Label>
                  <Input
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="如：活动奖励、补偿等"
                  />
                </div>
              </>
            ) : (
              <div className="grid gap-2">
                <Label>选择等级</Label>
                <Select value={adjustValue} onValueChange={setAdjustValue}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Lv1 普通会员</SelectItem>
                    <SelectItem value="2">Lv2 银卡会员</SelectItem>
                    <SelectItem value="3">Lv3 金卡会员</SelectItem>
                    <SelectItem value="4">Lv4 铂金会员</SelectItem>
                    <SelectItem value="5">Lv5 钻石会员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmitAdjust}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 会员详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>会员详情</DialogTitle>
          </DialogHeader>
          {memberDetail && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {memberDetail.user?.avatar ? (
                  <img src={memberDetail.user.avatar} alt="" className="h-16 w-16 rounded-full" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <Users className="h-8 w-8 text-gray-500" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-medium">
                    {memberDetail.user?.nickname || "未设置昵称"}
                  </h3>
                  <p className="text-muted-foreground">
                    {memberDetail.user?.phone || "未绑定手机"}
                  </p>
                </div>
                <Badge className={`ml-auto ${levelColors[memberDetail.level]}`}>
                  <Star className="h-3 w-3 mr-1" />
                  {levelNames[memberDetail.level]}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">当前积分</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {memberDetail.points.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">累计消费</div>
                  <div className="text-2xl font-bold">
                    {formatPrice(memberDetail.stats?.totalAmount || 0)}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">订单数量</div>
                  <div className="text-2xl font-bold">{memberDetail.stats?.totalOrders || 0}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  最近订单
                </h4>
                {memberOrders.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {memberOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-lg border p-3 text-sm"
                      >
                        <div>
                          <span className="font-medium">{order.orderNo}</span>
                          <span className="ml-2 text-muted-foreground">
                            {new Date(order.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary">{order.status}</Badge>
                          <span className="font-medium">{formatPrice(order.payAmount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">暂无订单记录</div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
