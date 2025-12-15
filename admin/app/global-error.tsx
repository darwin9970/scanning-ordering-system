"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Global fallback for unhandled errors; keeps the app responsive and offers recovery actions.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Basic client-side logging; hook your observability pipeline here if available.

    console.error("Global error boundary caught an error:", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-black/30">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-amber-300">发生错误</p>
            <h1 className="text-2xl font-bold leading-tight">页面开小差了</h1>
            <p className="text-sm text-slate-300">
              我们已经记录了问题，请稍后重试。若多次失败，可尝试刷新或返回登录页。
            </p>
            {error?.digest && <p className="text-xs text-slate-400">错误编号: {error.digest}</p>}
          </div>

          <div className="flex gap-3">
            <Button variant="default" onClick={reset} className="flex-1">
              重试
            </Button>
            <Button asChild variant="secondary" className="flex-1">
              <Link href="/login">返回登录</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
