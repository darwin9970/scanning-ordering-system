"use server";

process.env.NODE_ENV = "test";

import { describe, it, expect, beforeEach } from "bun:test";
import { MemoryRedis, createTestToken, injectTestRedis } from "./helpers";
import { setTestRedis } from "../lib/redis";
import { setTestDb } from "../db";

type TableRecord = {
  id: number;
  storeId: number;
  name: string;
  capacity: number;
  qrCode: string;
};

function createDbMock(options?: {
  storeExists?: boolean;
  table?: TableRecord | null;
  insertConflict?: boolean;
}) {
  const storeRow = options?.storeExists === false ? null : { id: 1, name: "测试门店" };
  const tableRow: TableRecord | null =
    options?.table === undefined
      ? { id: 1, storeId: 1, name: "T01", capacity: 4, qrCode: "old-qr" }
      : options.table;

  const tableInserts: TableRecord[] = [];
  const opLogInserts: any[] = [];
  let qrUpdateCount = 0;

  function isTablesTarget(target: unknown) {
    return (
      target &&
      typeof target === "object" &&
      "storeId" in (target as Record<string, unknown>) &&
      "qrCode" in target
    );
  }

  function isStoresTarget(target: unknown) {
    return (
      target &&
      typeof target === "object" &&
      "name" in (target as Record<string, unknown>) &&
      !("qrCode" in target)
    );
  }

  function isOpLogTarget(target: unknown) {
    return target && typeof target === "object" && "action" in (target as Record<string, unknown>);
  }

  const db: any = {
    select() {
      return {
        from: (target: unknown) => ({
          where: () => ({
            limit: async () => {
              if (isStoresTarget(target)) {
                return storeRow ? [storeRow] : [];
              }
              if (isTablesTarget(target)) {
                return tableRow ? [tableRow] : [];
              }
              return [];
            },
          }),
          limit: async () => {
            if (isStoresTarget(target)) {
              return storeRow ? [storeRow] : [];
            }
            if (isTablesTarget(target)) {
              return tableRow ? [tableRow] : [];
            }
            return [];
          },
        }),
      };
    },
    insert(target: unknown) {
      return {
        values: (vals: any) => {
          return {
            onConflictDoNothing() {
              return {
                async returning() {
                  if (isTablesTarget(target)) {
                    const list: TableRecord[] = Array.isArray(vals) ? vals : [vals];
                    if (options?.insertConflict) {
                      return [];
                    }
                    tableInserts.push(...list);
                    return list.map((v, idx) => ({ ...v, id: idx + 1 }));
                  }
                  return [];
                },
              };
            },
            async returning() {
              if (isTablesTarget(target)) {
                const list: TableRecord[] = Array.isArray(vals) ? vals : [vals];
                tableInserts.push(...list);
                return list.map((v, idx) => ({ ...v, id: idx + 1 }));
              }
              if (isOpLogTarget(target)) {
                opLogInserts.push(vals);
                return [];
              }
              return [];
            },
            async then(cb: (rows: any[]) => unknown) {
              // support promise-like for cases without explicit returning()
              const result = isOpLogTarget(target)
                ? []
                : Array.isArray(vals)
                  ? vals
                  : vals
                    ? [vals]
                    : [];
              return cb(result);
            },
          };
        },
      };
    },
    update(_target: unknown) {
      return {
        set: (payload: any) => ({
          where: () => ({
            async returning() {
              // Check if this is a tables qrCode update by payload content
              // payload should be { qrCode: "..." } for qrcode regeneration
              if (payload && typeof payload === "object" && "qrCode" in payload && tableRow) {
                qrUpdateCount += 1;
                const updated = { ...tableRow, ...payload };
                return [updated];
              }
              // For other updates, return empty array
              return [];
            },
          }),
        }),
      };
    },
    delete() {
      return {
        where: async () => [],
      };
    },
  };

  // Use getter to access current qrUpdateCount value
  (db as any).__state = {
    storeRow,
    tableRow,
    tableInserts,
    opLogInserts,
    get qrUpdateCount() {
      return qrUpdateCount;
    },
  };

  return db;
}

async function buildApp() {
  const { Elysia } = await import("elysia");
  const { tableRoutes } = await import("../routes/tables");
  const { authPlugin } = await import("../lib/auth");
  return new Elysia().use(authPlugin).use(tableRoutes);
}

function authHeader() {
  const token = createTestToken(
    { id: 1, username: "tester", role: "OWNER", storeId: 1 },
    process.env.JWT_SECRET || "your-super-secret-key-change-in-production"
  );
  return { authorization: `Bearer ${token}` };
}

