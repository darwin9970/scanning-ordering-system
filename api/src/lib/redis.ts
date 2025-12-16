import Redis from "ioredis";

let redis: Redis | null = null;

try {
  const testRedis = (globalThis as any).__TEST_REDIS__;
  if (process.env.NODE_ENV === "test" && testRedis) {
    // In tests we inject an in-memory stub via global flag.
    redis = testRedis;
  } else {
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
  }
} catch {
  console.warn("⚠️ Redis unavailable, running without cache");
  redis = null;
}

export default redis;

// For tests: allow swapping redis instance after module load.
export function setTestRedis(mock: Redis | null) {
  if (process.env.NODE_ENV === "test") {
    redis = mock;
  }
}

export function getRedis() {
  if (process.env.NODE_ENV === "test" && (globalThis as any).__TEST_REDIS__) {
    return (globalThis as any).__TEST_REDIS__ as Redis | null;
  }
  return redis;
}

// 购物车相关 Key 生成
export const cartKey = (storeId: number, tableId: number) => `cart:${storeId}:${tableId}`;

// 桌台 WebSocket 房间 Key
export const tableRoomKey = (storeId: number, tableId: number) =>
  `room:table:${storeId}:${tableId}`;

// 打印任务 Stream Key
export const PRINT_STREAM_KEY = "stream:print_jobs";

// 订单事件 Stream Key
export const ORDER_STREAM_KEY = "stream:order_events";
