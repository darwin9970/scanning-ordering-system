import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | string) {
  return `¥${Number(price).toFixed(2)}`;
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(date: string | Date) {
  return new Date(date).toLocaleDateString("zh-CN");
}

// 订单状态映射
export const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待支付", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "已支付", color: "bg-blue-100 text-blue-800" },
  PREPARING: { label: "制作中", color: "bg-purple-100 text-purple-800" },
  COMPLETED: { label: "已完成", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "已取消", color: "bg-gray-100 text-gray-800" },
  REFUNDED: { label: "已退款", color: "bg-red-100 text-red-800" },
};

// 桌台状态映射
export const TABLE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  FREE: { label: "空闲", color: "bg-green-100 text-green-800" },
  OCCUPIED: { label: "使用中", color: "bg-red-100 text-red-800" },
  RESERVED: { label: "已预约", color: "bg-yellow-100 text-yellow-800" },
};

// 商品状态映射
export const PRODUCT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: "可售", color: "bg-green-100 text-green-800" },
  SOLDOUT: { label: "售罄", color: "bg-red-100 text-red-800" },
  HIDDEN: { label: "隐藏", color: "bg-gray-100 text-gray-800" },
};

// 打印机类型映射
export const PRINTER_TYPE_MAP: Record<string, string> = {
  KITCHEN: "后厨",
  CASHIER: "收银",
  BAR: "吧台",
};

// 角色映射
export const ROLE_MAP: Record<string, string> = {
  SUPER_ADMIN: "超级管理员",
  OWNER: "店长",
  STAFF: "店员",
};
