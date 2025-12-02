"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Store,
  UtensilsCrossed,
  ShoppingCart,
  Printer,
  QrCode,
  Settings,
  Users,
  BarChart3,
  ChefHat,
  Ticket,
  Zap,
  Crown,
  Package,
  Bell,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import type { Permission } from "@/types";

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission; // 需要的权限，不填则所有角色可见
}

const menuItems: MenuItem[] = [
  {
    title: "概览",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "订单管理",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    permission: "order:read",
  },
  {
    title: "服务呼叫",
    href: "/dashboard/service",
    icon: Bell,
    permission: "service:read",
  },
  {
    title: "菜品管理",
    href: "/dashboard/products",
    icon: ChefHat,
    permission: "product:read",
  },
  {
    title: "套餐管理",
    href: "/dashboard/combos",
    icon: Package,
    permission: "product:read",
  },
  {
    title: "分类管理",
    href: "/dashboard/categories",
    icon: UtensilsCrossed,
    permission: "category:read",
  },
  {
    title: "桌台管理",
    href: "/dashboard/tables",
    icon: QrCode,
    permission: "table:read",
  },
  {
    title: "打印机配置",
    href: "/dashboard/printers",
    icon: Printer,
    permission: "printer:write",
  },
  {
    title: "门店管理",
    href: "/dashboard/stores",
    icon: Store,
    permission: "store:write",
  },
  {
    title: "优惠券",
    href: "/dashboard/coupons",
    icon: Ticket,
    permission: "coupon:read",
  },
  {
    title: "营销活动",
    href: "/dashboard/promotions",
    icon: Zap,
    permission: "promotion:read",
  },
  {
    title: "会员管理",
    href: "/dashboard/members",
    icon: Crown,
    permission: "member:read",
  },
  {
    title: "数据报表",
    href: "/dashboard/reports",
    icon: BarChart3,
    permission: "report:read",
  },
  {
    title: "员工管理",
    href: "/dashboard/staff",
    icon: Users,
    permission: "staff:read",
  },
  {
    title: "角色权限",
    href: "/dashboard/roles",
    icon: Shield,
    permission: "staff:write", // 需要员工管理写权限
  },
  {
    title: "系统设置",
    href: "/dashboard/settings",
    icon: Settings,
    permission: "settings:read",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  // 从 localStorage 恢复折叠状态
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") {
      setCollapsed(true);
    }
  }, []);

  // 保存折叠状态到 localStorage
  const toggleCollapsed = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    localStorage.setItem("sidebar-collapsed", String(newValue));
    // 派发自定义事件通知其他组件
    window.dispatchEvent(new Event("sidebar-toggle"));
  };

  // 根据权限过滤菜单（使用后端返回的权限列表）
  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.permission) return true; // 无权限限制
    if (!user?.permissions) return false;
    return hasPermission(user.permissions, item.permission);
  });

  // 判断是否激活：精确匹配或子路径匹配（排除 /dashboard 的特殊情况）
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-3">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2",
            collapsed && "justify-center w-full"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary flex-shrink-0">
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </div>
          {!collapsed && <span className="text-lg font-bold">扫码点单</span>}
        </Link>
      </div>

      <nav className="space-y-1 p-2 overflow-y-auto" style={{ height: "calc(100vh - 8rem)" }}>
        {filteredMenuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.title : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* 折叠按钮 */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapsed}
          className={cn("w-full", collapsed && "px-2")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>收起</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
