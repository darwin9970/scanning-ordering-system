'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  DragOverlay,
  useDroppable,
  useDraggable
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Save,
  Upload,
  Trash2,
  GripVertical,
  Plus,
  RotateCcw,
  Smartphone,
  Home,
  Menu,
  User,
  Navigation,
  Undo2,
  Redo2,
  Download,
  FileUp,
  LayoutTemplate,
  Box
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type {
  PageComponent,
  PageComponentType,
  PageType,
  ComponentCategory,
  Store as StoreType
} from '@/types'
import { useComponents } from './hooks/useComponents'
import { usePageConfig } from './hooks/usePageConfig'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import {
  PAGE_TYPES,
  SUB_TABS,
  COMPONENT_TYPES,
  COMPONENT_ICONS,
  CATEGORY_LABELS,
  TEMPLATES,
  generateId,
  getDefaultProps,
  getDefaultSize,
  CANVAS_WIDTH
} from './constants'
import {
  SortableItem,
  ComponentConfig,
  ComponentPreview,
  DraggableComponentItem,
  FreeCanvas
} from './components'

export default function StoreDesignPage() {
  const params = useParams()
  const router = useRouter()
  const storeId = Number(params.id)

  // 使用 useComponents hook 管理组件状态
  const {
    components,
    setComponents,
    selectedId,
    selectedComponent,
    hasChanges,
    canUndo,
    canRedo,
    hasClipboard,
    addComponent,
    deleteComponent,
    toggleVisibility,
    updateProps,
    updateTitle,
    updateComponent,
    moveComponent,
    setAllComponents,
    selectComponent: setSelectedId,
    pushHistory,
    undo,
    redo,
    resetChanges,
    markChanged,
    // 新增功能
    toggleLock,
    copyComponent,
    pasteComponent,
    duplicateComponent,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    nudgeComponent,
    resizeComponent,
    startResize
  } = useComponents()

  // 兼容性函数：用于非组件相关的修改（TabBar, 页面设置等）
  const setHasChanges = (value: boolean) => {
    if (value) markChanged()
    else resetChanges()
  }

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [store, setStore] = useState<StoreType | null>(null)
  const [currentPage, setCurrentPage] = useState<string>('HOME')
  const [isPublished, setIsPublished] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)

  // TabBar配置
  const [tabBarConfig, setTabBarConfig] = useState<{
    color: string
    selectedColor: string
    backgroundColor: string
    borderStyle: 'black' | 'white'
    list: { pagePath: string; text: string; iconPath: string; selectedIconPath: string }[]
  }>({
    color: '#999999',
    selectedColor: '#ff6b35',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/home',
        text: '首页',
        iconPath: '/static/tabbar/home.png',
        selectedIconPath: '/static/tabbar/home-active.png'
      },
      {
        pagePath: 'pages/menu/menu',
        text: '点餐',
        iconPath: '/static/tabbar/menu.png',
        selectedIconPath: '/static/tabbar/menu-active.png'
      },
      {
        pagePath: 'pages/order/list',
        text: '订单',
        iconPath: '/static/tabbar/order.png',
        selectedIconPath: '/static/tabbar/order-active.png'
      },
      {
        pagePath: 'pages/mine/mine',
        text: '我的',
        iconPath: '/static/tabbar/mine.png',
        selectedIconPath: '/static/tabbar/mine-active.png'
      }
    ]
  })

  // 子Tab配置
  const [currentSubTab, setCurrentSubTab] = useState<string>('main')
  const currentSubTabs = SUB_TABS[currentPage] || []
  const hasSubTabs = currentSubTabs.length > 1

  // 页面设置
  const [pageSettings, setPageSettings] = useState({
    title: '',
    navBgColor: '#ffffff',
    navTextColor: 'black' as 'white' | 'black',
    pageBgColor: '#f5f5f5',
    hideNav: false
  })

  // 全局配置
  const [globalConfig, setGlobalConfig] = useState({
    themeColor: '#ff6b35',
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 'rounded' as 'none' | 'rounded' | 'large' | 'custom',
    customRadius: 8,
    shadow: true
  })

  // 配置面板Tab
  const [configTab, setConfigTab] = useState<'component' | 'page' | 'global'>('component')

  // 拖拽状态
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragType, setDragType] = useState<'new' | 'sort' | null>(null)
  const [insertIndex, setInsertIndex] = useState<number | null>(null)

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // 拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    setActiveId(id)
    // 判断是新增组件拖拽还是排序拖拽
    if (id.startsWith('new-')) {
      setDragType('new')
      setInsertIndex(components.length) // 默认插入到末尾
    } else {
      setDragType('sort')
    }
  }

  // 拖拽过程中 - 计算插入位置
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event

    if (dragType === 'new' && over) {
      // 如果悬停在现有组件上，计算插入位置
      if (over.id !== 'preview-area') {
        const overIndex = components.findIndex((c) => c.id === over.id)
        if (overIndex !== -1) {
          setInsertIndex(overIndex)
        }
      } else if (over.id === 'preview-area') {
        // 悬停在空白区域，插入到末尾
        setInsertIndex(components.length)
      }
    }
  }

  // 拖拽结束处理（自由画布模式）
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event

    // 从组件面板拖拽新增
    if (dragType === 'new' && over) {
      const isValidDrop = over.id === 'preview-area' || components.some((c) => c.id === over.id)
      if (isValidDrop) {
        const componentType = String(active.id).replace('new-', '') as PageComponentType
        addComponent(componentType)
      }
    }
    // 自由拖拽移动现有组件
    else if (dragType === 'sort' && delta) {
      const compId = String(active.id)
      moveComponent(compId, delta.x, delta.y)
    }

    setActiveId(null)
    setDragType(null)
    setInsertIndex(null)
  }

  // 快捷键支持
  useKeyboardShortcuts({
    selectedId,
    onDelete: () => selectedId && deleteComponent(selectedId),
    onCopy: () => selectedId && copyComponent(selectedId),
    onPaste: pasteComponent,
    onDuplicate: () => selectedId && duplicateComponent(selectedId),
    onUndo: undo,
    onRedo: redo,
    onSelectAll: () => {
      // 暂不支持全选
    },
    onDeselect: () => setSelectedId(null),
    onBringForward: () => selectedId && bringForward(selectedId),
    onSendBackward: () => selectedId && sendBackward(selectedId),
    onBringToFront: () => selectedId && bringToFront(selectedId),
    onSendToBack: () => selectedId && sendToBack(selectedId),
    onToggleLock: () => selectedId && toggleLock(selectedId),
    onMoveUp: () => selectedId && nudgeComponent(selectedId, 'up', 1),
    onMoveDown: () => selectedId && nudgeComponent(selectedId, 'down', 1),
    onMoveLeft: () => selectedId && nudgeComponent(selectedId, 'left', 1),
    onMoveRight: () => selectedId && nudgeComponent(selectedId, 'right', 1),
    enabled: true
  })

  // 加载数据
  useEffect(() => {
    loadData()
  }, [storeId, currentPage])

  const loadData = async () => {
    try {
      const [storeData, configData] = await Promise.all([
        api.getStore(storeId),
        api.getPageConfig({ storeId, pageType: currentPage })
      ])
      setStore(storeData)
      // 如果返回的是预设配置（isDefault: true），显示提示
      if (configData.isDefault && configData.components && configData.components.length > 0) {
        toast.info('已加载预设的精美布局，您可以在此基础上进行修改', { duration: 4000 })
      }
      setComponents(configData.components || [])
      setIsPublished(configData.isPublished || false)
      setSelectedId(null)
    } catch (error) {
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 选中的组件
  // 导出配置
  const handleExport = () => {
    const data = {
      pageType: currentPage,
      storeId,
      components,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `page-config-${currentPage.toLowerCase()}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('配置已导出')
  }

  // 导入配置
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (data.components && Array.isArray(data.components)) {
          pushHistory(components)
          setComponents(data.components)
          setHasChanges(true)
          toast.success(`成功导入 ${data.components.length} 个组件`)
        } else {
          toast.error('无效的配置文件格式')
        }
      } catch {
        toast.error('解析配置文件失败')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  // 预设模板
  const TEMPLATES = [
    {
      id: 'simple-home',
      name: '简约首页',
      category: '茶饮',
      thumbnail: '🏠',
      components: [
        {
          id: 't1',
          type: 'BANNER',
          title: '轮播图',
          visible: true,
          props: { autoplay: true, interval: 3000, height: 180 }
        },
        {
          id: 't2',
          type: 'SEARCH',
          title: '搜索',
          visible: true,
          props: { placeholder: '搜索商品', bgColor: '#f5f5f5' }
        },
        {
          id: 't3',
          type: 'NAV_GRID',
          title: '导航',
          visible: true,
          props: {
            columns: 4,
            items: [
              { icon: '🍵', text: '茶饮', link: { type: 'page', value: '' } },
              { icon: '🧋', text: '奶茶', link: { type: 'page', value: '' } },
              { icon: '🎁', text: '套餐', link: { type: 'page', value: '' } },
              { icon: '🎫', text: '优惠券', link: { type: 'page', value: '' } }
            ]
          }
        },
        {
          id: 't4',
          type: 'HOT_PRODUCTS',
          title: '热销推荐',
          visible: true,
          props: { limit: 6, showRank: true }
        }
      ]
    },
    {
      id: 'promo-home',
      name: '促销首页',
      category: '快餐',
      thumbnail: '🎉',
      components: [
        {
          id: 'p1',
          type: 'BANNER',
          title: '活动Banner',
          visible: true,
          props: { autoplay: true, interval: 2500, height: 200 }
        },
        {
          id: 'p2',
          type: 'NOTICE',
          title: '公告',
          visible: true,
          props: { scrollable: true, speed: 50 }
        },
        { id: 'p3', type: 'COUPON', title: '优惠券', visible: true, props: { showCount: 3 } },
        {
          id: 'p4',
          type: 'FOCUS_ENTRY',
          title: '焦点入口',
          visible: true,
          props: { text: '限时特惠', icon: '⚡', bgColor: '#ff6b35' }
        },
        {
          id: 'p5',
          type: 'HOT_PRODUCTS',
          title: '爆款推荐',
          visible: true,
          props: { limit: 8, showRank: true }
        },
        {
          id: 'p6',
          type: 'NEW_PRODUCTS',
          title: '新品上市',
          visible: true,
          props: { limit: 4, showBadge: true }
        }
      ]
    },
    {
      id: 'minimal-menu',
      name: '极简点餐',
      category: '咖啡',
      thumbnail: '☕',
      components: [
        {
          id: 'm1',
          type: 'STORE_TITLE',
          title: '门店标题',
          visible: true,
          props: { showDistance: true, showStatus: true }
        },
        {
          id: 'm2',
          type: 'ORDER_COMPONENT',
          title: '点单组件',
          visible: true,
          props: { categoryStyle: 'left', productStyle: 'list', showSales: true }
        },
        {
          id: 'm3',
          type: 'CART_FLOAT',
          title: '购物车',
          visible: true,
          props: { position: 'right-bottom', showCount: true }
        }
      ]
    },
    {
      id: 'member-center',
      name: '会员中心',
      category: '通用',
      thumbnail: '👤',
      components: [
        {
          id: 'u1',
          type: 'USER_INFO',
          title: '会员信息',
          visible: true,
          props: {
            showAvatar: true,
            showNickname: true,
            showBalance: true,
            showPoints: true,
            showCoupons: true
          }
        },
        {
          id: 'u2',
          type: 'FUNC_ENTRY',
          title: '功能入口',
          visible: true,
          props: {
            columns: 4,
            items: [
              { icon: '📋', text: '我的订单', link: { type: 'page', value: '' } },
              { icon: '🎫', text: '优惠券', link: { type: 'page', value: '' } },
              { icon: '💰', text: '余额', link: { type: 'page', value: '' } },
              { icon: '⚙️', text: '设置', link: { type: 'page', value: '' } }
            ]
          }
        },
        {
          id: 'u3',
          type: 'STAMP_CARD',
          title: '集点卡',
          visible: true,
          props: { title: '集点送好礼', total: 10, current: 3 }
        },
        {
          id: 'u4',
          type: 'BANNER',
          title: '推荐活动',
          visible: true,
          props: { autoplay: true, height: 120 }
        }
      ]
    },
    {
      id: 'recharge-page',
      name: '充值页面',
      category: '通用',
      thumbnail: '💳',
      components: [
        {
          id: 'r1',
          type: 'BALANCE_ENTRY',
          title: '余额显示',
          visible: true,
          props: { showBalance: true }
        },
        {
          id: 'r2',
          type: 'RECHARGE_OPTIONS',
          title: '充值选项',
          visible: true,
          props: {
            columns: 2,
            items: [
              { amount: 50, gift: 5, giftType: 'balance' },
              { amount: 100, gift: 15, giftType: 'balance' },
              { amount: 200, gift: 40, giftType: 'balance' },
              { amount: 500, gift: 120, giftType: 'balance' }
            ]
          }
        },
        {
          id: 'r3',
          type: 'RECHARGE_BUTTON',
          title: '充值按钮',
          visible: true,
          props: { text: '立即充值', bgColor: '#ff6b35' }
        },
        {
          id: 'r4',
          type: 'TEXT',
          title: '充值说明',
          visible: true,
          props: {
            content: '充值即表示同意《储值协议》',
            fontSize: 12,
            color: '#999',
            align: 'center'
          }
        }
      ]
    }
  ]

  // 应用模板
  const applyTemplate = (template: (typeof TEMPLATES)[0]) => {
    pushHistory(components)
    // 为每个组件生成新ID
    const newComponents = template.components.map((c) => ({
      ...c,
      id: generateId()
    })) as PageComponent[]
    setAllComponents(newComponents)
    setShowTemplateDialog(false)
    toast.success(`已应用模板：${template.name}`)
  }

  // 保存配置
  const handleSave = async () => {
    setSaving(true)
    try {
      await api.savePageConfig({ storeId, pageType: currentPage, components })
      resetChanges()
      toast.success('保存成功')
    } catch (error) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 发布配置
  const handlePublish = async () => {
    setSaving(true)
    try {
      if (hasChanges) {
        await api.savePageConfig({ storeId, pageType: currentPage, components })
      }
      await api.publishPageConfig({ storeId, pageType: currentPage })
      setIsPublished(true)
      setHasChanges(false)
      toast.success('发布成功')
    } catch (error) {
      toast.error('发布失败')
    } finally {
      setSaving(false)
    }
  }

  // 撤销发布
  const handleUnpublish = async () => {
    try {
      await api.unpublishPageConfig({ storeId, pageType: currentPage })
      setIsPublished(false)
      toast.success('已撤销发布')
    } catch (error) {
      toast.error('操作失败')
    }
  }

  // 重置为默认
  const handleReset = async () => {
    try {
      const result = await api.resetPageConfig({ storeId, pageType: currentPage })
      setComponents(result.components)
      setIsPublished(false)
      setHasChanges(false)
      setSelectedId(null)
      setShowResetDialog(false)
      toast.success('已重置为默认配置')
    } catch (error) {
      toast.error('重置失败')
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
              {/* 页面切换（10个Tab，支持滚动） */}
              <div className="flex bg-muted rounded-lg p-1 overflow-x-auto max-w-[600px]">
                {PAGE_TYPES.map((page) => {
                  const Icon = page.icon
                  return (
                    <button
                      key={page.value}
                      onClick={() => {
                        if (hasChanges) {
                          toast.error('请先保存当前页面配置')
                          return
                        }
                        setCurrentPage(page.value)
                        setCurrentSubTab('main') // 切换页面时重置子Tab
                      }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap ${
                        currentPage === page.value
                          ? 'bg-background shadow text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {page.label}
                    </button>
                  )
                })}
              </div>

              {/* 子Tab切换 */}
              {hasSubTabs && (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                  {currentSubTabs.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setCurrentSubTab(sub.id)}
                      title={sub.description}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        currentSubTab === sub.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}

              {isPublished ? (
                <Badge variant="default">已发布</Badge>
              ) : (
                <Badge variant="secondary">草稿</Badge>
              )}
              {hasChanges && <Badge variant="outline">未保存</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* 撤销/重做 */}
          <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} title="撤销">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} title="重做">
            <Redo2 className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* 模板库 */}
          <Button variant="ghost" size="sm" onClick={() => setShowTemplateDialog(true)}>
            <LayoutTemplate className="mr-1 h-4 w-4" />
            模板
          </Button>

          {/* 导入导出 */}
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download className="mr-1 h-4 w-4" />
            导出
          </Button>
          <label className="cursor-pointer">
            <Button variant="ghost" size="sm" asChild>
              <span>
                <FileUp className="mr-1 h-4 w-4" />
                导入
              </span>
            </Button>
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="mr-1 h-4 w-4" />
            重置
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="mr-1 h-4 w-4" />
            保存
          </Button>
          {isPublished ? (
            <Button variant="secondary" size="sm" onClick={handleUnpublish}>
              撤销发布
            </Button>
          ) : (
            <Button size="sm" onClick={handlePublish} disabled={saving}>
              <Upload className="mr-1 h-4 w-4" />
              发布
            </Button>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* TABBAR专属配置界面 */}
        {currentPage === 'TABBAR' ? (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  底部导航配置
                </h3>

                {/* 颜色配置 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label className="text-sm">默认颜色</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tabBarConfig.color}
                        onChange={(e) => {
                          setTabBarConfig((prev) => ({ ...prev, color: e.target.value }))
                          setHasChanges(true)
                        }}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={tabBarConfig.color}
                        onChange={(e) => {
                          setTabBarConfig((prev) => ({ ...prev, color: e.target.value }))
                          setHasChanges(true)
                        }}
                        className="flex-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">选中颜色</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tabBarConfig.selectedColor}
                        onChange={(e) => {
                          setTabBarConfig((prev) => ({ ...prev, selectedColor: e.target.value }))
                          setHasChanges(true)
                        }}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={tabBarConfig.selectedColor}
                        onChange={(e) => {
                          setTabBarConfig((prev) => ({ ...prev, selectedColor: e.target.value }))
                          setHasChanges(true)
                        }}
                        className="flex-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">背景色</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tabBarConfig.backgroundColor}
                        onChange={(e) => {
                          setTabBarConfig((prev) => ({ ...prev, backgroundColor: e.target.value }))
                          setHasChanges(true)
                        }}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={tabBarConfig.backgroundColor}
                        onChange={(e) => {
                          setTabBarConfig((prev) => ({ ...prev, backgroundColor: e.target.value }))
                          setHasChanges(true)
                        }}
                        className="flex-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">边框样式</Label>
                    <Select
                      value={tabBarConfig.borderStyle}
                      onValueChange={(v: 'black' | 'white') => {
                        setTabBarConfig((prev) => ({ ...prev, borderStyle: v }))
                        setHasChanges(true)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="black">黑色</SelectItem>
                        <SelectItem value="white">白色</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* TabBar项目列表 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>导航项目 ({tabBarConfig.list.length}/5)</Label>
                    {tabBarConfig.list.length < 5 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTabBarConfig((prev) => ({
                            ...prev,
                            list: [
                              ...prev.list,
                              {
                                pagePath: '',
                                text: '新标签',
                                iconPath: '/static/tabbar/default.png',
                                selectedIconPath: '/static/tabbar/default-active.png'
                              }
                            ]
                          }))
                          setHasChanges(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        添加
                      </Button>
                    )}
                  </div>

                  {tabBarConfig.list.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center text-2xl">
                        {item.text === '首页' && '🏠'}
                        {item.text === '点餐' && '🍽️'}
                        {item.text === '订单' && '📋'}
                        {item.text === '我的' && '👤'}
                        {!['首页', '点餐', '订单', '我的'].includes(item.text) && '📱'}
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          placeholder="标签名称"
                          value={item.text}
                          onChange={(e) => {
                            const newList = [...tabBarConfig.list]
                            newList[index].text = e.target.value
                            setTabBarConfig((prev) => ({ ...prev, list: newList }))
                            setHasChanges(true)
                          }}
                        />
                        <Input
                          placeholder="页面路径"
                          value={item.pagePath}
                          onChange={(e) => {
                            const newList = [...tabBarConfig.list]
                            newList[index].pagePath = e.target.value
                            setTabBarConfig((prev) => ({ ...prev, list: newList }))
                            setHasChanges(true)
                          }}
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const newList = tabBarConfig.list.filter((_, i) => i !== index)
                          setTabBarConfig((prev) => ({ ...prev, list: newList }))
                          setHasChanges(true)
                        }}
                        disabled={tabBarConfig.list.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 预览 */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold mb-4">预览效果</h3>
                <div className="flex justify-center">
                  <div
                    className="flex items-center justify-around py-2 px-4 rounded-lg shadow-lg w-[375px]"
                    style={{
                      backgroundColor: tabBarConfig.backgroundColor,
                      borderTop: `1px solid ${tabBarConfig.borderStyle === 'black' ? '#e5e5e5' : '#333'}`
                    }}
                  >
                    {tabBarConfig.list.map((item, index) => (
                      <div key={index} className="flex flex-col items-center gap-1 py-1">
                        <div className="w-6 h-6 bg-slate-200 rounded" />
                        <span
                          className="text-xs"
                          style={{
                            color: index === 0 ? tabBarConfig.selectedColor : tabBarConfig.color
                          }}
                        >
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <>
              {/* 左侧：组件面板 */}
              <div className="w-80 border-r bg-muted/30 overflow-auto">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <h3 className="font-medium mb-1">添加组件</h3>
                    <p className="text-xs text-muted-foreground mb-3">拖拽组件到预览区或点击添加</p>
                    {(
                      [
                        'simple',
                        'standard',
                        'container',
                        'element',
                        'special'
                      ] as ComponentCategory[]
                    ).map((category) => {
                      const categoryComponents = COMPONENT_TYPES.filter((c) => {
                        if (c.category !== category) return false
                        // 过滤掉当前页面不可用的专属组件
                        if (c.availableIn && !c.availableIn.includes(currentPage as PageType))
                          return false
                        return true
                      })
                      if (categoryComponents.length === 0) return null
                      return (
                        <div key={category} className="mb-4">
                          <h4 className="text-xs font-medium text-muted-foreground mb-2">
                            {CATEGORY_LABELS[category]}
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {categoryComponents.map((type) => (
                              <DraggableComponentItem
                                key={type.value}
                                type={type.value}
                                label={type.label}
                                onAdd={() => addComponent(type.value)}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* 中间：预览区 */}
              <div className="flex-1 bg-gradient-to-br from-slate-100 to-slate-200 p-6 overflow-auto flex items-start justify-center">
                <div className="relative">
                  {/* iPhone 外框 */}
                  <div className="relative bg-[#1a1a1a] rounded-[3rem] p-[14px] shadow-2xl">
                    {/* 左侧按钮 */}
                    <div className="absolute left-[-2px] top-[120px] w-[3px] h-[30px] bg-[#1a1a1a] rounded-l-sm" />
                    <div className="absolute left-[-2px] top-[170px] w-[3px] h-[60px] bg-[#1a1a1a] rounded-l-sm" />
                    <div className="absolute left-[-2px] top-[240px] w-[3px] h-[60px] bg-[#1a1a1a] rounded-l-sm" />
                    {/* 右侧按钮 */}
                    <div className="absolute right-[-2px] top-[180px] w-[3px] h-[80px] bg-[#1a1a1a] rounded-r-sm" />

                    {/* 屏幕区域 */}
                    <div className="relative w-[375px] h-[750px] bg-white rounded-[2.4rem] overflow-hidden">
                      {/* 灵动岛 */}
                      <div className="absolute top-[12px] left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-full z-20" />

                      {/* 状态栏 */}
                      <div className="relative h-[54px] bg-white flex items-end justify-between px-8 pb-1 z-10">
                        <span className="text-[14px] font-semibold">9:41</span>
                        <div className="flex items-center gap-1">
                          <svg className="w-[18px] h-[12px]" viewBox="0 0 18 12">
                            <path
                              d="M1 4.5C1 3.67 1.67 3 2.5 3h2C5.33 3 6 3.67 6 4.5v3C6 8.33 5.33 9 4.5 9h-2C1.67 9 1 8.33 1 7.5v-3zM7 3.5C7 2.67 7.67 2 8.5 2h2C11.33 2 12 2.67 12 3.5v4c0 .83-.67 1.5-1.5 1.5h-2C7.67 8 7 7.33 7 6.5v-3zM13 2.5c0-.83.67-1.5 1.5-1.5h2c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5h-2c-.83 0-1.5-.67-1.5-1.5v-5z"
                              fill="currentColor"
                            />
                          </svg>
                          <svg className="w-[16px] h-[12px]" viewBox="0 0 16 12">
                            <path
                              d="M8.5 1C6.57 1 4.81 1.71 3.46 2.9L2 1.41V6h4.59L5.17 4.55C6.13 3.69 7.25 3.14 8.5 3.14c2.55 0 4.67 1.84 5.13 4.27l1.94-.49C15.01 3.63 12.06 1 8.5 1z"
                              fill="currentColor"
                            />
                          </svg>
                          <div className="flex items-center">
                            <div className="w-[25px] h-[12px] border border-current rounded-[3px] relative">
                              <div className="absolute inset-[2px] right-[4px] bg-current rounded-[1px]" />
                            </div>
                            <div className="w-[2px] h-[5px] bg-current rounded-r-sm ml-[1px]" />
                          </div>
                        </div>
                      </div>

                      {/* 页面内容 - 减去状态栏和底部 TabBar */}
                      <ScrollArea className="h-[612px]">
                        {/* 子Tab特殊配置界面 */}
                        {currentSubTab === 'loading' && (
                          <div className="min-h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-primary/20 to-primary/5">
                            <div className="w-24 h-24 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
                              <span className="text-4xl">☕</span>
                            </div>
                            <div className="text-center space-y-2">
                              <h3 className="font-semibold text-lg">加载中...</h3>
                              <p className="text-sm text-muted-foreground">正在为您准备精彩内容</p>
                            </div>
                            <div className="mt-8 w-48 h-1 bg-slate-200 rounded overflow-hidden">
                              <div className="h-full w-1/2 bg-primary rounded animate-pulse" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-8">
                              此页面在首次进入时展示，可配置Logo和加载动画
                            </p>
                          </div>
                        )}

                        {currentSubTab === 'coupon_popup' && (
                          <div className="min-h-full bg-black/50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl w-full max-w-[320px] overflow-hidden shadow-2xl">
                              <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4 text-white text-center">
                                <h3 className="font-bold text-lg">🎁 新人专享福利</h3>
                                <p className="text-sm opacity-90">首单立减，限时领取</p>
                              </div>
                              <div className="p-4 space-y-3">
                                {[
                                  { amount: 10, condition: '满30可用', tag: '新人券' },
                                  { amount: 5, condition: '满20可用', tag: '无门槛' }
                                ].map((coupon, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center border rounded-lg overflow-hidden"
                                  >
                                    <div className="bg-red-50 text-red-500 p-3 text-center min-w-[80px]">
                                      <span className="text-xs">¥</span>
                                      <span className="text-2xl font-bold">{coupon.amount}</span>
                                    </div>
                                    <div className="flex-1 p-2">
                                      <div className="text-xs text-orange-500 mb-1">
                                        {coupon.tag}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {coupon.condition}
                                      </div>
                                    </div>
                                    <button className="px-3 py-1 mr-2 text-xs bg-red-500 text-white rounded">
                                      领取
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="p-3 text-center border-t">
                                <button className="text-sm text-muted-foreground">关闭</button>
                              </div>
                            </div>
                          </div>
                        )}

                        {currentSubTab === 'dining_mode' && (
                          <div className="min-h-full bg-black/50 flex items-end">
                            <div className="bg-white w-full rounded-t-2xl overflow-hidden">
                              <div className="p-4 text-center border-b">
                                <h3 className="font-semibold">请选择就餐方式</h3>
                              </div>
                              <div className="p-4 grid grid-cols-3 gap-3">
                                {[
                                  { icon: '🍽️', label: '堂食', desc: '在店内用餐' },
                                  { icon: '🥡', label: '自取', desc: '打包带走' },
                                  { icon: '🛵', label: '外卖', desc: '配送到家' }
                                ].map((mode, i) => (
                                  <button
                                    key={i}
                                    className={`p-4 rounded-xl border-2 text-center transition-colors ${
                                      i === 0
                                        ? 'border-primary bg-primary/5'
                                        : 'border-transparent bg-slate-50'
                                    }`}
                                  >
                                    <div className="text-3xl mb-2">{mode.icon}</div>
                                    <div className="font-medium text-sm">{mode.label}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {mode.desc}
                                    </div>
                                  </button>
                                ))}
                              </div>
                              <div className="p-4 border-t">
                                <button className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium">
                                  确认选择
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 主页面内容 - 自由画布模式 */}
                        {currentSubTab === 'main' && (
                          <FreeCanvas
                            components={components}
                            selectedId={selectedId}
                            setSelectedId={(id) => {
                              setSelectedId(id)
                              if (id) setConfigTab('component')
                            }}
                            deleteComponent={deleteComponent}
                            toggleVisibility={toggleVisibility}
                            toggleLock={toggleLock}
                            isDraggingNew={dragType === 'new'}
                            activeId={activeId}
                            updateComponent={updateComponent}
                            startResize={startResize}
                            copyComponent={copyComponent}
                            pasteComponent={pasteComponent}
                            duplicateComponent={duplicateComponent}
                            bringForward={bringForward}
                            sendBackward={sendBackward}
                            bringToFront={bringToFront}
                            sendToBack={sendToBack}
                            hasClipboard={hasClipboard}
                          />
                        )}
                      </ScrollArea>

                      {/* 底部 TabBar 预览 */}
                      <div className="absolute bottom-0 left-0 right-0 h-[84px] bg-white border-t flex items-center justify-around px-4 rounded-b-[2.4rem]">
                        {[
                          { icon: Home, label: '首页', active: currentPage === 'HOME' },
                          { icon: Menu, label: '菜单', active: currentPage === 'MENU' },
                          { icon: User, label: '我的', active: currentPage === 'MINE' }
                        ].map((tab, i) => (
                          <div
                            key={i}
                            className={`flex flex-col items-center gap-1 ${tab.active ? 'text-orange-500' : 'text-gray-400'}`}
                          >
                            <tab.icon className="h-6 w-6" />
                            <span className="text-[10px]">{tab.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* 底部 Home 指示条 */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-black rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧：配置面板 */}
              <div className="w-80 border-l bg-background flex flex-col">
                {/* 配置面板Tab切换 */}
                <div className="flex border-b">
                  <button
                    onClick={() => setConfigTab('component')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      configTab === 'component'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    组件
                  </button>
                  <button
                    onClick={() => setConfigTab('page')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      configTab === 'page'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    页面
                  </button>
                  <button
                    onClick={() => setConfigTab('global')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      configTab === 'global'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    全局
                  </button>
                </div>

                <ScrollArea className="flex-1">
                  {/* 组件配置 */}
                  {configTab === 'component' &&
                    (selectedComponent ? (
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
                              value={selectedComponent.title || ''}
                              onChange={(e) => updateTitle(selectedComponent.id, e.target.value)}
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
                          <ComponentConfig
                            component={selectedComponent}
                            onUpdate={(props) => updateProps(selectedComponent.id, props)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                        <GripVertical className="h-8 w-8 mb-2" />
                        <p>选择组件进行配置</p>
                      </div>
                    ))}

                  {/* 页面设置 */}
                  {configTab === 'page' && (
                    <div className="p-4 space-y-4">
                      <h3 className="font-medium">页面设置</h3>
                      <Separator />

                      <div className="space-y-2">
                        <Label>页面标题</Label>
                        <Input
                          placeholder="小程序页面标题"
                          value={pageSettings.title}
                          onChange={(e) => {
                            setPageSettings((prev) => ({ ...prev, title: e.target.value }))
                            setHasChanges(true)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>导航背景色</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={pageSettings.navBgColor}
                            onChange={(e) => {
                              setPageSettings((prev) => ({ ...prev, navBgColor: e.target.value }))
                              setHasChanges(true)
                            }}
                            className="w-10 h-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={pageSettings.navBgColor}
                            onChange={(e) => {
                              setPageSettings((prev) => ({ ...prev, navBgColor: e.target.value }))
                              setHasChanges(true)
                            }}
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>导航标题颜色</Label>
                        <Select
                          value={pageSettings.navTextColor}
                          onValueChange={(v: 'white' | 'black') => {
                            setPageSettings((prev) => ({ ...prev, navTextColor: v }))
                            setHasChanges(true)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="black">黑色</SelectItem>
                            <SelectItem value="white">白色</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>页面背景色</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={pageSettings.pageBgColor}
                            onChange={(e) => {
                              setPageSettings((prev) => ({ ...prev, pageBgColor: e.target.value }))
                              setHasChanges(true)
                            }}
                            className="w-10 h-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={pageSettings.pageBgColor}
                            onChange={(e) => {
                              setPageSettings((prev) => ({ ...prev, pageBgColor: e.target.value }))
                              setHasChanges(true)
                            }}
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>隐藏导航栏</Label>
                        <Switch
                          checked={pageSettings.hideNav}
                          onCheckedChange={(v) => {
                            setPageSettings((prev) => ({ ...prev, hideNav: v }))
                            setHasChanges(true)
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 全局配置 */}
                  {configTab === 'global' && (
                    <div className="p-4 space-y-4">
                      <h3 className="font-medium">全局配置</h3>
                      <Separator />

                      <div className="space-y-2">
                        <Label>主题颜色</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={globalConfig.themeColor}
                            onChange={(e) => {
                              setGlobalConfig((prev) => ({ ...prev, themeColor: e.target.value }))
                              setHasChanges(true)
                            }}
                            className="w-10 h-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={globalConfig.themeColor}
                            onChange={(e) => {
                              setGlobalConfig((prev) => ({ ...prev, themeColor: e.target.value }))
                              setHasChanges(true)
                            }}
                            className="flex-1"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">应用于按钮、选中状态等</p>
                      </div>

                      <div className="space-y-2">
                        <Label>页面边距</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">左边距</Label>
                            <Input
                              type="number"
                              min={0}
                              max={50}
                              value={globalConfig.paddingLeft}
                              onChange={(e) => {
                                setGlobalConfig((prev) => ({
                                  ...prev,
                                  paddingLeft: Number(e.target.value)
                                }))
                                setHasChanges(true)
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">右边距</Label>
                            <Input
                              type="number"
                              min={0}
                              max={50}
                              value={globalConfig.paddingRight}
                              onChange={(e) => {
                                setGlobalConfig((prev) => ({
                                  ...prev,
                                  paddingRight: Number(e.target.value)
                                }))
                                setHasChanges(true)
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>边框圆角</Label>
                        <Select
                          value={globalConfig.borderRadius}
                          onValueChange={(v: 'none' | 'rounded' | 'large' | 'custom') => {
                            setGlobalConfig((prev) => ({ ...prev, borderRadius: v }))
                            setHasChanges(true)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">直角</SelectItem>
                            <SelectItem value="rounded">圆角</SelectItem>
                            <SelectItem value="large">大圆角</SelectItem>
                            <SelectItem value="custom">自定义</SelectItem>
                          </SelectContent>
                        </Select>
                        {globalConfig.borderRadius === 'custom' && (
                          <div className="mt-2">
                            <Label className="text-xs text-muted-foreground">圆角大小 (px)</Label>
                            <Slider
                              value={[globalConfig.customRadius]}
                              min={0}
                              max={30}
                              step={1}
                              onValueChange={([v]) => {
                                setGlobalConfig((prev) => ({ ...prev, customRadius: v }))
                                setHasChanges(true)
                              }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {globalConfig.customRadius}px
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>组件阴影</Label>
                          <p className="text-xs text-muted-foreground">为组件添加投影效果</p>
                        </div>
                        <Switch
                          checked={globalConfig.shadow}
                          onCheckedChange={(v) => {
                            setGlobalConfig((prev) => ({ ...prev, shadow: v }))
                            setHasChanges(true)
                          }}
                        />
                      </div>

                      <Separator />

                      {/* 预览效果 */}
                      <div className="space-y-2">
                        <Label>预览效果</Label>
                        <div
                          className="p-4 border"
                          style={{
                            backgroundColor: pageSettings.pageBgColor,
                            borderRadius:
                              globalConfig.borderRadius === 'none'
                                ? 0
                                : globalConfig.borderRadius === 'rounded'
                                  ? 8
                                  : globalConfig.borderRadius === 'large'
                                    ? 16
                                    : globalConfig.customRadius,
                            boxShadow: globalConfig.shadow ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                          }}
                        >
                          <div
                            className="h-8 flex items-center justify-center text-white text-sm"
                            style={{ backgroundColor: globalConfig.themeColor }}
                          >
                            主题按钮
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>

            {/* 拖拽预览层 */}
            <DragOverlay>
              {activeId && dragType === 'new' && (
                <div className="w-32 bg-white rounded-lg shadow-xl border-2 border-primary opacity-90">
                  <div className="h-16 overflow-hidden bg-gray-50 border-b">
                    <div className="transform scale-[0.3] origin-top-left w-[333%]">
                      <ComponentPreview
                        component={{
                          id: 'overlay',
                          type: activeId.replace('new-', '') as PageComponentType,
                          title: '',
                          visible: true,
                          props: getDefaultProps(activeId.replace('new-', '') as PageComponentType)
                        }}
                      />
                    </div>
                  </div>
                  <div className="p-2 text-center text-xs font-medium">
                    {COMPONENT_TYPES.find((c) => c.value === activeId.replace('new-', ''))?.label ||
                      '组件'}
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
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

      {/* 模板库对话框 */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              模板库
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
              {TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="group relative border rounded-xl overflow-hidden cursor-pointer hover:border-primary hover:shadow-lg transition-all"
                >
                  {/* 缩略图 */}
                  <div className="aspect-[9/16] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                    <div className="w-full h-full p-3 flex flex-col gap-1">
                      {/* 迷你预览 */}
                      <div className="bg-white rounded shadow-sm p-2 flex items-center justify-center">
                        <span className="text-2xl">{template.thumbnail}</span>
                      </div>
                      {template.components.slice(0, 4).map((comp, i) => (
                        <div
                          key={i}
                          className="bg-white/80 rounded h-6 flex items-center px-2 text-xs text-muted-foreground truncate"
                        >
                          {comp.title}
                        </div>
                      ))}
                      {template.components.length > 4 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{template.components.length - 4} 更多
                        </div>
                      )}
                    </div>
                  </div>
                  {/* 信息 */}
                  <div className="p-3 bg-white">
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{template.category}</span>
                      <span className="text-xs text-muted-foreground">
                        {template.components.length} 个组件
                      </span>
                    </div>
                  </div>
                  {/* 悬浮遮罩 */}
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                      使用此模板
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">点击模板即可应用，当前配置将被替换</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
