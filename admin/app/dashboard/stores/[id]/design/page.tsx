"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  Save,
  Upload,
  Eye,
  EyeOff,
  Trash2,
  GripVertical,
  Plus,
  RotateCcw,
  Smartphone,
  Image,
  LayoutGrid,
  List,
  Bell,
  Minus,
  ImagePlus,
  Ticket,
  Flame,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import type { PageComponent, PageComponentType, Store } from "@/types"

// 组件图标映射
const COMPONENT_ICONS: Record<PageComponentType, React.ReactNode> = {
  BANNER: <Image className="h-5 w-5" />,
  NAV_GRID: <LayoutGrid className="h-5 w-5" />,
  PRODUCT_LIST: <List className="h-5 w-5" />,
  PRODUCT_GRID: <LayoutGrid className="h-5 w-5" />,
  NOTICE: <Bell className="h-5 w-5" />,
  SPACER: <Minus className="h-5 w-5" />,
  IMAGE: <ImagePlus className="h-5 w-5" />,
  COUPON: <Ticket className="h-5 w-5" />,
  HOT_PRODUCTS: <Flame className="h-5 w-5" />,
  NEW_PRODUCTS: <Sparkles className="h-5 w-5" />,
}

// 组件类型信息
const COMPONENT_TYPES: { value: PageComponentType; label: string }[] = [
  { value: "BANNER", label: "轮播图" },
  { value: "NAV_GRID", label: "金刚区" },
  { value: "NOTICE", label: "公告栏" },
  { value: "HOT_PRODUCTS", label: "热销商品" },
  { value: "NEW_PRODUCTS", label: "新品推荐" },
  { value: "PRODUCT_LIST", label: "商品列表" },
  { value: "PRODUCT_GRID", label: "商品网格" },
  { value: "IMAGE", label: "单图广告" },
  { value: "COUPON", label: "优惠券" },
  { value: "SPACER", label: "分隔符" },
]

