"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
} from "lucide-react";

const menuItems = [
  {
    title: "概览",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "订单管理",
    href: "/dashboard/orders",
    icon: ShoppingCart,
  },
  {
    title: "菜品管理",
    href: "/dashboard/products",
    icon: ChefHat,
  },
  {
    title: "分类管理",
    href: "/dashboard/categories",
    icon: UtensilsCrossed,
  },
  {
    title: "桌台管理",
    href: "/dashboard/tables",
    icon: QrCode,
  },
  {
    title: "打印机配置",
    href: "/dashboard/printers",
    icon: Printer,
  },
  {
    title: "门店管理",
    href: "/dashboard/stores",
    icon: Store,
  },
  {
    title: "数据报表",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
  {
    title: "员工管理",
    href: "/dashboard/staff",
    icon: Users,
  },
  {
    title: "系统设置",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">扫码点单</span>
        </Link>
      </div>
      <nav className="space-y-1 p-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
