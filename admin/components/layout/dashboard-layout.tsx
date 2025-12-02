"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { cn } from "@/lib/utils";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 读取 sidebar 折叠状态
    const saved = localStorage.getItem("sidebar-collapsed");
    setSidebarCollapsed(saved === "true");

    // 监听 localStorage 变化
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sidebar-collapsed") {
        setSidebarCollapsed(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorage);

    // 也监听自定义事件（同一页面内的变化）
    const handleCustomEvent = () => {
      const val = localStorage.getItem("sidebar-collapsed");
      setSidebarCollapsed(val === "true");
    };
    window.addEventListener("sidebar-toggle", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sidebar-toggle", handleCustomEvent);
    };
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header collapsed={sidebarCollapsed} />
      <main className={cn(
        "pt-16 transition-all duration-300",
        sidebarCollapsed ? "ml-16" : "ml-64"
      )}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
