import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";

// 配置 dayjs
dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | string): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return `¥${num.toFixed(2)}`;
}

export function formatDate(
  date: string | Date | null | undefined,
  format: "date" | "datetime" | "time" = "datetime"
): string {
  if (!date) return "-";
  const formatMap = {
    date: "YYYY-MM-DD",
    datetime: "YYYY-MM-DD HH:mm",
    time: "HH:mm",
  };
  return dayjs(date).format(formatMap[format]);
}

export function fromNow(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return dayjs(date).fromNow();
}

// 导出 dayjs 实例供直接使用
export { dayjs };

// 订单状态映射
export const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待支付", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "已支付", color: "bg-blue-100 text-blue-800" },
  PREPARING: { label: "制作中", color: "bg-orange-100 text-orange-800" },
  READY: { label: "待取餐", color: "bg-purple-100 text-purple-800" },
  COMPLETED: { label: "已完成", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "已取消", color: "bg-gray-100 text-gray-800" },
  REFUNDED: { label: "已退款", color: "bg-red-100 text-red-800" },
};

// 桌台状态映射
export const TABLE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: "空闲", color: "bg-green-100 text-green-800" },
  OCCUPIED: { label: "使用中", color: "bg-red-100 text-red-800" },
  RESERVED: { label: "已预订", color: "bg-yellow-100 text-yellow-800" },
  DISABLED: { label: "停用", color: "bg-gray-100 text-gray-800" },
};

// 商品状态映射
export const PRODUCT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  ON_SALE: { label: "在售", color: "bg-green-100 text-green-800" },
  OFF_SALE: { label: "下架", color: "bg-gray-100 text-gray-800" },
  SOLD_OUT: { label: "售罄", color: "bg-red-100 text-red-800" },
};

// 打印机状态映射
export const PRINTER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  ONLINE: { label: "在线", color: "bg-green-100 text-green-800" },
  OFFLINE: { label: "离线", color: "bg-gray-100 text-gray-800" },
  ERROR: { label: "错误", color: "bg-red-100 text-red-800" },
};

// 打印机类型映射
export const PRINTER_TYPE_MAP: Record<string, { label: string }> = {
  RECEIPT: { label: "小票打印机" },
  LABEL: { label: "标签打印机" },
  KITCHEN: { label: "厨房打印机" },
};

// 角色映射
export const ROLE_MAP: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: "超级管理员", color: "bg-purple-100 text-purple-800" },
  OWNER: { label: "店长", color: "bg-blue-100 text-blue-800" },
  STAFF: { label: "员工", color: "bg-gray-100 text-gray-800" },
};