// 生成唯一ID
const generateId = () => `comp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// 组件默认配置
const getDefaultProps = (type: PageComponentType): Record<string, unknown> => {
  switch (type) {
    case "BANNER":
      return { autoplay: true, interval: 3000, height: 180 }
    case "NAV_GRID":
      return {
        columns: 4,
        items: [
          { icon: "🍜", text: "热销", link: { type: "category", value: "" } },
          { icon: "🎁", text: "套餐", link: { type: "page", value: "/pages/combos/list" } },
          { icon: "🎫", text: "优惠券", link: { type: "page", value: "/pages/mine/coupons" } },
          { icon: "📋", text: "订单", link: { type: "page", value: "/pages/order/list" } },
        ],
      }
    case "NOTICE":
      return { scrollable: true, speed: 50 }
    case "HOT_PRODUCTS":
      return { limit: 6, showRank: true }
    case "NEW_PRODUCTS":
      return { limit: 4, showBadge: true }
    case "PRODUCT_LIST":
      return { categoryId: null, limit: 10 }
    case "PRODUCT_GRID":
      return { columns: 2, categoryId: null, limit: 8 }
    case "IMAGE":
      return { image: "", height: 120, link: { type: "", value: "" } }
    case "COUPON":
      return { showCount: 3 }
    case "SPACER":
      return { height: 20, backgroundColor: "#f5f5f5" }
    default:
      return {}
  }
}

export default function StoreDesignPage() {
  const params = useParams()
  const router = useRouter()
  const storeId = Number(params.id)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [store, setStore] = useState<Store | null>(null)
  const [components, setComponents] = useState<PageComponent[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)

  // 加载数据
  useEffect(() => {
    loadData()
  }, [storeId])

  const loadData = async () => {
    try {
      const [storeData, configData] = await Promise.all([
        api.getStore(storeId),
        api.getPageConfig({ storeId, pageType: "HOME" }),
      ])
      setStore(storeData)
      setComponents(configData.components || [])
      setIsPublished(configData.isPublished)
    } catch (error) {
      toast.error("加载失败")
    } finally {
      setLoading(false)
    }
  }

  // 选中的组件
  const selectedComponent = components.find((c) => c.id === selectedId)

  // 添加组件
  const addComponent = (type: PageComponentType) => {
    const newComponent: PageComponent = {
      id: generateId(),
      type,
      title: COMPONENT_TYPES.find((t) => t.value === type)?.label || type,
      visible: true,
      props: getDefaultProps(type),
    }
    setComponents([...components, newComponent])
    setSelectedId(newComponent.id)
    setHasChanges(true)
  }

  // 删除组件
  const deleteComponent = (id: string) => {
    setComponents(components.filter((c) => c.id !== id))
    if (selectedId === id) setSelectedId(null)
    setHasChanges(true)
  }

  // 移动组件
  const moveComponent = (id: string, direction: "up" | "down") => {
    const index = components.findIndex((c) => c.id === id)
    if (index === -1) return
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === components.length - 1) return

    const newComponents = [...components]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    ;[newComponents[index], newComponents[targetIndex]] = [
      newComponents[targetIndex],
      newComponents[index],
    ]
    setComponents(newComponents)
    setHasChanges(true)
  }

  // 切换可见性
  const toggleVisibility = (id: string) => {
    setComponents(
      components.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    )
    setHasChanges(true)
  }

  // 更新组件属性
  const updateComponentProps = useCallback(
    (id: string, props: Record<string, unknown>) => {
      setComponents((prev) =>
        prev.map((c) => (c.id === id ? { ...c, props: { ...c.props, ...props } } : c))
      )
      setHasChanges(true)
    },
    []
  )

  // 更新组件标题
  const updateComponentTitle = (id: string, title: string) => {
    setComponents(components.map((c) => (c.id === id ? { ...c, title } : c)))
    setHasChanges(true)
  }

  // 保存配置
  const handleSave = async () => {
    setSaving(true)
    try {
      await api.savePageConfig({ storeId, pageType: "HOME", components })
      setHasChanges(false)
      toast.success("保存成功")
    } catch (error) {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  // 发布配置
  const handlePublish = async () => {
    setSaving(true)
    try {
      if (hasChanges) {
        await api.savePageConfig({ storeId, pageType: "HOME", components })
      }
      await api.publishPageConfig({ storeId, pageType: "HOME" })
      setIsPublished(true)
      setHasChanges(false)
      toast.success("发布成功")
    } catch (error) {
      toast.error("发布失败")
    } finally {
      setSaving(false)
    }
  }

  // 撤销发布
  const handleUnpublish = async () => {
    try {
      await api.unpublishPageConfig({ storeId, pageType: "HOME" })
      setIsPublished(false)
      toast.success("已撤销发布")
    } catch (error) {
      toast.error("操作失败")
    }
  }

  // 重置为默认
  const handleReset = async () => {
    try {
      const result = await api.resetPageConfig({ storeId, pageType: "HOME" })
      setComponents(result.components)
      setIsPublished(false)
      setHasChanges(false)
      setSelectedId(null)
      setShowResetDialog(false)
      toast.success("已重置为默认配置")
    } catch (error) {
      toast.error("重置失败")
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              页面装修 - {store?.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>首页配置</span>
              {isPublished ? (
                <Badge variant="default">已发布</Badge>
              ) : (
                <Badge variant="secondary">草稿</Badge>
              )}
              {hasChanges && <Badge variant="outline">未保存</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            重置
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
          {isPublished ? (
            <Button variant="secondary" onClick={handleUnpublish}>
              撤销发布
            </Button>
          ) : (
            <Button onClick={handlePublish} disabled={saving}>
              <Upload className="mr-2 h-4 w-4" />
              发布
            </Button>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：组件面板 */}
        <div className="w-64 border-r bg-muted/30">
          <div className="p-4">
            <h3 className="font-medium mb-3">添加组件</h3>
            <div className="grid grid-cols-2 gap-2">
              {COMPONENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => addComponent(type.value)}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg border bg-background hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  {COMPONENT_ICONS[type.value]}
                  <span className="text-xs">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 中间：预览区 */}
        <div className="flex-1 bg-muted/50 p-6 overflow-auto">
          <div className="mx-auto w-[375px]">
            {/* 模拟手机框 */}
            <div className="bg-black rounded-[2.5rem] p-3 shadow-xl">
              <div className="bg-white rounded-[2rem] overflow-hidden">
                {/* 状态栏 */}
                <div className="h-6 bg-gray-100 flex items-center justify-center">
                  <div className="w-20 h-1 bg-gray-300 rounded-full" />
                </div>
                {/* 页面内容 */}
                <ScrollArea className="h-[600px]">
                  <div className="min-h-full">
                    {components.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                        <Plus className="h-12 w-12 mb-2" />
                        <p>从左侧添加组件</p>
                      </div>
                    ) : (
                      components.map((comp) => (
                        <div
                          key={comp.id}
                          onClick={() => setSelectedId(comp.id)}
                          className={`relative group cursor-pointer transition-all ${
                            !comp.visible ? "opacity-40" : ""
                          } ${
                            selectedId === comp.id
                              ? "ring-2 ring-primary ring-inset"
                              : "hover:ring-2 hover:ring-primary/50 hover:ring-inset"
                          }`}
                        >
                          {/* 组件预览 */}
                          <ComponentPreview component={comp} />
                          {/* 操作按钮 */}
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                moveComponent(comp.id, "up")
                              }}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                moveComponent(comp.id, "down")
                              }}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleVisibility(comp.id)
                              }}
                            >
                              {comp.visible ? (
                                <Eye className="h-3 w-3" />
                              ) : (
                                <EyeOff className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteComponent(comp.id)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：配置面板 */}
        <div className="w-80 border-l bg-background overflow-auto">
          {selectedComponent ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">组件配置</h3>
                <Badge variant="outline">{selectedComponent.type}</Badge>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>组件标题</Label>
                  <Input
                    value={selectedComponent.title || ""}
                    onChange={(e) =>
                      updateComponentTitle(selectedComponent.id, e.target.value)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>显示组件</Label>
                  <Switch
                    checked={selectedComponent.visible}
                    onCheckedChange={() => toggleVisibility(selectedComponent.id)}
                  />
                </div>
                <Separator />
                {/* 组件特定配置 */}
                <ComponentConfig
                  component={selectedComponent}
                  onUpdate={(props) =>
                    updateComponentProps(selectedComponent.id, props)
                  }
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <GripVertical className="h-8 w-8 mb-2" />
              <p>选择组件进行配置</p>
            </div>
          )}
        </div>
      </div>

      {/* 重置确认对话框 */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要重置吗？</AlertDialogTitle>
            <AlertDialogDescription>
              重置后将恢复为默认配置，当前的修改将会丢失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>确定重置</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// 组件预览
function ComponentPreview({ component }: { component: PageComponent }) {
  const { type, props } = component

  switch (type) {
    case "BANNER":
      return (
        <div
          className="bg-gradient-to-r from-orange-400 to-pink-400"
          style={{ height: (props.height as number) || 180 }}
        >
          <div className="flex items-center justify-center h-full text-white">
            <Image className="h-8 w-8 mr-2" />
            <span>轮播图区域</span>
          </div>
        </div>
      )

    case "NAV_GRID":
      const items = (props.items as { icon: string; text: string }[]) || []
      const columns = (props.columns as number) || 4
      return (
        <div className="p-4 bg-white">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {items.slice(0, 8).map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="text-2xl mb-1">{item.icon}</div>
                <span className="text-xs text-gray-600">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )

    case "NOTICE":
      return (
        <div className="bg-orange-50 px-4 py-2 flex items-center gap-2">
          <Bell className="h-4 w-4 text-orange-500" />
          <span className="text-sm text-orange-700 truncate">
            店内公告信息将在这里滚动显示...
          </span>
        </div>
      )

    case "HOT_PRODUCTS":
    case "NEW_PRODUCTS":
      const limit = (props.limit as number) || 4
      return (
        <div className="p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            {type === "HOT_PRODUCTS" ? (
              <Flame className="h-4 w-4 text-red-500" />
            ) : (
              <Sparkles className="h-4 w-4 text-yellow-500" />
            )}
            <span className="font-medium text-sm">
              {type === "HOT_PRODUCTS" ? "热销推荐" : "新品上市"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array(Math.min(limit, 6))
              .fill(0)
              .map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-lg" />
              ))}
          </div>
        </div>
      )

    case "PRODUCT_LIST":
      return (
        <div className="p-4 bg-white space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-orange-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )

    case "PRODUCT_GRID":
      return (
        <div className="p-4 bg-white">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-square bg-gray-100 rounded-lg" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-orange-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        </div>
      )

    case "IMAGE":
      return (
        <div
          className="bg-gray-200 flex items-center justify-center"
          style={{ height: (props.height as number) || 120 }}
        >
          {props.image ? (
            <img
              src={props.image as string}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-gray-400 mr-2" />
              <span className="text-gray-400">单图广告</span>
            </>
          )}
        </div>
      )

    case "COUPON":
      return (
        <div className="p-4 bg-white">
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-28 h-16 bg-gradient-to-r from-red-500 to-orange-400 rounded-lg flex items-center justify-center text-white text-xs"
              >
                ¥10 优惠券
              </div>
            ))}
          </div>
        </div>
      )

    case "SPACER":
      return (
        <div
          style={{
            height: (props.height as number) || 20,
            backgroundColor: (props.backgroundColor as string) || "#f5f5f5",
          }}
        />
      )

    default:
      return (
        <div className="p-4 bg-gray-100 text-center text-gray-500">
          未知组件: {type}
        </div>
      )
  }
}

// 组件配置面板
function ComponentConfig({
  component,
  onUpdate,
}: {
  component: PageComponent
  onUpdate: (props: Record<string, unknown>) => void
}) {
  const { type, props } = component

  switch (type) {
    case "BANNER":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>自动播放</Label>
            <Switch
              checked={(props.autoplay as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ autoplay: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>切换间隔 (毫秒)</Label>
            <Input
              type="number"
              value={(props.interval as number) || 3000}
              onChange={(e) => onUpdate({ interval: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>高度 (像素)</Label>
            <Slider
              value={[(props.height as number) || 180]}
              onValueChange={([v]) => onUpdate({ height: v })}
              min={100}
              max={300}
              step={10}
            />
            <div className="text-xs text-muted-foreground text-right">
              {(props.height as number) || 180}px
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            轮播图内容在「轮播图管理」中配置
          </p>
        </div>
      )

    case "NAV_GRID":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>每行显示</Label>
            <Select
              value={String((props.columns as number) || 4)}
              onValueChange={(v) => onUpdate({ columns: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3列</SelectItem>
                <SelectItem value="4">4列</SelectItem>
                <SelectItem value="5">5列</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            金刚区图标可在代码中自定义配置
          </p>
        </div>
      )

    case "NOTICE":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>滚动显示</Label>
            <Switch
              checked={(props.scrollable as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ scrollable: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>滚动速度</Label>
            <Slider
              value={[(props.speed as number) || 50]}
              onValueChange={([v]) => onUpdate({ speed: v })}
              min={20}
              max={100}
              step={10}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            公告内容在门店设置中配置
          </p>
        </div>
      )

    case "HOT_PRODUCTS":
    case "NEW_PRODUCTS":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>显示数量</Label>
            <Slider
              value={[(props.limit as number) || 6]}
              onValueChange={([v]) => onUpdate({ limit: v })}
              min={3}
              max={12}
              step={1}
            />
            <div className="text-xs text-muted-foreground text-right">
              {(props.limit as number) || 6} 个商品
            </div>
          </div>
          {type === "HOT_PRODUCTS" && (
            <div className="flex items-center justify-between">
              <Label>显示排行</Label>
              <Switch
                checked={(props.showRank as boolean) ?? true}
                onCheckedChange={(v) => onUpdate({ showRank: v })}
              />
            </div>
          )}
          {type === "NEW_PRODUCTS" && (
            <div className="flex items-center justify-between">
              <Label>显示新品标签</Label>
              <Switch
                checked={(props.showBadge as boolean) ?? true}
                onCheckedChange={(v) => onUpdate({ showBadge: v })}
              />
            </div>
          )}
        </div>
      )

    case "IMAGE":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>图片高度 (像素)</Label>
            <Slider
              value={[(props.height as number) || 120]}
              onValueChange={([v]) => onUpdate({ height: v })}
              min={60}
              max={200}
              step={10}
            />
            <div className="text-xs text-muted-foreground text-right">
              {(props.height as number) || 120}px
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            图片可在组件中直接上传配置
          </p>
        </div>
      )

    case "SPACER":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>留白高度 (像素)</Label>
            <Slider
              value={[(props.height as number) || 20]}
              onValueChange={([v]) => onUpdate({ height: v })}
              min={10}
              max={100}
              step={5}
            />
            <div className="text-xs text-muted-foreground text-right">
              {(props.height as number) || 20}px
            </div>
          </div>
          <div className="space-y-2">
            <Label>背景颜色</Label>
            <div className="flex gap-2">
              {["#f5f5f5", "#ffffff", "#fff5f5", "#f5f5ff"].map((color) => (
                <button
                  key={color}
                  onClick={() => onUpdate({ backgroundColor: color })}
                  className={`w-8 h-8 rounded border-2 ${
                    props.backgroundColor === color
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      )

    case "COUPON":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>显示数量</Label>
            <Slider
              value={[(props.showCount as number) || 3]}
              onValueChange={([v]) => onUpdate({ showCount: v })}
              min={2}
              max={5}
              step={1}
            />
            <div className="text-xs text-muted-foreground text-right">
              {(props.showCount as number) || 3} 张
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            优惠券在「优惠券管理」中配置
          </p>
        </div>
      )

    default:
      return (
        <p className="text-sm text-muted-foreground">该组件暂无可配置项</p>
      )
  }
}
