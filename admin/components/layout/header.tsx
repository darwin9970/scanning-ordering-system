"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { RealtimeNotifications } from "@/components/realtime-notifications";
import { LogOut, User } from "lucide-react";
import { ROLE_MAP } from "@/lib/utils";

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // 获取门店 ID，超级管理员默认监听门店 1
  const storeId = user?.store?.id || (user?.role === "SUPER_ADMIN" ? 1 : null);

  return (
    <header className="fixed left-64 right-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">后台管理系统</h1>
      </div>
      <div className="flex items-center gap-4">
        {storeId && <RealtimeNotifications storeId={storeId} />}
        <div className="flex items-center gap-3 border-l pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="text-sm">
            <p className="font-medium">{user?.name || "管理员"}</p>
            <p className="text-xs text-gray-500">{ROLE_MAP[user?.role || ""] || "店员"}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="退出登录">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
