import { Elysia, t } from "elysia";
import { eq, and, gte, lte, count, desc } from "drizzle-orm";
import { db, promotions } from "../db";
import { success, error, pagination } from "../lib/utils";
import { requirePermission } from "../lib/auth";
import { logOperation } from "../lib/operation-log";

// 满减规则类型
interface FullReduceRule {
  tiers: { min: number; discount: number }[];
}

// 折扣规则类型
interface DiscountRule {
  discount: number; // 0.8 表示8折
  maxDiscount?: number;
}

// 计算满减优惠
export function calculateFullReduceDiscount(amount: number, rules: FullReduceRule): number {
  const sortedTiers = [...rules.tiers].sort((a, b) => b.min - a.min);
  for (const tier of sortedTiers) {
    if (amount >= tier.min) {
      return tier.discount;
    }
  }
  return 0;
}

// 计算折扣优惠
export function calculateDiscountAmount(amount: number, rules: DiscountRule): number {
  const discount = amount * (1 - rules.discount);
  if (rules.maxDiscount && discount > rules.maxDiscount) {
    return rules.maxDiscount;
  }
  return discount;
}

export const promotionRoutes = new Elysia({ prefix: "/api/promotions" })
  // 营销活动读取需要 promotion:read 权限
  .use(requirePermission("promotion:read"))
  // 获取活动列表（管理端）
  .get(
    "/",
    async ({ query }) => {
      const { page, pageSize, storeId, status, type } = query;
      const { take, skip } = pagination(page, pageSize);

      const conditions = [];
      if (storeId) conditions.push(eq(promotions.storeId, storeId));
      if (status) conditions.push(eq(promotions.status, status as "ACTIVE" | "INACTIVE"));
      if (type)
        conditions.push(
          eq(promotions.type, type as "FULL_REDUCE" | "DISCOUNT" | "NEW_USER" | "TIME_LIMITED")
        );

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [promotionList, totalResult] = await Promise.all([
        db
          .select()
          .from(promotions)
          .where(whereClause)
          .orderBy(desc(promotions.priority), desc(promotions.createdAt))
          .limit(take)
          .offset(skip),
        db.select({ count: count() }).from(promotions).where(whereClause),
      ]);

      return success({
        list: promotionList,
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
        status: t.Optional(t.String()),
        type: t.Optional(t.String()),
      }),
      detail: { tags: ["Promotions"], summary: "获取活动列表" },
    }
  )

  // 获取活动详情
  .get(
    "/:id",
    async ({ params }) => {
      const [promotion] = await db
        .select()
        .from(promotions)
        .where(eq(promotions.id, params.id))
        .limit(1);

      if (!promotion) return error("活动不存在", 404);
      return success(promotion);
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Promotions"], summary: "获取活动详情" },
    }
  )

  // 创建活动
  .post(
    "/",
    async ({ body }) => {
      const [promotion] = await db
        .insert(promotions)
        .values({
          storeId: body.storeId,
          name: body.name,
          type: body.type as "FULL_REDUCE" | "DISCOUNT" | "NEW_USER" | "TIME_LIMITED",
          rules: body.rules,
          startTime: new Date(body.startTime),
          endTime: new Date(body.endTime),
          description: body.description,
          priority: body.priority ?? 0,
          stackable: body.stackable ?? false,
        })
        .returning();

      return success(promotion, "活动创建成功");
    },
    {
      body: t.Object({
        storeId: t.Optional(t.Number()),
        name: t.String({ minLength: 1, maxLength: 100 }),
        type: t.Union([
          t.Literal("FULL_REDUCE"),
          t.Literal("DISCOUNT"),
          t.Literal("NEW_USER"),
          t.Literal("TIME_LIMITED"),
        ]),
        rules: t.Any(), // JSON 规则
        startTime: t.String(),
        endTime: t.String(),
        description: t.Optional(t.String()),
        priority: t.Optional(t.Number()),
        stackable: t.Optional(t.Boolean()),
      }),
      detail: { tags: ["Promotions"], summary: "创建活动" },
    }
  )

  // 更新活动
  .put(
    "/:id",
    async ({ params, body }) => {
      const updateData: Record<string, unknown> = {};

      if (body.name !== undefined) updateData.name = body.name;
      if (body.type !== undefined) updateData.type = body.type;
      if (body.rules !== undefined) updateData.rules = body.rules;
      if (body.startTime !== undefined) updateData.startTime = new Date(body.startTime);
      if (body.endTime !== undefined) updateData.endTime = new Date(body.endTime);
      if (body.description !== undefined) updateData.description = body.description;
      if (body.priority !== undefined) updateData.priority = body.priority;
      if (body.stackable !== undefined) updateData.stackable = body.stackable;
      if (body.status !== undefined) updateData.status = body.status;

      const [promotion] = await db
        .update(promotions)
        .set(updateData)
        .where(eq(promotions.id, params.id))
        .returning();

      if (!promotion) return error("活动不存在", 404);

      return success(promotion, "活动更新成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        name: t.Optional(t.String()),
        type: t.Optional(t.String()),
        rules: t.Optional(t.Any()),
        startTime: t.Optional(t.String()),
        endTime: t.Optional(t.String()),
        description: t.Optional(t.String()),
        priority: t.Optional(t.Number()),
        stackable: t.Optional(t.Boolean()),
        status: t.Optional(t.String()),
      }),
      detail: { tags: ["Promotions"], summary: "更新活动" },
    }
  )

  // 删除活动
  .delete(
    "/:id",
    async ({ params, user }) => {
      const [existing] = await db
        .select()
        .from(promotions)
        .where(eq(promotions.id, params.id))
        .limit(1);
      await db.delete(promotions).where(eq(promotions.id, params.id));

      await logOperation({
        adminId: user?.id,
        action: "delete",
        targetType: "promotion",
        targetId: params.id,
        storeId: existing?.storeId ?? null,
        details: { name: existing?.name, type: existing?.type },
      });
      return success(null, "活动删除成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Promotions"], summary: "删除活动" },
    }
  )

  // 获取当前有效活动（用户端）
  .get(
    "/active",
    async ({ query }) => {
      const { storeId } = query;
      const now = new Date();

      const conditions = [
        eq(promotions.status, "ACTIVE"),
        lte(promotions.startTime, now),
        gte(promotions.endTime, now),
      ];
      if (storeId) conditions.push(eq(promotions.storeId, storeId));

      const activePromotions = await db
        .select()
        .from(promotions)
        .where(and(...conditions))
        .orderBy(desc(promotions.priority));

      return success(activePromotions);
    },
    {
      query: t.Object({
        storeId: t.Optional(t.Number()),
      }),
      detail: { tags: ["Promotions"], summary: "获取当前有效活动" },
    }
  )

  // 计算订单优惠（预览）
  .post(
    "/calculate",
    async ({ body }) => {
      const { storeId, amount, isNewUser } = body;
      const now = new Date();

      // 获取有效活动
      const conditions = [
        eq(promotions.status, "ACTIVE"),
        lte(promotions.startTime, now),
        gte(promotions.endTime, now),
      ];
      if (storeId) conditions.push(eq(promotions.storeId, storeId));

      const activePromotions = await db
        .select()
        .from(promotions)
        .where(and(...conditions))
        .orderBy(desc(promotions.priority));

      let totalDiscount = 0;
      const appliedPromotions: Array<{
        id: number;
        name: string;
        type: string;
        discount: number;
      }> = [];

      for (const promo of activePromotions) {
        // 新人专享检查
        if (promo.type === "NEW_USER" && !isNewUser) {
          continue;
        }

        let discount = 0;

        if (promo.type === "FULL_REDUCE") {
          const rules = promo.rules as unknown as FullReduceRule;
          discount = calculateFullReduceDiscount(amount, rules);
        } else if (promo.type === "DISCOUNT" || promo.type === "TIME_LIMITED") {
          const rules = promo.rules as unknown as DiscountRule;
          discount = calculateDiscountAmount(amount, rules);
        } else if (promo.type === "NEW_USER") {
          const rules = promo.rules as { discount: number };
          discount = rules.discount;
        }

        if (discount > 0) {
          appliedPromotions.push({
            id: promo.id,
            name: promo.name,
            type: promo.type,
            discount: Math.round(discount * 100) / 100,
          });

          totalDiscount += discount;

          // 如果不可叠加，只应用第一个
          if (!promo.stackable) {
            break;
          }
        }
      }

      return success({
        originalAmount: amount,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        finalAmount: Math.round((amount - totalDiscount) * 100) / 100,
        appliedPromotions,
      });
    },
    {
      body: t.Object({
        storeId: t.Optional(t.Number()),
        amount: t.Number({ minimum: 0 }),
        isNewUser: t.Optional(t.Boolean()),
      }),
      detail: { tags: ["Promotions"], summary: "计算订单优惠" },
    }
  );
