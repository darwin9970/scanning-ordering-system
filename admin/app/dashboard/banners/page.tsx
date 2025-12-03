"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Image, GripVertical } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Banner {
  id: number
  storeId: number | null
  title: string
  image: string
  position: string
  linkType: string | null
  linkValue: string | null
  sort: number
  isActive: boolean
  startTime: string | null
  endTime: string | null
  createdAt: string
}

const POSITIONS = [
  { value: "HOME_TOP", label: "首页顶部" },
  { value: "MENU_TOP", label: "菜单页顶部" },
  { value: "CATEGORY", label: "分类页" },
  { value: "PROMOTION", label: "活动专区" },
]

const LINK_TYPES = [
  { value: "", label: "无跳转" },
  { value: "product", label: "商品详情" },
  { value: "category", label: "商品分类" },
  { value: "promotion", label: "活动页" },
  { value: "url", label: "外部链接" },
]

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    image: "",
    position: "MENU_TOP",
    linkType: "",
    linkValue: "",
    sort: 0,
    isActive: true,
    startTime: "",
    endTime: "",
  })

  useEffect(() => {
    loadBanners()
  }, [])

  const loadBanners = async () => {
    try {
      const res = await api.get("/banners")
      if (res.code === 200) {
        setBanners(res.data.list || [])
      }
    } catch (error) {
      toast.error("加载轮播图失败")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.image) {
      toast.error("请填写标题和上传图片")
      return
    }

    try {
      if (editingBanner) {
        await api.put(`/banners/${editingBanner.id}`, formData)
        toast.success("更新成功")
      } else {
        await api.post("/banners", formData)
        toast.success("创建成功")
      }
      setDialogOpen(false)
      loadBanners()
    } catch (error) {
      toast.error("操作失败")
    }
  }

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner)
    setFormData({
      title: banner.title,
      image: banner.image,
      position: banner.position,
      linkType: banner.linkType || "",
      linkValue: banner.linkValue || "",
      sort: banner.sort,
      isActive: banner.isActive,
      startTime: banner.startTime?.split("T")[0] || "",
      endTime: banner.endTime?.split("T")[0] || "",
    })
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingBanner(null)
    setFormData({
      title: "",
      image: "",
      position: "MENU_TOP",
      linkType: "",
      linkValue: "",
      sort: 0,
      isActive: true,
      startTime: "",
      endTime: "",
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个轮播图吗？")) return

    try {
      await api.delete(`/banners/${id}`)
      toast.success("删除成功")
      loadBanners()
    } catch (error) {
      toast.error("删除失败")
    }
  }

  const handleToggle = async (id: number) => {
    try {
      await api.put(`/banners/${id}/toggle`)
      loadBanners()
    } catch (error) {
      toast.error("操作失败")
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formDataUpload = new FormData()
    formDataUpload.append("file", file)

    try {
      const res = await api.upload("/upload", formDataUpload)
      if (res.code === 200) {
        setFormData({ ...formData, image: res.data.url })
        toast.success("上传成功")
      }
    } catch (error) {
      toast.error("上传失败")
    }
  }

  const getPositionLabel = (position: string) => {
    return POSITIONS.find(p => p.value === position)?.label || position
  }

  const getLinkTypeLabel = (linkType: string | null) => {
    if (!linkType) return "-"
    return LINK_TYPES.find(t => t.value === linkType)?.label || linkType
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">轮播图管理</h1>
          <p className="text-muted-foreground">管理小程序首页和菜单页的轮播图</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          添加轮播图
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>轮播图列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">排序</TableHead>
                <TableHead className="w-24">图片</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>位置</TableHead>
                <TableHead>跳转类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>有效期</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : banners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    暂无轮播图
                  </TableCell>
                </TableRow>
              ) : (
                banners.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        {banner.sort}
                      </div>
                    </TableCell>
                    <TableCell>
                      {banner.image ? (
                        <img
                          src={banner.image}
                          alt={banner.title}
                          className="w-20 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-20 h-10 bg-muted rounded flex items-center justify-center">
                          <Image className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{banner.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getPositionLabel(banner.position)}</Badge>
                    </TableCell>
                    <TableCell>{getLinkTypeLabel(banner.linkType)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={banner.isActive}
                        onCheckedChange={() => handleToggle(banner.id)}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {banner.startTime || banner.endTime ? (
                        <>
                          {banner.startTime?.split("T")[0] || "不限"} ~{" "}
                          {banner.endTime?.split("T")[0] || "不限"}
                        </>
                      ) : (
                        "长期有效"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(banner)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(banner.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? "编辑轮播图" : "添加轮播图"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>标题 *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="请输入轮播图标题"
              />
            </div>

            <div className="space-y-2">
              <Label>图片 *</Label>
              <div className="flex gap-4">
                {formData.image ? (
                  <img
                    src={formData.image}
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
                    htmlFor="banner-image"
                    className="cursor-pointer text-primary hover:underline"
                  >
                    上传图片
                  </Label>
                  <input
                    id="banner-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    建议尺寸: 750 x 280
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>展示位置</Label>
                <Select
                  value={formData.position}
                  onValueChange={(v) => setFormData({ ...formData, position: v })}
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
                  value={formData.sort}
                  onChange={(e) => setFormData({ ...formData, sort: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>跳转类型</Label>
                <Select
                  value={formData.linkType}
                  onValueChange={(v) => setFormData({ ...formData, linkType: v })}
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
                  value={formData.linkValue}
                  onChange={(e) => setFormData({ ...formData, linkValue: e.target.value })}
                  placeholder={formData.linkType === "url" ? "https://..." : "ID"}
                  disabled={!formData.linkType}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始时间 (可选)</Label>
                <Input
                  type="date"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>结束时间 (可选)</Label>
                <Input
                  type="date"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
              />
              <Label>启用</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingBanner ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
