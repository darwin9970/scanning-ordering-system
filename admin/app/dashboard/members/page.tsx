'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import type { User, Member, MemberStats, LevelConfig, Order } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  Crown,
  Coins,
  TrendingUp,
  Search,
  Plus,
  Minus,
  Star,
  ShoppingCart,
  Settings2,
  Percent,
  Gift,
  Save
} from 'lucide-react'
import { toast } from 'sonner'

const levelNames: Record<number, string> = {
  1: '普通会员',
  2: '银卡会员',
  3: '金卡会员',
  4: '铂金会员',
  5: '钻石会员'
}

const levelColors: Record<number, string> = {
  1: 'bg-gray-100 text-gray-800',
  2: 'bg-slate-200 text-slate-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-blue-100 text-blue-800',
  5: 'bg-purple-100 text-purple-800'
}

// 默认等级配置
const defaultLevelConfigs: LevelConfig[] = [
  {
    level: 1,
    name: '普通会员',
    minPoints: 0,
    discount: 1.0,
    pointsMultiplier: 1.0,
    color: 'bg-gray-100 text-gray-800'
  },
  {
    level: 2,
    name: '银卡会员',
    minPoints: 1000,
    discount: 0.98,
    pointsMultiplier: 1.2,
    color: 'bg-slate-200 text-slate-800'
  },
  {
    level: 3,
    name: '金卡会员',
    minPoints: 5000,
    discount: 0.95,
    pointsMultiplier: 1.5,
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    level: 4,
    name: '铂金会员',
    minPoints: 20000,
    discount: 0.92,
    pointsMultiplier: 2.0,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    level: 5,
    name: '钻石会员',
    minPoints: 50000,
    discount: 0.88,
    pointsMultiplier: 3.0,
    color: 'bg-purple-100 text-purple-800'
  }
]

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')

  // 等级配置
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[]>(defaultLevelConfigs)
  const [pointsPerYuan, setPointsPerYuan] = useState(1) // 每消费1元获得积分
  const [pointsToYuan, setPointsToYuan] = useState(100) // 多少积分抵扣1元
  const [savingConfig, setSavingConfig] = useState(false)

  // 调整积分/等级对话框
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [adjustType, setAdjustType] = useState<'points' | 'level'>('points')
  const [adjustValue, setAdjustValue] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  // 会员详情对话框
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [memberDetail, setMemberDetail] = useState<Member | null>(null)
  const [memberOrders, setMemberOrders] = useState<Order[]>([])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {}
      if (keyword) params.keyword = keyword
      if (levelFilter !== 'all') params.level = Number(levelFilter)

      const queryString = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString()

      const res = await api.request<{ list: Member[] }>(
        `/api/members${queryString ? `?${queryString}` : ''}`
      )
      setMembers(res.list)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '获取会员列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await api.request<MemberStats>('/api/members/stats')
      setStats(res)
    } catch (error: unknown) {
      console.error('Failed to fetch stats:', error)
    }
  }

  useEffect(() => {
    fetchMembers()
    fetchStats()
  }, [levelFilter])

  const handleSearch = () => {
    fetchMembers()
  }

  const handleAdjustPoints = (member: Member) => {
    setSelectedMember(member)
    setAdjustType('points')
    setAdjustValue('')
    setAdjustReason('')
    setAdjustDialogOpen(true)
  }

  const handleAdjustLevel = (member: Member) => {
    setSelectedMember(member)
    setAdjustType('level')
    setAdjustValue(member.level.toString())
    setAdjustReason('')
    setAdjustDialogOpen(true)
  }

  const handleSubmitAdjust = async () => {
    if (!selectedMember) return

    try {
      if (adjustType === 'points') {
        await api.request(`/api/members/${selectedMember.id}/points`, {
          method: 'PUT',
          body: {
            points: Number(adjustValue),
            reason: adjustReason
          }
        })
      } else {
        await api.request(`/api/members/${selectedMember.id}/level`, {
          method: 'PUT',
          body: {
            level: Number(adjustValue)
          }
        })
      }

      setAdjustDialogOpen(false)
      fetchMembers()
      fetchStats()
      toast.success('调整成功')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '调整失败')
    }
  }

  const handleViewDetail = async (member: Member) => {
    setMemberDetail(member)
    setDetailDialogOpen(true)

    try {
      const res = await api.request<{ list: Order[] }>(
        `/api/members/${member.id}/orders?pageSize=10`
      )
      setMemberOrders(res.list)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '获取会员订单失败')
    }
  }

  const updateLevelConfig = (level: number, field: keyof LevelConfig, value: string | number) => {
    setLevelConfigs((prev) =>
      prev.map((cfg) => (cfg.level === level ? { ...cfg, [field]: value } : cfg))
    )
  }

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    try {
      await api.updateSettings([
        { key: 'member_level_configs', value: JSON.stringify(levelConfigs) },
        { key: 'points_per_yuan', value: pointsPerYuan.toString() },
        { key: 'points_to_yuan', value: pointsToYuan.toString() }
      ])
      toast.success('保存成功')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSavingConfig(false)
    }
  }

  const loadConfig = async () => {
    try {
      const settings = await api.getSettings()
      if (settings.member_level_configs?.value) {
        setLevelConfigs(JSON.parse(settings.member_level_configs.value))
      }
      if (settings.points_per_yuan?.value) {
        setPointsPerYuan(Number(settings.points_per_yuan.value))
      }
      if (settings.points_to_yuan?.value) {
        setPointsToYuan(Number(settings.points_to_yuan.value))
      }
    } catch (error: unknown) {
      console.error('Failed to load config:', error)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  if (loading && members.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">会员管理</h2>
          <p className="text-muted-foreground">管理用户会员等级和积分</p>
        </div>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="members" className="gap-2 px-6">
            <Users className="h-4 w-4" />
            会员列表
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 px-6">
            <Settings2 className="h-4 w-4" />
            规则配置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4 outline-none">
          {/* 统计卡片 */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总会员数</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMembers}</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm text-yellow-600 bg-yellow-50/30">
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
              <Card className="border-0 shadow-sm text-orange-600 bg-orange-50/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总积分池</CardTitle>
                  <Coins className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm text-blue-600 bg-blue-50/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">等级分布</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
                    {stats.levelStats.map((l) => (
                      <Badge
                        key={l.level}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 whitespace-nowrap bg-white/50"
                      >
                        Lv{l.level}:{l.count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 搜索和筛选 */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-linear-to-r from-muted/50 to-transparent">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-lg">会员名录</CardTitle>
                <div className="flex gap-2">
                  <div className="relative group">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      placeholder="搜索昵称或手机号..."
                      className="pl-9 w-[260px] bg-white transition-all focus:ring-primary/20"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-[140px] bg-white">
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
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="pl-6">用户</TableHead>
                    <TableHead>手机号</TableHead>
                    <TableHead>会员等级</TableHead>
                    <TableHead>积分</TableHead>
                    <TableHead>累计消费</TableHead>
                    <TableHead>订单数</TableHead>
                    <TableHead>注册时间</TableHead>
                    <TableHead className="text-right pr-6">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          {member.user?.avatar ? (
                            <img
                              src={member.user.avatar}
                              alt=""
                              className="h-9 w-9 rounded-full ring-2 ring-muted shadow-sm"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                              <Users className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{member.user?.nickname || '游客用户'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.user?.phone || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${levelColors[member.level]} px-2 py-0.5 shadow-none border-0`}
                        >
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          {levelNames[member.level]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-orange-600">
                          {member.points.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">
                        {formatPrice(member.stats?.totalAmount || 0)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.stats?.totalOrders || 0} 单
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 hover:bg-primary/5 hover:text-primary"
                            onClick={() => handleViewDetail(member)}
                          >
                            详情
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 hover:bg-orange-50 hover:text-orange-600"
                            onClick={() => handleAdjustPoints(member)}
                          >
                            <Coins className="h-3.5 w-3.5 mr-1" />
                            积分
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => handleAdjustLevel(member)}
                          >
                            <Crown className="h-3.5 w-3.5 mr-1" />
                            等级
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-20">
                        <div className="flex flex-col items-center gap-2 opacity-50">
                          <Users className="h-12 w-12" />
                          <p>暂无符合条件的会员数据</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 outline-none">
          <div className="grid gap-6 md:grid-cols-2">
            {/* 积分规则 */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="bg-orange-50/50">
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <Coins className="h-5 w-5" />
                  积分分发规则
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">
                      消费积分获取率
                    </Label>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-orange-50/20 border border-orange-100">
                      <span className="text-sm font-medium">每消费 1 元</span>
                      <TrendingUp className="h-4 w-4 text-orange-400" />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-24 text-center font-bold"
                          value={pointsPerYuan}
                          onChange={(e) => setPointsPerYuan(Number(e.target.value))}
                        />
                        <span className="text-sm">积分</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs uppercase text-muted-foreground">积分价值设定</Label>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50/20 border border-blue-100">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-24 text-center font-bold"
                          value={pointsToYuan}
                          onChange={(e) => setPointsToYuan(Number(e.target.value))}
                        />
                        <span className="text-sm">积分</span>
                      </div>
                      <TrendingUp className="h-4 w-4 text-blue-400 rotate-180" />
                      <span className="text-sm font-medium">= 抵扣 1 元</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 当前各等级权益摘要 */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="bg-blue-50/50">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Crown className="h-5 w-5" />
                  等级权益汇总
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 overflow-hidden">
                <div className="grid grid-cols-5 gap-2">
                  {levelConfigs.map((config) => (
                    <div
                      key={config.level}
                      className="flex flex-col items-center gap-3 p-3 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div
                        className={`h-10 w-10 rounded-full ${config.color.split(' ')[0]} flex items-center justify-center font-bold`}
                      >
                        {config.level}
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-bold truncate">{config.name}</div>
                        <div className="text-primary font-bold mt-1">
                          {(config.discount * 10).toFixed(1)}折
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 会员等级配置主表格 */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between bg-muted/20">
              <CardTitle className="text-lg">详细等级规则定制</CardTitle>
              <Button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="bg-primary shadow-lg shadow-primary/20"
              >
                <Save className="h-4 w-4 mr-2" />
                {savingConfig ? '同步中...' : '保存全局配置'}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">等级梯度</TableHead>
                    <TableHead>显称</TableHead>
                    <TableHead>入场门槛(积分)</TableHead>
                    <TableHead>买单折扣</TableHead>
                    <TableHead>积分累积系数</TableHead>
                    <TableHead className="text-right pr-6">权益效果</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {levelConfigs.map((config) => (
                    <TableRow key={config.level} className="hover:bg-muted/5 transition-colors">
                      <TableCell className="pl-6">
                        <Badge
                          className={`${config.color} px-2 py-0.5 border-0 shadow-none font-bold`}
                        >
                          GRADE {config.level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={config.name}
                          onChange={(e) => updateLevelConfig(config.level, 'name', e.target.value)}
                          className="w-32 h-8 text-sm focus:border-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={config.minPoints}
                          onChange={(e) =>
                            updateLevelConfig(config.level, 'minPoints', Number(e.target.value))
                          }
                          className="w-28 h-8 text-sm"
                          disabled={config.level === 1}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0.5"
                            max="1"
                            value={config.discount}
                            onChange={(e) =>
                              updateLevelConfig(config.level, 'discount', Number(e.target.value))
                            }
                            className="w-20 h-8 text-sm text-center"
                          />
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            ({Math.round((1 - config.discount) * 100)}% 减免)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.1"
                            min="1"
                            value={config.pointsMultiplier}
                            onChange={(e) =>
                              updateLevelConfig(
                                config.level,
                                'pointsMultiplier',
                                Number(e.target.value)
                              )
                            }
                            className="w-20 h-8 text-sm text-center"
                          />
                          <span className="text-sm font-bold text-primary">x</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="text-[10px] space-y-0.5">
                          <p className="font-medium text-primary">
                            {(config.discount * 10).toFixed(1)}折优惠
                          </p>
                          <p className="text-muted-foreground">
                            {config.pointsMultiplier}x 能量加速
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 调整积分/等级对话框 */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {adjustType === 'points' ? (
                <Coins className="h-5 w-5 text-orange-500" />
              ) : (
                <Crown className="h-5 w-5 text-yellow-500" />
              )}
              {adjustType === 'points' ? '特权积分发放' : '特殊等级授予'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
              {selectedMember?.user?.avatar ? (
                <img
                  src={selectedMember.user.avatar}
                  alt=""
                  className="h-12 w-12 rounded-full ring-2 ring-white"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <div className="font-bold text-lg">
                  {selectedMember?.user?.nickname || '未知用户'}
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-[10px] truncate max-w-[100px]">
                    {selectedMember?.user?.openid}
                  </Badge>
                  <Badge className={levelColors[selectedMember?.level || 1]}>
                    Lv{selectedMember?.level}
                  </Badge>
                </div>
              </div>
            </div>

            {adjustType === 'points' ? (
              <>
                <div className="grid gap-3">
                  <Label className="font-bold text-sm">
                    调整数值{' '}
                    <span className="text-muted-foreground">(当前: {selectedMember?.points})</span>
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="h-10 w-12"
                      onClick={() => setAdjustValue((prev) => String(Number(prev || 0) - 100))}
                    >
                      -100
                    </Button>
                    <Input
                      type="number"
                      value={adjustValue}
                      onChange={(e) => setAdjustValue(e.target.value)}
                      placeholder="正数发放，负数扣减"
                      className="text-center font-bold text-lg h-10"
                    />
                    <Button
                      variant="outline"
                      className="h-10 w-12"
                      onClick={() => setAdjustValue((prev) => String(Number(prev || 0) + 100))}
                    >
                      +100
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="font-bold text-sm">操作备注</Label>
                  <Input
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="如：社群互动奖励、手动补发积分等"
                  />
                </div>
              </>
            ) : (
              <div className="grid gap-3">
                <Label className="font-bold text-sm">目标等级</Label>
                <Select value={adjustValue} onValueChange={setAdjustValue}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Lv1 {levelNames[1]}</SelectItem>
                    <SelectItem value="2">Lv2 {levelNames[2]}</SelectItem>
                    <SelectItem value="3">Lv3 {levelNames[3]}</SelectItem>
                    <SelectItem value="4">Lv4 {levelNames[4]}</SelectItem>
                    <SelectItem value="5">Lv5 {levelNames[5]}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground bg-blue-50 p-2 rounded-lg border border-blue-100">
                  注意：授予低等级不会实际触发降级，仅供手动调整。系统仍会根据积分动态更新会员档位。
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)} className="px-6">
              取消
            </Button>
            <Button onClick={handleSubmitAdjust} className="bg-primary px-8 shadow-md">
              执行调整
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 会员详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>会员资产及记录</DialogTitle>
          </DialogHeader>
          {memberDetail && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-6">
                <div className="relative">
                  {memberDetail.user?.avatar ? (
                    <img
                      src={memberDetail.user.avatar}
                      alt=""
                      className="h-24 w-24 rounded-full border-4 border-white shadow-xl"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-10 w-10 text-muted" />
                    </div>
                  )}
                  <Badge
                    className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${levelColors[memberDetail.level]} shadow-lg pt-1 pb-1`}
                  >
                    Lv{memberDetail.level}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold">
                    {memberDetail.user?.nickname || '新晋会员'}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {levelNames[memberDetail.level]} · ID: {memberDetail.id}
                  </p>
                  <div className="flex gap-4 pt-2">
                    <div className="text-center">
                      <div className="text-xl font-bold">
                        {memberDetail.points.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">当前积分</div>
                    </div>
                    <div className="w-px h-10 bg-border self-center" />
                    <div className="text-center">
                      <div className="text-xl font-bold">
                        {memberDetail.stats?.totalOrders || 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">累计单数</div>
                    </div>
                    <div className="w-px h-10 bg-border self-center" />
                    <div className="text-center">
                      <div className="text-xl font-bold">
                        {formatPrice(memberDetail.stats?.totalAmount || 0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">累计消费</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <ShoppingCart className="h-4 w-4" />
                  <h4 className="font-bold">最近消费记录</h4>
                </div>
                <div className="rounded-xl border border-muted/60 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/5">
                      <TableRow>
                        <TableHead className="text-xs">单号</TableHead>
                        <TableHead className="text-xs">实付</TableHead>
                        <TableHead className="text-xs">状态</TableHead>
                        <TableHead className="text-xs text-right">时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberOrders.slice(0, 5).map((order) => (
                        <TableRow key={order.id} className="text-sm">
                          <TableCell className="font-medium text-xs font-mono">
                            {order.orderNo}
                          </TableCell>
                          <TableCell className="font-bold">
                            {formatPrice(order.payAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {memberOrders.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-muted-foreground py-10 text-sm"
                          >
                            暂无购买记录
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)} className="w-full">
              关闭详情界面
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
