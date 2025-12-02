import { Elysia, t } from "elysia";
import { eq, and, desc, gte, count, sum } from "drizzle-orm";
import { db, orders, orderItems, tables, products, productVariants, categories } from "../db";
import { success, error, pagination, generateOrderNo } from "../lib/utils";
import { broadcastToStore, broadcastToTable, WS_EVENTS } from "../ws";

export const orderRoutes = new Elysia({ prefix: "/api/orders" })
  .get(
    "/",
    async ({ query }) => {
      const { page, pageSize, storeId, tableId, status, orderNo } = query;
      const { take, skip } = pagination(page, pageSize);

      const conditions = [];
      if (storeId) conditions.push(eq(orders.storeId, storeId));
      if (tableId) conditions.push(eq(orders.tableId, tableId));
      if (status) {
        conditions.push(
          eq(
            orders.status,
            status as "PENDING" | "PAID" | "PREPARING" | "COMPLETED" | "CANCELLED" | "REFUNDED"
          )
        );
      }
      if (orderNo) conditions.push(eq(orders.orderNo, orderNo));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [orderList, totalResult] = await Promise.all([
        db
          .select()
          .from(orders)
          .leftJoin(tables, eq(orders.tableId, tables.id))
          .where(whereClause)
          .orderBy(desc(orders.createdAt))
          .limit(take)
          .offset(skip),
        db.select({ count: count() }).from(orders).where(whereClause),
      ]);

      return success({
        list: orderList.map((r) => ({ ...r.orders, table: r.tables })),
        total: totalResult[0]?.count ?? 0,
        page: page || 1,
        pageSize: take,
      });
    },
    {
      query: t.Object({
        page: t.Optional(t.Number()),
        pageSize: t.Optional(t.Number()),
        storeId: t.Optional(t.Number()),
        tableId: t.Optional(t.Number()),
        status: t.Optional(t.String()),
        orderNo: t.Optional(t.String()),
      }),
      detail: { tags: ["Orders"], summary: "获取订单列表" },
    }
  )
  .get(
    "/:id",
    async ({ params }) => {
      const [order] = await db
        .select()
        .from(orders)
        .leftJoin(tables, eq(orders.tableId, tables.id))
        .where(eq(orders.id, params.id))
        .limit(1);

      if (!order) return error("订单不存在", 404);

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, params.id));

      return success({ ...order.orders, table: order.tables, items });
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Orders"], summary: "获取订单详情" },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      const { storeId, tableId, userId, items, remark } = body;

      let totalAmount = 0;
      const orderItemsData = [];

      for (const item of items) {
        const [variant] = await db
          .select()
          .from(productVariants)
          .leftJoin(products, eq(productVariants.productId, products.id))
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(eq(productVariants.id, item.variantId))
          .limit(1);

        if (!variant) continue;

        const price = Number(variant.product_variants.price);
        totalAmount += price * item.quantity;

        orderItemsData.push({
          productVariantId: item.variantId,
          quantity: item.quantity,
          price: price.toString(),
          snapshot: {
            name: variant.products?.name || "",
            categoryName: variant.categories?.name || "",
            specs: variant.product_variants.specs || {},
          },
          attributes: item.attributes || null,
        });
      }

      const [order] = await db
        .insert(orders)
        .values({
          orderNo: generateOrderNo(),
          storeId,
          tableId,
          userId,
          totalAmount: totalAmount.toString(),
          payAmount: totalAmount.toString(),
          remark,
        })
        .returning();

      if (orderItemsData.length > 0) {
        await db.insert(orderItems).values(
          orderItemsData.map((item) => ({
            orderId: order!.id,
            ...item,
          }))
        );
      }

      // 广播新订单通知
      broadcastToStore(storeId, WS_EVENTS.NEW_ORDER, {
        order,
        itemCount: orderItemsData.length,
      });

      return success(order, "订单创建成功");
    },
    {
      body: t.Object({
        storeId: t.Number(),
        tableId: t.Number(),
        userId: t.Optional(t.Number()),
        items: t.Array(
          t.Object({
            variantId: t.Number(),
            quantity: t.Number(),
            attributes: t.Optional(t.Array(t.Any())),
          })
        ),
        remark: t.Optional(t.String()),
      }),
      detail: { tags: ["Orders"], summary: "创建订单" },
    }
  )
  .put(
    "/:id/status",
    async ({ params, body }) => {
      const updateData: Record<string, unknown> = {
        status: body.status as
          | "PENDING"
          | "PAID"
          | "PREPARING"
          | "COMPLETED"
          | "CANCELLED"
          | "REFUNDED",
      };
      if (body.status === "PAID") {
        updateData.payTime = new Date();
      }

      const [order] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, params.id))
        .returning();

      // 广播状态变更通知
      if (order) {
        broadcastToStore(order.storeId, WS_EVENTS.ORDER_STATUS_CHANGED, {
          order,
          newStatus: body.status,
        });

        // 同时通知桌台
        broadcastToTable(order.storeId, order.tableId, WS_EVENTS.ORDER_STATUS_CHANGED, {
        order,
          newStatus: body.status,
        });
      }

      return success(order, "状态更新成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({ status: t.String() }),
      detail: { tags: ["Orders"], summary: "更新订单状态" },
    }
  )
  .post(
    "/:id/refund",
    async ({ params, body }) => {
      const [order] = await db
        .update(orders)
        .set({ status: "REFUNDED" })
        .where(eq(orders.id, params.id))
        .returning();

      // 广播退款通知
      if (order) {
        broadcastToStore(order.storeId, WS_EVENTS.ORDER_REFUNDED, { order });
      }

      return success(order, "退款成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({ reason: t.Optional(t.String()) }),
      detail: { tags: ["Orders"], summary: "订单退款" },
    }
  )
  .get(
    "/today/stats",
    async ({ query }) => {
      const storeId = query.storeId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const conditions = [gte(orders.createdAt, today)];
      if (storeId) conditions.push(eq(orders.storeId, storeId));

      const paidConditions = [...conditions, eq(orders.status, "PAID")];

      const [stats] = await db
        .select({
          orderCount: count(),
          revenue: sum(orders.payAmount),
        })
        .from(orders)
        .where(and(...paidConditions));

      const pendingOrders = await db
        .select()
        .from(orders)
        .where(and(...conditions, eq(orders.status, "PENDING")));

      return success({
        orderCount: stats?.orderCount ?? 0,
        revenue: Number(stats?.revenue || 0),
        pendingOrders,
      });
    },
    {
      query: t.Object({ storeId: t.Optional(t.Number()) }),
      detail: { tags: ["Orders"], summary: "今日订单统计" },
    }
  );
