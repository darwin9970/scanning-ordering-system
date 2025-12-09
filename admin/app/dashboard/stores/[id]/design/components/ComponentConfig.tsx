import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PageComponent } from "@/types";

interface ComponentConfigProps {
  component: PageComponent;
  onUpdate: (props: Record<string, unknown>) => void;
}

export function ComponentConfig({ component, onUpdate }: ComponentConfigProps) {
  const { type, props } = component;

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
          <p className="text-xs text-muted-foreground">轮播图内容在「轮播图管理」中配置</p>
        </div>
      );

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
          <p className="text-xs text-muted-foreground">金刚区图标可在代码中自定义配置</p>
        </div>
      );

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
          <p className="text-xs text-muted-foreground">公告内容在门店设置中配置</p>
        </div>
      );

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
      );

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
          <p className="text-xs text-muted-foreground">图片可在组件中直接上传配置</p>
        </div>
      );

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
                    props.backgroundColor === color ? "border-primary" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      );

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
          <p className="text-xs text-muted-foreground">优惠券在「优惠券管理」中配置</p>
        </div>
      );

    case "PRODUCT_LIST":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>显示数量</Label>
            <Slider
              value={[(props.limit as number) || 10]}
              onValueChange={([v]) => onUpdate({ limit: v })}
              min={3}
              max={20}
              step={1}
            />
            <div className="text-xs text-muted-foreground text-right">
              {(props.limit as number) || 10} 个商品
            </div>
          </div>
          <p className="text-xs text-muted-foreground">商品将按列表样式展示，支持按分类筛选</p>
        </div>
      );

    case "PRODUCT_GRID":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>列数</Label>
            <Select
              value={String((props.columns as number) || 2)}
              onValueChange={(v) => onUpdate({ columns: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 列</SelectItem>
                <SelectItem value="3">3 列</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>显示数量</Label>
            <Slider
              value={[(props.limit as number) || 8]}
              onValueChange={([v]) => onUpdate({ limit: v })}
              min={4}
              max={20}
              step={2}
            />
            <div className="text-xs text-muted-foreground text-right">
              {(props.limit as number) || 8} 个商品
            </div>
          </div>
          <p className="text-xs text-muted-foreground">商品将按网格样式展示</p>
        </div>
      );

    case "FOCUS_ENTRY":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>按钮文字</Label>
            <Input
              value={(props.text as string) || "点我下单"}
              onChange={(e) => onUpdate({ text: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>图标</Label>
            <Input
              value={(props.icon as string) || "🔥"}
              onChange={(e) => onUpdate({ icon: e.target.value })}
              placeholder="输入emoji"
            />
          </div>
          <div className="space-y-2">
            <Label>背景颜色</Label>
            <div className="flex gap-2">
              {["#ff6b35", "#667eea", "#52c41a", "#1890ff"].map((color) => (
                <button
                  key={color}
                  onClick={() => onUpdate({ bgColor: color })}
                  className={`w-8 h-8 rounded border-2 ${props.bgColor === color ? "border-primary" : "border-transparent"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      );

    case "STAMP_CARD":
    case "STAMP_CARD_STD":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>标题</Label>
            <Input
              value={(props.title as string) || "集点活动"}
              onChange={(e) => onUpdate({ title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>副标题</Label>
            <Input
              value={(props.subtitle as string) || "集满兑换好礼"}
              onChange={(e) => onUpdate({ subtitle: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>集满数量</Label>
            <Slider
              value={[(props.total as number) || 10]}
              onValueChange={([v]) => onUpdate({ total: v })}
              min={5}
              max={20}
              step={1}
            />
            <div className="text-xs text-muted-foreground text-right">
              {(props.total as number) || 10} 个
            </div>
          </div>
        </div>
      );

    case "SEARCH":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>占位文字</Label>
            <Input
              value={(props.placeholder as string) || "搜索商品"}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>背景颜色</Label>
            <div className="flex gap-2">
              {["#f5f5f5", "#ffffff", "#f0f0f0", "#e8e8e8"].map((color) => (
                <button
                  key={color}
                  onClick={() => onUpdate({ bgColor: color })}
                  className={`w-8 h-8 rounded border-2 ${props.bgColor === color ? "border-primary" : "border-transparent"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      );

    case "STORE_TITLE":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>显示距离</Label>
            <Switch
              checked={(props.showDistance as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showDistance: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>显示营业状态</Label>
            <Switch
              checked={(props.showStatus as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showStatus: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>显示地址</Label>
            <Switch
              checked={(props.showAddress as boolean) ?? false}
              onCheckedChange={(v) => onUpdate({ showAddress: v })}
            />
          </div>
        </div>
      );

    case "CART_FLOAT":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>位置</Label>
            <Select
              value={(props.position as string) || "right-bottom"}
              onValueChange={(v) => onUpdate({ position: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="right-bottom">右下角</SelectItem>
                <SelectItem value="left-bottom">左下角</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>显示数量</Label>
            <Switch
              checked={(props.showCount as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showCount: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>显示价格</Label>
            <Switch
              checked={(props.showPrice as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showPrice: v })}
            />
          </div>
        </div>
      );

    case "TEXT":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>文本内容</Label>
            <Input
              value={(props.content as string) || ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>字体大小</Label>
            <Slider
              value={[(props.fontSize as number) || 14]}
              onValueChange={([v]) => onUpdate({ fontSize: v })}
              min={10}
              max={32}
              step={1}
            />
            <div className="text-xs text-muted-foreground text-right">
              {(props.fontSize as number) || 14}px
            </div>
          </div>
          <div className="space-y-2">
            <Label>对齐方式</Label>
            <Select
              value={(props.align as string) || "left"}
              onValueChange={(v) => onUpdate({ align: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">左对齐</SelectItem>
                <SelectItem value="center">居中</SelectItem>
                <SelectItem value="right">右对齐</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>加粗</Label>
            <Switch
              checked={props.fontWeight === "bold"}
              onCheckedChange={(v) => onUpdate({ fontWeight: v ? "bold" : "normal" })}
            />
          </div>
        </div>
      );

    case "FREE_CONTAINER":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>容器高度</Label>
            <Slider
              value={[(props.height as number) || 200]}
              onValueChange={([v]) => onUpdate({ height: v })}
              min={50}
              max={500}
              step={10}
            />
            <div className="text-xs text-muted-foreground text-right">
              {(props.height as number) || 200}px
            </div>
          </div>
          <div className="space-y-2">
            <Label>内边距</Label>
            <Slider
              value={[(props.padding as number) || 0]}
              onValueChange={([v]) => onUpdate({ padding: v })}
              min={0}
              max={50}
              step={5}
            />
            <div className="text-xs text-muted-foreground text-right">
              {(props.padding as number) || 0}px
            </div>
          </div>
          <p className="text-xs text-muted-foreground">自由容器可嵌套其他基础元素</p>
        </div>
      );

    case "USER_INFO":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>显示头像</Label>
            <Switch
              checked={(props.showAvatar as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showAvatar: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>显示昵称</Label>
            <Switch
              checked={(props.showNickname as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showNickname: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>显示余额</Label>
            <Switch
              checked={(props.showBalance as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showBalance: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>显示积分</Label>
            <Switch
              checked={(props.showPoints as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showPoints: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>显示优惠券</Label>
            <Switch
              checked={(props.showCoupons as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showCoupons: v })}
            />
          </div>
        </div>
      );

    case "FUNC_ENTRY":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>列数</Label>
            <Select
              value={String((props.columns as number) || 4)}
              onValueChange={(v) => onUpdate({ columns: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 列</SelectItem>
                <SelectItem value="4">4 列</SelectItem>
                <SelectItem value="5">5 列</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">功能入口可在代码中自定义配置</p>
        </div>
      );

    case "STORE_LIST":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>显示数量</Label>
            <Slider
              value={[(props.limit as number) || 5]}
              onValueChange={([v]) => onUpdate({ limit: v })}
              min={3}
              max={10}
              step={1}
            />
            <div className="text-xs text-muted-foreground text-right">
              {(props.limit as number) || 5} 家门店
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>显示距离</Label>
            <Switch
              checked={(props.showDistance as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showDistance: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>显示营业状态</Label>
            <Switch
              checked={(props.showStatus as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showStatus: v })}
            />
          </div>
        </div>
      );

    case "COMBO_PROMO":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>标题</Label>
            <Input
              value={(props.title as string) || "超值套餐"}
              onChange={(e) => onUpdate({ title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>显示数量</Label>
            <Slider
              value={[(props.limit as number) || 4]}
              onValueChange={([v]) => onUpdate({ limit: v })}
              min={2}
              max={8}
              step={1}
            />
            <div className="text-xs text-muted-foreground text-right">
              {(props.limit as number) || 4} 个套餐
            </div>
          </div>
        </div>
      );

    case "RECHARGE_OPTIONS":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>列数</Label>
            <Select
              value={String((props.columns as number) || 2)}
              onValueChange={(v) => onUpdate({ columns: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 列</SelectItem>
                <SelectItem value="3">3 列</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">充值档位在「储值设置」中配置</p>
        </div>
      );

    case "RECHARGE_BUTTON":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>按钮文字</Label>
            <Input
              value={(props.text as string) || "立即充值"}
              onChange={(e) => onUpdate({ text: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>背景颜色</Label>
            <div className="flex gap-2">
              {["#ff6b35", "#667eea", "#52c41a", "#1890ff"].map((color) => (
                <button
                  key={color}
                  onClick={() => onUpdate({ bgColor: color })}
                  className={`w-8 h-8 rounded border-2 ${props.bgColor === color ? "border-primary" : "border-transparent"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      );

    case "BALANCE_ENTRY":
    case "POINTS_ENTRY":
    case "COUPON_ENTRY":
    case "SERVICE_ENTRY":
    case "NEARBY_STORES":
    case "FLOAT_WINDOW":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">该组件使用默认配置，无需额外设置</p>
        </div>
      );

    case "ORDER_COMPONENT":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>分类样式</Label>
            <Select
              value={(props.categoryStyle as string) || "left"}
              onValueChange={(v) => onUpdate({ categoryStyle: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">左侧分类</SelectItem>
                <SelectItem value="top">顶部分类</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>商品样式</Label>
            <Select
              value={(props.productStyle as string) || "list"}
              onValueChange={(v) => onUpdate({ productStyle: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">列表模式</SelectItem>
                <SelectItem value="grid">网格模式</SelectItem>
                <SelectItem value="large">大图模式</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>显示销量</Label>
            <Switch
              checked={(props.showSales as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showSales: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>显示购物车</Label>
            <Switch
              checked={(props.showCart as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showCart: v })}
            />
          </div>
        </div>
      );

    case "MEMBER_RIGHTS":
    case "MEMBER_LEVEL":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>显示进度</Label>
            <Switch
              checked={(props.showProgress as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showProgress: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>显示升级入口</Label>
            <Switch
              checked={(props.showUpgrade as boolean) ?? true}
              onCheckedChange={(v) => onUpdate({ showUpgrade: v })}
            />
          </div>
          <p className="text-xs text-muted-foreground">会员权益在「会员设置」中配置</p>
        </div>
      );

    default:
      return <p className="text-sm text-muted-foreground">该组件暂无可配置项</p>;
  }
}
