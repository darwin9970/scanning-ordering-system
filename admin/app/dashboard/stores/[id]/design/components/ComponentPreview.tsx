import {
  Bell,
  Flame,
  Sparkles,
  Image,
  ImagePlus,
  Search,
  Store,
  MapPin,
  ShoppingCart,
  Star,
  Ticket,
  Award,
  Crown,
  Wallet,
  MessageCircle,
  User,
  Phone,
  Zap,
  Gift,
  Hash,
  Package,
  CreditCard,
  LayoutGrid,
} from "lucide-react";
import type { PageComponent } from "@/types";

interface ComponentPreviewProps {
  component: PageComponent;
  mini?: boolean; // 迷你模式用于组件面板
}

export function ComponentPreview({ component, mini = false }: ComponentPreviewProps) {
  const { type, props } = component;

  // 迷你预览模式 - 用于组件面板展示
  if (mini) {
    return <MiniPreview type={type} />;
  }

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
      );

    case "NAV_GRID":
      const items = (props.items as { icon: string; text: string }[]) || [];
      const columns = (props.columns as number) || 4;
      return (
        <div className="p-4 bg-white">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {items.slice(0, 8).map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="text-2xl mb-1">{item.icon}</div>
                <span className="text-xs text-gray-600">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "NOTICE":
      return (
        <div className="bg-orange-50 px-4 py-2 flex items-center gap-2">
          <Bell className="h-4 w-4 text-orange-500" />
          <span className="text-sm text-orange-700 truncate">店内公告信息将在这里滚动显示...</span>
        </div>
      );

    case "HOT_PRODUCTS":
    case "NEW_PRODUCTS":
      const limit = (props.limit as number) || 4;
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
      );

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
      );

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
      );

    case "IMAGE":
      return (
        <div
          className="bg-gray-200 flex items-center justify-center"
          style={{ height: (props.height as number) || 120 }}
        >
          {props.image ? (
            <img src={props.image as string} alt="" className="w-full h-full object-cover" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-gray-400 mr-2" />
              <span className="text-gray-400">单图广告</span>
            </>
          )}
        </div>
      );

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
      );

    case "SPACER":
      return (
        <div
          style={{
            height: (props.height as number) || 20,
            backgroundColor: (props.backgroundColor as string) || "#f5f5f5",
          }}
        />
      );

    // === 极简组件 ===
    case "FOCUS_ENTRY":
      return (
        <div className="p-3">
          <div
            className="rounded-full px-6 py-3 text-white text-center font-medium flex items-center justify-center gap-2"
            style={{ backgroundColor: (props.bgColor as string) || "#ff6b35" }}
          >
            <span className="text-xl">{(props.icon as string) || "🔥"}</span>
            <span>{(props.text as string) || "点我下单"}</span>
          </div>
        </div>
      );

    case "STAMP_CARD":
    case "STAMP_CARD_STD":
      return (
        <div className="p-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg mx-3">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-5 w-5 text-amber-500" />
            <span className="font-medium">{(props.title as string) || "集点活动"}</span>
          </div>
          <div className="flex gap-1">
            {Array(Math.min((props.total as number) || 10, 10))
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full border-2 ${i < ((props.current as number) || 0) ? "bg-amber-500 border-amber-500" : "border-amber-300"}`}
                />
              ))}
          </div>
        </div>
      );

    case "COUPON_ENTRY":
      return (
        <div className="p-3">
          <div className="bg-gradient-to-r from-red-500 to-orange-400 rounded-lg px-4 py-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              <span>{(props.text as string) || "领券中心"}</span>
            </div>
            <span className="text-xs bg-white/20 px-2 py-1 rounded">去领取 &gt;</span>
          </div>
        </div>
      );

    case "BALANCE_ENTRY":
      return (
        <div className="p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-orange-500" />
              <span>账户余额</span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-orange-500">¥0.00</div>
              <div className="text-xs text-gray-400">去充值 &gt;</div>
            </div>
          </div>
        </div>
      );

    case "POINTS_ENTRY":
      return (
        <div className="p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <span>我的积分</span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-yellow-500">0</div>
              <div className="text-xs text-gray-400">去兑换 &gt;</div>
            </div>
          </div>
        </div>
      );

    case "SERVICE_ENTRY":
      return (
        <div className="p-3">
          <div className="bg-green-500 rounded-full px-4 py-2 text-white flex items-center justify-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span>{(props.text as string) || "联系客服"}</span>
          </div>
        </div>
      );

    case "NEARBY_STORES":
      return (
        <div className="p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-blue-500" />
            <span className="font-medium">附近门店</span>
          </div>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">门店名称</span>
                <span className="text-xs text-gray-400">500m</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "FLOAT_WINDOW":
      return (
        <div className="h-20 relative bg-gray-50">
          <div className="absolute right-3 bottom-3 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-xl shadow-lg">
            {(props.icon as string) || "🎁"}
          </div>
        </div>
      );

    // === 标准组件 ===
    case "SEARCH":
      return (
        <div className="p-3" style={{ backgroundColor: (props.bgColor as string) || "#f5f5f5" }}>
          <div className="bg-white rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
            <Search className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400 text-sm">
              {(props.placeholder as string) || "搜索商品"}
            </span>
          </div>
        </div>
      );

    case "STORE_TITLE":
      return (
        <div className="p-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Store className="h-6 w-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <div className="font-medium">门店名称</div>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <span className="text-green-500">营业中</span>
                <span>距离500m</span>
              </div>
            </div>
          </div>
        </div>
      );

    case "STORE_LIST":
      return (
        <div className="p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <Store className="h-4 w-4 text-gray-600" />
            <span className="font-medium">门店列表</span>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <div className="w-10 h-10 bg-gray-200 rounded" />
                <div className="flex-1">
                  <div className="text-sm">门店{i}</div>
                  <div className="text-xs text-gray-400">500m</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "CART_FLOAT":
      return (
        <div className="h-16 relative bg-gray-50">
          <div className="absolute right-4 bottom-2 bg-orange-500 rounded-full px-4 py-2 flex items-center gap-2 text-white shadow-lg">
            <ShoppingCart className="h-5 w-5" />
            <span className="font-medium">¥0</span>
            <span className="bg-white text-orange-500 text-xs px-2 py-0.5 rounded-full">0</span>
          </div>
        </div>
      );

    case "PROMOTION":
      return (
        <div className="p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="h-4 w-4 text-red-500" />
            <span className="font-medium">营销活动</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="aspect-video bg-gradient-to-r from-red-400 to-pink-400 rounded-lg"
              />
            ))}
          </div>
        </div>
      );

    case "WECHAT_OA":
      return (
        <div className="p-4 bg-white">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <Hash className="h-8 w-8 text-green-500" />
            <div>
              <div className="font-medium">关注公众号</div>
              <div className="text-xs text-gray-400">获取更多优惠信息</div>
            </div>
          </div>
        </div>
      );

    case "COMBO_PROMO":
      return (
        <div className="p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-purple-500" />
            <span className="font-medium">{(props.title as string) || "超值套餐"}</span>
          </div>
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-24">
                <div className="aspect-square bg-gray-100 rounded-lg mb-1" />
                <div className="text-xs truncate">套餐{i}</div>
                <div className="text-xs text-orange-500">¥99</div>
              </div>
            ))}
          </div>
        </div>
      );

    // === 基础元素 ===
    case "TEXT":
      return (
        <div
          className="p-3"
          style={{
            fontSize: (props.fontSize as number) || 14,
            textAlign: (props.align as "left" | "center" | "right") || "left",
            fontWeight: (props.fontWeight as string) || "normal",
            color: (props.color as string) || "#333",
          }}
        >
          {(props.content as string) || "请输入文本"}
        </div>
      );

    case "USER_NICKNAME":
      return (
        <div className="p-3" style={{ fontSize: (props.fontSize as number) || 16 }}>
          {(props.prefix as string) || "Hi, "}用户昵称
        </div>
      );

    case "USER_AVATAR":
      return (
        <div className="p-3 flex justify-center">
          <div
            className="bg-gray-200 flex items-center justify-center"
            style={{
              width: (props.size as number) || 60,
              height: (props.size as number) || 60,
              borderRadius: (props.borderRadius as number) || 30,
            }}
          >
            <User className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      );

    case "USER_PHONE":
      return (
        <div
          className="p-3 flex items-center gap-2"
          style={{ fontSize: (props.fontSize as number) || 14 }}
        >
          <Phone className="h-4 w-4 text-gray-400" />
          <span>{(props.masked as boolean) ? "138****8888" : "13888888888"}</span>
        </div>
      );

    case "USER_POINTS":
      return (
        <div className="p-3 text-center">
          <div
            style={{
              fontSize: (props.fontSize as number) || 24,
              color: (props.color as string) || "#ff6b35",
            }}
          >
            0
          </div>
          {(props.showLabel as boolean) !== false && (
            <div className="text-xs text-gray-400">积分</div>
          )}
        </div>
      );

    case "USER_BALANCE":
      return (
        <div className="p-3 text-center">
          <div
            style={{
              fontSize: (props.fontSize as number) || 24,
              color: (props.color as string) || "#ff6b35",
            }}
          >
            ¥0.00
          </div>
          {(props.showLabel as boolean) !== false && (
            <div className="text-xs text-gray-400">余额</div>
          )}
        </div>
      );

    case "COUPON_COUNT":
      return (
        <div className="p-3 flex items-center gap-1">
          <Ticket className="h-4 w-4" style={{ color: (props.color as string) || "#ff6b35" }} />
          <span style={{ color: (props.color as string) || "#ff6b35" }}>3张可用</span>
        </div>
      );

    case "STORE_NAME":
      return (
        <div className="p-3" style={{ fontSize: (props.fontSize as number) || 16 }}>
          <Store className="h-4 w-4 inline mr-1" />
          门店名称
        </div>
      );

    case "STORE_DISTANCE":
      return (
        <div
          className="p-3"
          style={{
            fontSize: (props.fontSize as number) || 12,
            color: (props.color as string) || "#999",
          }}
        >
          <MapPin className="h-3 w-3 inline mr-1" />
          距离500m
        </div>
      );

    case "MEMBER_BADGE":
      return (
        <div className="p-3 flex items-center gap-2">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full px-3 py-1 flex items-center gap-1">
            <Crown className="h-4 w-4 text-white" />
            <span className="text-white text-sm">黄金会员</span>
          </div>
        </div>
      );

    case "MEMBER_PROGRESS":
      return (
        <div className="p-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>当前等级</span>
            <span>下一等级</span>
          </div>
          <div
            className="rounded-full overflow-hidden"
            style={{
              height: (props.height as number) || 8,
              backgroundColor: (props.bgColor as string) || "#eee",
            }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: "60%", backgroundColor: (props.activeColor as string) || "#ff6b35" }}
            />
          </div>
        </div>
      );

    // === 自由容器 ===
    case "FREE_CONTAINER":
      return (
        <div
          className="border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400"
          style={{
            height: (props.height as number) || 200,
            padding: (props.padding as number) || 0,
            backgroundColor: (props.bgColor as string) || "transparent",
          }}
        >
          <LayoutGrid className="h-6 w-6 mr-2" />
          自由容器
        </div>
      );

    case "FLOAT_CONTAINER":
      return (
        <div className="h-20 relative bg-gray-50">
          <div
            className="absolute w-14 h-14 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 bg-white"
            style={{ right: (props.offsetX as number) || 20, bottom: 10 }}
          >
            <LayoutGrid className="h-4 w-4" />
          </div>
        </div>
      );

    // === 专属组件 ===
    case "ORDER_COMPONENT":
      return (
        <div className="bg-white">
          <div className="flex">
            <div className="w-20 bg-gray-50 p-2 space-y-2">
              {["热销", "主食", "饮品"].map((cat, i) => (
                <div
                  key={i}
                  className={`text-xs py-1 px-2 rounded ${i === 0 ? "bg-orange-100 text-orange-500" : "text-gray-500"}`}
                >
                  {cat}
                </div>
              ))}
            </div>
            <div className="flex-1 p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-16 h-16 bg-gray-100 rounded" />
                  <div className="flex-1">
                    <div className="text-sm">商品名称</div>
                    <div className="text-xs text-gray-400">月售100</div>
                    <div className="text-orange-500 text-sm">¥18</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "USER_INFO":
      return (
        <div className="p-4 bg-gradient-to-r from-orange-400 to-pink-400">
          <div className="flex items-center gap-3 text-white">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
              <User className="h-8 w-8" />
            </div>
            <div>
              <div className="font-medium">用户昵称</div>
              <div className="text-xs opacity-80">138****8888</div>
            </div>
          </div>
          <div className="flex justify-around mt-4 text-white text-center">
            <div>
              <div className="font-bold">¥0</div>
              <div className="text-xs opacity-80">余额</div>
            </div>
            <div>
              <div className="font-bold">0</div>
              <div className="text-xs opacity-80">积分</div>
            </div>
            <div>
              <div className="font-bold">3</div>
              <div className="text-xs opacity-80">优惠券</div>
            </div>
          </div>
        </div>
      );

    case "FUNC_ENTRY":
      const funcItems = (props.items as { icon: string; text: string }[]) || [
        { icon: "📋", text: "我的订单" },
        { icon: "🎫", text: "优惠券" },
        { icon: "⭐", text: "收藏" },
        { icon: "⚙️", text: "设置" },
      ];
      return (
        <div className="p-4 bg-white">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${(props.columns as number) || 4}, 1fr)` }}
          >
            {funcItems.map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="text-2xl mb-1">{item.icon}</div>
                <span className="text-xs text-gray-600">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "MEMBER_RIGHTS":
      const rights = (props.items as string[]) || ["免费配送", "会员折扣", "生日特权", "积分加倍"];
      return (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-5 w-5 text-amber-500" />
            <span className="font-medium">会员权益</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {rights.map((right, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-1">
                  <Award className="h-5 w-5 text-amber-500" />
                </div>
                <div className="text-xs">{right}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "MEMBER_LEVEL":
      return (
        <div className="p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <span className="font-medium">黄金会员</span>
            </div>
            <span className="text-xs text-gray-400">查看等级权益 &gt;</span>
          </div>
          <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 h-full w-3/5" />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>还需消费¥200升级</span>
            <span>铂金会员</span>
          </div>
        </div>
      );

    case "RECHARGE_OPTIONS":
      const rechargeItems = (props.items as { amount: number; gift: number }[]) || [
        { amount: 100, gift: 10 },
        { amount: 200, gift: 30 },
        { amount: 500, gift: 100 },
      ];
      return (
        <div className="p-4 bg-white">
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${(props.columns as number) || 2}, 1fr)` }}
          >
            {rechargeItems.map((item, i) => (
              <div
                key={i}
                className={`border-2 rounded-lg p-3 text-center ${i === 0 ? "border-orange-500 bg-orange-50" : "border-gray-200"}`}
              >
                <div className="text-lg font-bold">¥{item.amount}</div>
                <div className="text-xs text-orange-500">送¥{item.gift}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "RECHARGE_BUTTON":
      return (
        <div className="p-4">
          <button
            className="w-full py-3 rounded-full text-white font-medium"
            style={{ backgroundColor: (props.bgColor as string) || "#ff6b35" }}
          >
            {(props.text as string) || "立即充值"}
          </button>
        </div>
      );

    default:
      return <div className="p-4 bg-gray-100 text-center text-gray-500 text-sm">{type}</div>;
  }
}

// 迷你预览组件 - 用于组件面板
function MiniPreview({ type }: { type: string }) {
  const previews: Record<string, React.ReactNode> = {
    BANNER: (
      <div className="w-full h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded flex items-center justify-center text-white text-xs">
        <Image className="h-3 w-3 mr-1" />
        轮播
      </div>
    ),
    NAV_GRID: (
      <div className="grid grid-cols-4 gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-3 h-3 bg-gray-200 rounded" />
        ))}
      </div>
    ),
    NOTICE: (
      <div className="w-full h-4 bg-orange-100 rounded flex items-center px-1">
        <Bell className="h-2 w-2 text-orange-500" />
        <div className="flex-1 h-1 bg-orange-200 ml-1 rounded" />
      </div>
    ),
    HOT_PRODUCTS: (
      <div className="space-y-1">
        <div className="flex items-center">
          <Flame className="h-2 w-2 text-red-500" />
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    ),
    PRODUCT_LIST: (
      <div className="space-y-1">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-1">
            <div className="w-4 h-4 bg-gray-200 rounded" />
            <div className="flex-1 space-y-0.5">
              <div className="h-1 bg-gray-200 rounded w-3/4" />
              <div className="h-1 bg-orange-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    ),
    COUPON: (
      <div className="flex gap-0.5">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-4 w-6 bg-gradient-to-r from-red-500 to-orange-400 rounded text-white text-[6px] flex items-center justify-center"
          >
            券
          </div>
        ))}
      </div>
    ),
    SEARCH: (
      <div className="w-full h-4 bg-gray-100 rounded-full flex items-center px-1">
        <Search className="h-2 w-2 text-gray-400" />
      </div>
    ),
    USER_INFO: (
      <div className="w-full h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded flex items-center justify-center">
        <User className="h-4 w-4 text-white" />
      </div>
    ),
    SPACER: <div className="w-full h-2 bg-gray-200 rounded" />,
  };

  return (
    previews[type] || (
      <div className="w-full h-8 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
        预览
      </div>
    )
  );
}
