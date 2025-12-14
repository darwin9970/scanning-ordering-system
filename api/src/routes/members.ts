import { Elysia, t } from "elysia";
import { eq, and, desc, count, sql, like, gte, lte } from "drizzle-orm";
import { db, members, users, orders, storeMembers } from "../db";
import { success, error, pagination } from "../lib/utils";
import { requirePermission } from "../lib/auth";

// 积分规则：每消费1元获得1积分
const POINTS_PER_YUAN = 1;
// 积分抵扣：100积分抵扣1元
const POINTS_TO_YUAN = 100;

async function ensureStoreMember(storeId: number, userId: number) {
  const [existing] = await db
    .select()
    .from(storeMembers)
    .where(and(eq(storeMembers.storeId, storeId), eq(storeMembers.userId, userId)))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(storeMembers)
    .values({ storeId, userId, level: 1, points: 0 })
    .returning();
  return created;
}

export const memberRoutes = new Elysia({ prefix: "/api/members" })
  // 会员读取需要 member:read 权限
  .use(requirePermission("member:read"))
  // 获取所有用户列表（管理端）
  .get(
    "/users",
    async ({ query }) => {
      const { page, pageSize, keyword, hasPhone } = query;
      const { take, skip } = pagination(page, pageSize);

      const conditions = [];
      if (keyword) {
        conditions.push(like(users.nickname, `%${keyword}%`));
      }
      if (hasPhone === true) {
        conditions.push(sql`${users.phone} IS NOT NULL AND ${users.phone} != ''`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [userList, totalResult] = await Promise.all([
        db
          .select({
            user: users,
            member: members,
          })
          .from(users)
          .leftJoin(members, eq(users.id, members.userId))
          .where(whereClause)
          .orderBy(desc(users.createdAt))
          .limit(take)
          .offset(skip),
        db.select({ count: count() }).from(users).where(whereClause),
      ]);

      return success({
        list: userList.map((r) => ({
          ...r.user,
          member: r.member,
        })),
        total: totalResult[0]?.count ?? 0,
        page: page || 1,
        pageSize: take,
      });
    },
    {
      query: t.Object({
        page: t.Optional(t.Number()),
        pageSize: t.Optional(t.Number()),
        keyword: t.Optional(t.String()),
        hasPhone: t.Optional(t.Boolean()),
      }),
      detail: { tags: ["Members"], summary: "获取所有用户列表" },
    }
  )

  // 获取会员列表（管理端）
  .get(
    "/",
    async ({ query }) => {
      const { page, pageSize, keyword, level, minPoints, maxPoints } = query;
      const { take, skip } = pagination(page, pageSize);

      // 构建查询条件
      const memberQuery = db
        .select({
          member: members,
          user: users,
        })
        .from(members)
        .leftJoin(users, eq(members.userId, users.id));

      // 根据关键词搜索用户昵称或手机号
      const conditions = [];
      if (keyword) {
        conditions.push(
          sql`(${users.nickname} LIKE ${"%" + keyword + "%"} OR ${users.phone} LIKE ${"%" + keyword + "%"})`
        );
      }
      if (level) {
        conditions.push(eq(members.level, level));
      }
      if (minPoints !== undefined) {
        conditions.push(gte(members.points, minPoints));
      }
      if (maxPoints !== undefined) {
        conditions.push(lte(members.points, maxPoints));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [memberList, totalResult] = await Promise.all([
        db
          .select({
            member: members,
            user: users,
          })
          .from(members)
          .leftJoin(users, eq(members.userId, users.id))
          .where(whereClause)
          .orderBy(desc(members.points), desc(members.createdAt))
          .limit(take)
          .offset(skip),
        db
          .select({ count: count() })
          .from(members)
          .where(level ? eq(members.level, level) : undefined),
      ]);

      // 获取每个会员的消费统计
      const result = await Promise.all(
        memberList.map(async (r) => {
          const [stats] = await db
            .select({
              totalOrders: count(),
              totalAmount: sql<string>`COALESCE(SUM(${orders.payAmount}), 0)`,
            })
            .from(orders)
            .where(eq(orders.userId, r.member.userId));

          return {
            ...r.member,
            user: r.user,
            stats: {
              totalOrders: stats?.totalOrders ?? 0,
              totalAmount: Number(stats?.totalAmount || 0),
            },
          };
        })
      );

      return success({
        list: result,
        total: totalResult[0]?.count ?? 0,
        page: page || 1,
        pageSize: take,
      });
    },
    {
      query: t.Object({
        page: t.Optional(t.Number()),
        pageSize: t.Optional(t.Number()),
        keyword: t.Optional(t.String()),
        level: t.Optional(t.Number()),
        minPoints: t.Optional(t.Number()),
        maxPoints: t.Optional(t.Number()),
      }),
      detail: { tags: ["Members"], summary: "获取会员列表" },
    }
  )

  // 获取会员详情
  .get(
    "/:id",
    async ({ params }) => {
      const [member] = await db
        .select({
          member: members,
          user: users,
        })
        .from(members)
        .leftJoin(users, eq(members.userId, users.id))
        .where(eq(members.id, params.id))
        .limit(1);

      if (!member) return error("会员不存在", 404);

      // 获取消费统计
      const [orderStats] = await db
        .select({
          totalOrders: count(),
          totalAmount: sql<string>`COALESCE(SUM(${orders.payAmount}), 0)`,
        })
        .from(orders)
        .where(eq(orders.userId, member.member.userId));

      return success({
        ...member.member,
        user: member.user,
        stats: {
          totalOrders: orderStats?.totalOrders ?? 0,
          totalAmount: Number(orderStats?.totalAmount || 0),
        },
      });
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Members"], summary: "获取会员详情" },
    }
  )

  // 通过用户ID获取会员信息
  .get(
    "/user/:userId",
    async ({ params, query }) => {
      const storeId = query.storeId;
      const [member] = await db
        .select({
          member: members,
          user: users,
        })
        .from(members)
        .leftJoin(users, eq(members.userId, users.id))
        .where(eq(members.userId, params.userId))
        .limit(1);

      if (!member) {
        // 自动创建会员
        const [newMember] = await db
          .insert(members)
          .values({
            userId: params.userId,
            level: 1,
            points: 0,
          })
          .returning();

        const [user] = await db.select().from(users).where(eq(users.id, params.userId)).limit(1);

        return success({
          ...newMember,
          user,
          isNew: true,
        });
      }

      let storeMember;
      if (storeId) {
        storeMember = await ensureStoreMember(storeId, params.userId);
      }

      return success({
        ...member.member,
        user: member.user,
        storeMember: storeMember ?? null,
      });
    },
    {
      params: t.Object({ userId: t.Number() }),
      query: t.Object({ storeId: t.Optional(t.Number()) }),
      detail: { tags: ["Members"], summary: "通过用户ID获取会员信息" },
    }
  )

  // 获取积分规则
  .get(
    "/points/rules",
    async () => {
      return success({
        earnRate: POINTS_PER_YUAN, // 每消费1元获得积分
        redeemRate: POINTS_TO_YUAN, // 多少积分抵扣1元
        minRedeemPoints: 100, // 最低使用积分
        maxRedeemPercent: 0.5, // 最多抵扣订单金额的比例
      });
    },
    {
      detail: { tags: ["Members"], summary: "获取积分规则" },
    }
  )

  // 计算积分可抵扣金额
  .post(
    "/points/calculate",
    async ({ body }) => {
      const { userId, orderAmount, pointsToUse } = body;

      // 获取会员积分
      const [member] = await db.select().from(members).where(eq(members.userId, userId)).limit(1);

      if (!member) {
        return success({
          availablePoints: 0,
          maxUsablePoints: 0,
          discount: 0,
          message: "非会员用户",
        });
      }

      const availablePoints = member.points;

      // 计算最大可用积分（不超过订单金额的50%对应的积分）
      const maxDiscountAmount = orderAmount * 0.5;
      const maxPointsForDiscount = Math.floor(maxDiscountAmount * POINTS_TO_YUAN);
      const maxUsablePoints = Math.min(availablePoints, maxPointsForDiscount);

      // 计算实际使用积分
      const actualPointsToUse = pointsToUse ? Math.min(pointsToUse, maxUsablePoints) : 0;

      // 计算抵扣金额
      const discount = actualPointsToUse / POINTS_TO_YUAN;

      return success({
        availablePoints,
        maxUsablePoints,
        pointsToUse: actualPointsToUse,
        discount: Math.round(discount * 100) / 100,
        finalAmount: Math.round((orderAmount - discount) * 100) / 100,
      });
    },
    {
      body: t.Object({
        userId: t.Number(),
        orderAmount: t.Number({ minimum: 0 }),
        pointsToUse: t.Optional(t.Number({ minimum: 0 })),
      }),
      detail: { tags: ["Members"], summary: "计算积分抵扣" },
    }
  )

  // 使用积分（下单时调用）
  .post(
    "/points/use",
    async ({ body }) => {
      const { userId, points, orderId, description } = body;

      const [member] = await db.select().from(members).where(eq(members.userId, userId)).limit(1);

      if (!member) return error("会员不存在", 404);

      if (member.points < points) {
        return error("积分不足", 400);
      }

      // 扣除积分
      const [updated] = await db
        .update(members)
        .set({
          points: sql`${members.points} - ${points}`,
        })
        .where(eq(members.userId, userId))
        .returning();

      return success(
        {
          ...updated,
          pointsUsed: points,
          discount: points / POINTS_TO_YUAN,
        },
        "积分使用成功"
      );
    },
    {
      body: t.Object({
        userId: t.Number(),
        points: t.Number({ minimum: 1 }),
        orderId: t.Optional(t.Number()),
        description: t.Optional(t.String()),
      }),
      detail: { tags: ["Members"], summary: "使用积分" },
    }
  )

  // 增加积分（订单完成后调用）
  .post(
    "/points/earn",
    async ({ body }) => {
      const { userId, amount, orderId, description } = body;

      // 计算获得的积分
      const earnedPoints = Math.floor(amount * POINTS_PER_YUAN);

      if (earnedPoints <= 0) {
        return success({ earnedPoints: 0 }, "消费金额过低，未获得积分");
      }

      // 查找或创建会员
      let [member] = await db.select().from(members).where(eq(members.userId, userId)).limit(1);

      if (!member) {
        [member] = await db
          .insert(members)
          .values({
            userId,
            level: 1,
            points: earnedPoints,
          })
          .returning();
      } else {
        [member] = await db
          .update(members)
          .set({
            points: sql`${members.points} + ${earnedPoints}`,
          })
          .where(eq(members.userId, userId))
          .returning();
      }

      // 检查是否需要升级
      const newLevel = calculateLevel(member!.points);
      if (newLevel > member!.level) {
        await db.update(members).set({ level: newLevel }).where(eq(members.userId, userId));
      }

      return success(
        {
          ...member,
          earnedPoints,
          newLevel: newLevel > member!.level ? newLevel : undefined,
        },
        `获得 ${earnedPoints} 积分`
      );
    },
    {
      body: t.Object({
        userId: t.Number(),
        amount: t.Number({ minimum: 0 }),
        orderId: t.Optional(t.Number()),
        description: t.Optional(t.String()),
      }),
      detail: { tags: ["Members"], summary: "获得积分" },
    }
  )

  // 管理员调整积分
  .put(
    "/:id/points",
    async ({ params, body }) => {
      const { points, reason } = body;

      const [member] = await db
        .update(members)
        .set({
          points: sql`${members.points} + ${points}`,
        })
        .where(eq(members.id, params.id))
        .returning();

      if (!member) return error("会员不存在", 404);

      return success(member, points > 0 ? "积分增加成功" : "积分扣除成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        points: t.Number(), // 正数增加，负数扣除
        reason: t.Optional(t.String()),
      }),
      detail: { tags: ["Members"], summary: "调整会员积分" },
    }
  )

  // 调整会员等级
  .put(
    "/:id/level",
    async ({ params, body }) => {
      const [member] = await db
        .update(members)
        .set({ level: body.level })
        .where(eq(members.id, params.id))
        .returning();

      if (!member) return error("会员不存在", 404);

      return success(member, "等级调整成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        level: t.Number({ minimum: 1, maximum: 10 }),
      }),
      detail: { tags: ["Members"], summary: "调整会员等级" },
    }
  )

  // 获取会员订单历史
  .get(
    "/:id/orders",
    async ({ params, query }) => {
      const { page, pageSize } = query;
      const { take, skip } = pagination(page, pageSize);

      // 先获取会员的 userId
      const [member] = await db.select().from(members).where(eq(members.id, params.id)).limit(1);

      if (!member) return error("会员不存在", 404);

      const [orderList, totalResult] = await Promise.all([
        db
          .select()
          .from(orders)
          .where(eq(orders.userId, member.userId))
          .orderBy(desc(orders.createdAt))
          .limit(take)
          .offset(skip),
        db.select({ count: count() }).from(orders).where(eq(orders.userId, member.userId)),
      ]);

      return success({
        list: orderList,
        total: totalResult[0]?.count ?? 0,
        page: page || 1,
        pageSize: take,
      });
    },
    {
      params: t.Object({ id: t.Number() }),
      query: t.Object({
        page: t.Optional(t.Number()),
        pageSize: t.Optional(t.Number()),
      }),
      detail: { tags: ["Members"], summary: "获取会员订单历史" },
    }
  )

  // 为用户创建/开通会员
  .post(
    "/create",
    async ({ body }) => {
      const { userId, level, points } = body;

      // 检查用户是否存在
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) return error("用户不存在", 404);

      // 检查是否已有会员记录
      const [existingMember] = await db
        .select()
        .from(members)
        .where(eq(members.userId, userId))
        .limit(1);

      if (existingMember) {
        return error("该用户已是会员", 400);
      }

      const [member] = await db
        .insert(members)
        .values({
          userId,
          level: level || 1,
          points: points || 0,
        })
        .returning();

      return success(member, "会员创建成功");
    },
    {
      body: t.Object({
        userId: t.Number(),
        level: t.Optional(t.Number({ minimum: 1, maximum: 10 })),
        points: t.Optional(t.Number({ minimum: 0 })),
      }),
      detail: { tags: ["Members"], summary: "创建会员" },
    }
  )

  // 获取会员等级配置
  .get(
    "/levels/config",
    async () => {
      return success({
        levels: [
          { level: 1, name: "普通会员", minPoints: 0, discount: 1.0 },
          { level: 2, name: "银卡会员", minPoints: 500, discount: 0.98 },
          { level: 3, name: "金卡会员", minPoints: 2000, discount: 0.95 },
          { level: 4, name: "铂金会员", minPoints: 5000, discount: 0.92 },
          { level: 5, name: "钻石会员", minPoints: 10000, discount: 0.88 },
        ],
        pointsRule: {
          earnRate: POINTS_PER_YUAN,
          redeemRate: POINTS_TO_YUAN,
        },
      });
    },
    {
      detail: { tags: ["Members"], summary: "获取会员等级配置" },
    }
  )

  // 会员统计数据
  .get(
    "/stats",
    async () => {
      const [totalMembers] = await db.select({ count: count() }).from(members);

      // 各等级会员数量
      const levelStats = await Promise.all(
        [1, 2, 3, 4, 5].map(async (level) => {
          const [result] = await db
            .select({ count: count() })
            .from(members)
            .where(eq(members.level, level));
          return { level, count: result?.count ?? 0 };
        })
      );

      // 总积分
      const [pointsStats] = await db
        .select({
          totalPoints: sql<number>`COALESCE(SUM(${members.points}), 0)`,
        })
        .from(members);

      return success({
        totalMembers: totalMembers?.count ?? 0,
        levelStats,
        totalPoints: Number(pointsStats?.totalPoints || 0),
      });
    },
    {
      detail: { tags: ["Members"], summary: "获取会员统计数据" },
    }
  );

// 根据积分计算等级
function calculateLevel(points: number): number {
  if (points >= 10000) return 5;
  if (points >= 5000) return 4;
  if (points >= 2000) return 3;
  if (points >= 500) return 2;
  return 1;
}
