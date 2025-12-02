import Redis from "ioredis";

let redis: Redis | null = null;

try {
  redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn("⚠️ Redis unavailable, running without cache");
        return null; // 停止重试
      }
      return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
  });

  redis.on("connect", () => {
    console.log("✅ Redis connected");
  });

  redis.on("error", () => {
    // 静默处理错误，避免刷屏
  });

  // 尝试连接
  redis.connect().catch(() => {
    console.warn("⚠️ Redis connection failed, running without cache");
    redis = null;
  });
} catch {
  console.warn("⚠️ Redis unavailable, running without cache");
  redis = null;
}

export default redis;

// 购物车相关 Key 生成
export const cartKey = (storeId: number, tableId: number) => `cart:${storeId}:${tableId}`;

// 桌台 WebSocket 房间 Key
export const tableRoomKey = (storeId: number, tableId: number) =>
  `room:table:${storeId}:${tableId}`;

// 打印任务 Stream Key
export const PRINT_STREAM_KEY = "stream:print_jobs";

// 订单事件 Stream Key
export const ORDER_STREAM_KEY = "stream:order_events";