describe("tables safeguards", () => {
  beforeEach(() => {
    injectTestRedis(new MemoryRedis());
    setTestRedis((globalThis as any).__TEST_REDIS__ as any);
  });

  async function parseJson(resp: Response): Promise<{ code: number; data?: unknown }> {
    try {
      return (await resp.json()) as { code: number; data?: unknown };
    } catch {
      try {
        const text = await resp.text();
        return { code: resp.status || 500, data: { raw: text } };
      } catch {
        return { code: resp.status || 500 };
      }
    }
  }

  it("batch create succeeds", async () => {
    const freshRedis = new MemoryRedis();
    injectTestRedis(freshRedis);
    setTestRedis(freshRedis as any);
    // Clear any potential keys before test
    await freshRedis.del("rate:table:batch:1");
    await freshRedis.del("idem:table:batch:batch-1");

    const db = createDbMock();
    setTestDb(db as any);
    const app = await buildApp();
    const headers = {
      ...authHeader(),
      "content-type": "application/json",
      "idempotency-key": "batch-1",
    };
    const body = { storeId: 1, prefix: "A", startNum: 1, count: 3, capacity: 4 };

    const resp = await app.handle(
      new Request("http://localhost/api/tables/batch", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })
    );
    const json = await parseJson(resp);

    expect(json.code).toBe(200);
    expect((json.data as { count?: number })?.count).toBe(3);
    const state = (db as any).__state;
    expect(state.tableInserts.length).toBe(3);
  });

  it("batch create hits rate limit under high frequency", async () => {
    setTestDb(createDbMock() as any);
    const app = await buildApp();
    const headers = { ...authHeader(), "content-type": "application/json" };
    const body = { storeId: 1, prefix: "B", startNum: 1, count: 1, capacity: 2 };

    const codes: number[] = [];
    for (let i = 0; i < 30; i++) {
      const resp = await app.handle(
        new Request("http://localhost/api/tables/batch", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        })
      );
      const json = await parseJson(resp);
      codes.push(json.code);
    }
    expect(codes).toContain(429);
  });

  it("batch create rejects duplicate idempotency key", async () => {
    // Use fresh Redis instance for this test
    const freshRedis = new MemoryRedis();
    injectTestRedis(freshRedis);
    setTestRedis(freshRedis as any);
    // Clear any potential keys before test
    await freshRedis.del("rate:table:batch:1");
    await freshRedis.del("idem:table:batch:batch-dup");

    const db = createDbMock();
    setTestDb(db as any);
    const app = await buildApp();
    const headers = {
      ...authHeader(),
      "content-type": "application/json",
      "idempotency-key": "batch-dup",
    };
    const body = { storeId: 1, prefix: "C", startNum: 1, count: 2, capacity: 4 };

    const first = await app.handle(
      new Request("http://localhost/api/tables/batch", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })
    );
    const firstJson = await parseJson(first);
    expect(firstJson.code).not.toBe(409);

    const second = await app.handle(
      new Request("http://localhost/api/tables/batch", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })
    );
    const secondJson = await parseJson(second);
    expect([409, 429]).toContain(secondJson.code);

    const state = (db as any).__state;
    expect(state.tableInserts.length).toBeLessThanOrEqual(2);
  });

  it("qrcode regenerate succeeds", async () => {
    // Use fresh Redis instance to avoid state pollution
    const freshRedis = new MemoryRedis();
    injectTestRedis(freshRedis);
    setTestRedis(freshRedis as any);
    // Clear any potential keys before test
    await freshRedis.del("rate:table:qrcode:1");
    await freshRedis.del("idem:table:qrcode:qr-1");

    const db = createDbMock({
      table: { id: 1, storeId: 1, name: "T01", capacity: 4, qrCode: "old-qr" },
    });
    setTestDb(db as any);
    const app = await buildApp();
    const headers = {
      ...authHeader(),
      "content-type": "application/json",
      "idempotency-key": "qr-1",
    };

    const resp = await app.handle(
      new Request("http://localhost/api/tables/1/qrcode", { method: "PUT", headers })
    );
    const json = await parseJson(resp);
    expect(json.code).toBe(200);
    const state = (db as any).__state;
    expect(state.qrUpdateCount).toBe(1);
  });

  it("qrcode regenerate rejects duplicate idempotency key", async () => {
    // Use fresh Redis instance for this test
    const freshRedis = new MemoryRedis();
    injectTestRedis(freshRedis);
    setTestRedis(freshRedis as any);
    // Clear any potential keys before test
    await freshRedis.del("rate:table:qrcode:1");
    await freshRedis.del("idem:table:qrcode:qr-dup");

    const db = createDbMock({
      table: { id: 1, storeId: 1, name: "T01", capacity: 4, qrCode: "old-qr" },
    });
    setTestDb(db as any);
    const app = await buildApp();
    const headers = {
      ...authHeader(),
      "content-type": "application/json",
      "idempotency-key": "qr-dup",
    };

    const first = await app.handle(
      new Request("http://localhost/api/tables/1/qrcode", { method: "PUT", headers })
    );
    const firstJson = await parseJson(first);
    expect(firstJson.code).not.toBe(409);

    const second = await app.handle(
      new Request("http://localhost/api/tables/1/qrcode", { method: "PUT", headers })
    );
    const secondJson = await parseJson(second);
    expect([409, 429]).toContain(secondJson.code);

    const state = (db as any).__state;
    expect(state.qrUpdateCount).toBeLessThanOrEqual(1);
  });
});
