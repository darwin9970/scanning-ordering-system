/**
 * 小程序公共接口 - 无需认证
 */
import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq, and, asc, desc, count, sql } from "drizzle-orm";
import {
  db,
  tables,
  stores,
  categories,
  products,
  banners,
  coupons,
  users,
  members,
  storeMembers,
  userCoupons,
  productVariants,
  pointLogs,
  orders,
  orderItems,
} from "../db";
import { success, error } from "../lib/utils";

const jwtSecret = process.env.JWT_SECRET || "your-super-secret-key-change-in-production";

// 单独的 JWT 插件，面向小程序用户
const miniJwt = jwt({
  name: "miniJwt",
  secret: jwtSecret,
  exp: "30d",
});

async function verifyMiniUser(headers: Record<string, string>, miniJwtPlugin: any) {
  const authorization = headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  try {
    return await miniJwtPlugin.verify(token);
  } catch {
    return null;
  }
}

async function exchangeJsCode(code: string) {
  const appId = process.env.WX_APP_ID;
  const secret = process.env.WX_APP_SECRET;

  // 无配置时使用本地 mock，便于开发调试
  if (!appId || !secret) {
    return {
      openid: `mock_${code}`,
      session_key: `mock_session_${code}`,
    };
  }

  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    openid?: string;
    unionid?: string;
    session_key?: string;
    errcode?: number;
    errmsg?: string;
  };
  if (data.errcode) {
    throw new Error(data.errmsg || "微信登录失败");
  }
  if (!data.openid) {
    throw new Error("获取 openid 失败");
  }
  return { openid: data.openid, unionid: data.unionid, session_key: data.session_key || "" };
}

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

const POINTS_PER_YUAN = 1; // 每元积1分
const POINTS_TO_YUAN = 100; // 100 分抵 1 元
const MAX_REDEEM_PERCENT = 0.5; // 单笔最多抵 50%

export const miniRoutes = new Elysia({ prefix: "/mini" })
  .use(miniJwt)

  // 小程序登录：换取 openid 并发 JWT
  .post(
    "/auth/login",
    async ({ body, miniJwt }) => {
      const { code, nickname, avatar, phone } = body;
      if (!code) {
        return error("code 必填", 400);
      }

      let session;
      try {
        session = await exchangeJsCode(code);
      } catch (err) {
        return error((err as Error).message || "微信登录失败", 500);
      }

      // 查找或创建用户
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.openid, session.openid))
        .limit(1);
      let user = existing[0];
      if (!user) {
        const inserted = await db
          .insert(users)
          .values({
            openid: session.openid,
            unionid: session.unionid,
            nickname,
            avatar,
            phone,
          })
          .returning();
        user = inserted[0];
        if (!user) {
          return error("用户创建失败", 500);
        }
      } else {
        // 轻量更新头像昵称
        await db
          .update(users)
          .set({
            nickname: nickname ?? user.nickname,
            avatar: avatar ?? user.avatar,
            phone: phone ?? user.phone,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }

      // 确保存在全局会员档案
      const existingMember = await db
        .select()
        .from(members)
        .where(eq(members.userId, user.id))
        .limit(1);
      if (existingMember.length === 0) {
        await db.insert(members).values({ userId: user.id }).returning();
      }

      const token = await miniJwt.sign({
        userId: user.id,
        openid: session.openid,
      });

      return success({
        token,
        user: {
          id: user.id,
          openid: user.openid,
          nickname: nickname || user.nickname,
          avatar: avatar || user.avatar,
          phone: phone || user.phone,
        },
      });
    },
    {
      body: t.Object({
        code: t.String(),
        nickname: t.Optional(t.String()),
        avatar: t.Optional(t.String()),
        phone: t.Optional(t.String()),
      }),
      detail: { tags: ["Mini"], summary: "小程序登录，返回 token" },
    }
  )

  // 获取 / 创建当前门店的会员子账户
  .get(
    "/members/me",
    async ({ headers, query, miniJwt }) => {
      const storeId = Number(query.storeId);
      if (!storeId) {
        return error("storeId 必填", 400);
      }

      const authUser = await verifyMiniUser(headers as any, miniJwt);
      if (!authUser?.userId) {
        return error("未授权，请先登录", 401);
      }

      const userId = Number(authUser.userId);

      let [storeMember] = await db
        .select()
        .from(storeMembers)
        .where(and(eq(storeMembers.storeId, storeId), eq(storeMembers.userId, userId)))
        .limit(1);

      if (!storeMember) {
        [storeMember] = await db
          .insert(storeMembers)
          .values({ storeId, userId, level: 1, points: 0 })
          .returning();
      }

      if (!storeMember) {
        return error("会员信息不存在", 404);
      }

      return success({
        storeId,
        userId,
        level: storeMember.level,
        points: storeMember.points,
        balance: storeMember.balance,
      });
    },
    {
      query: t.Object({ storeId: t.Number() }),
      detail: { tags: ["Mini"], summary: "获取当前门店会员信息" },
    }
  )

  // 获取积分记录
  .get(
    "/members/points/history",
    async ({ query, headers, miniJwt }) => {
      const storeId = Number(query.storeId);
      if (!storeId) return error("storeId 必填", 400);

      const authUser = await verifyMiniUser(headers as any, miniJwt);
      if (!authUser?.userId) return error("未授权，请先登录", 401);

      const userId = Number(authUser.userId);

      // 获取会员信息
      const [member] = await db
        .select()
        .from(storeMembers)
        .where(and(eq(storeMembers.storeId, storeId), eq(storeMembers.userId, userId)))
        .limit(1);

      if (!member) {
        return success({ logs: [], currentPoints: 0 });
      }

      // 获取积分记录
      const logs = await db
        .select({
          id: pointLogs.id,
          change: pointLogs.change,
          reason: pointLogs.reason,
          createdAt: pointLogs.createdAt,
          orderId: pointLogs.orderId,
          orderNo: sql<string>`COALESCE(${orders.orderNo}, '')`.as("orderNo"),
        })
        .from(pointLogs)
        .leftJoin(orders, eq(pointLogs.orderId, orders.id))
        .where(and(eq(pointLogs.storeId, storeId), eq(pointLogs.userId, userId)))
        .orderBy(desc(pointLogs.createdAt))
        .limit(100);

      return success({
        logs: logs.map((log) => ({
          id: log.id,
          change: log.change,
          reason: log.reason,
          createdAt: log.createdAt,
          orderId: log.orderId,
          orderNo: log.orderNo || undefined,
        })),
        currentPoints: member.points,
      });
    },
    {
      query: t.Object({ storeId: t.Number() }),
      detail: { tags: ["Mini"], summary: "获取积分记录" },
    }
  )

  // 可领取优惠券（附带用户领取状态）
  .get(
    "/coupons/available",
    async ({ query, headers, miniJwt }) => {
      const storeId = Number(query.storeId);
      if (!storeId) return error("storeId 必填", 400);

      const authUser = await verifyMiniUser(headers as any, miniJwt);
      const userId = authUser?.userId as number | undefined;

      const now = new Date();
      const couponList = await db
        .select()
        .from(coupons)
        .where(
          and(
            eq(coupons.storeId, storeId),
            eq(coupons.status, "ACTIVE"),
            sql`${coupons.startTime} <= ${now}`,
            sql`${coupons.endTime} >= ${now}`
          )
        )
        .orderBy(desc(coupons.createdAt));

      if (!userId) return success(couponList);

      const userCouponList = await db
        .select({ couponId: userCoupons.couponId, count: count() })
        .from(userCoupons)
        .where(and(eq(userCoupons.userId, userId), eq(userCoupons.storeId, storeId)))
        .groupBy(userCoupons.couponId);
      const map = new Map(userCouponList.map((uc) => [uc.couponId, uc.count]));

      const result = couponList.map((c) => {
        const claimed = map.get(c.id) || 0;
        return { ...c, claimed, canClaim: claimed < c.perUserLimit };
      });

      return success(result);
    },
    {
      query: t.Object({ storeId: t.Number() }),
      detail: { tags: ["Mini"], summary: "可领取优惠券（含用户领取状态）" },
    }
  )

  // 领取优惠券
  .post(
    "/coupons/:id/claim",
    async ({ params, body, headers, miniJwt }) => {
      const { storeId } = body;
      const authUser = await verifyMiniUser(headers as any, miniJwt);
      if (!authUser?.userId) return error("未授权，请先登录", 401);

      const userId = Number(authUser.userId);
      if (!storeId) return error("storeId 必填", 400);

      const [coupon] = await db.select().from(coupons).where(eq(coupons.id, params.id)).limit(1);
      if (!coupon) return error("优惠券不存在", 404);
      if (coupon.storeId !== storeId) return error("该优惠券不适用于当前门店", 400);

      const now = new Date();
      if (coupon.status !== "ACTIVE" || now < coupon.startTime || now > coupon.endTime) {
        return error("优惠券无效或过期", 400);
      }
      if (coupon.totalCount !== -1 && coupon.claimedCount >= coupon.totalCount) {
        return error("优惠券已被领完", 400);
      }

      const [userClaimed] = await db
        .select({ count: count() })
        .from(userCoupons)
        .where(
          and(
            eq(userCoupons.userId, userId),
            eq(userCoupons.couponId, params.id),
            eq(userCoupons.storeId, storeId)
          )
        );
      if (userClaimed && userClaimed.count >= coupon.perUserLimit) {
        return error("已达领取上限", 400);
      }

      const [uc] = await db
        .insert(userCoupons)
        .values({
          storeId,
          userId,
          couponId: params.id,
          expireAt: coupon.endTime,
        })
        .returning();

      await db
        .update(coupons)
        .set({ claimedCount: sql`${coupons.claimedCount} + 1` })
        .where(eq(coupons.id, params.id));

      return success(uc, "领取成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({ storeId: t.Number() }),
      detail: { tags: ["Mini"], summary: "领取优惠券（小程序端）" },
    }
  )

  // 小程序下单（含积分抵扣）
  .post(
    "/orders",
    async ({ body, headers, miniJwt }) => {
      const { storeId, tableId, items, remark, usePoints } = body;

      const authUser = await verifyMiniUser(headers as any, miniJwt);
      if (!authUser?.userId) return error("未授权，请先登录", 401);
      const userId = Number(authUser.userId);

      const [table] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1);
      if (!table || table.storeId !== storeId) return error("桌台与门店不匹配", 400);

      let totalAmount = 0;
      const orderItemsData: {
        variantId: number;
        quantity: number;
        price: string;
        snapshot: { name: string; categoryName: string; specs: Record<string, string> };
        attributes?: { name: string; value: string }[] | null;
      }[] = [];

      for (const item of items) {
        const [variant] = await db
          .select()
          .from(productVariants)
          .leftJoin(products, eq(productVariants.productId, products.id))
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(eq(productVariants.id, item.variantId))
          .limit(1);
        if (!variant || !variant.products) return error("商品不存在", 404);
        if (variant.products.storeId !== storeId) return error("商品不属于该门店", 400);

        const price = Number(variant.product_variants.price);
        totalAmount += price * item.quantity;
        orderItemsData.push({
          variantId: item.variantId,
          quantity: item.quantity,
          price: price.toString(),
          snapshot: {
            name: variant.products.name || "",
            categoryName: variant.categories?.name || "",
            specs: variant.product_variants.specs || {},
          },
          attributes: item.attributes || null,
        });
      }

      // 积分抵扣
      let pointsUsed = 0;
      let pointsDiscount = 0;
      if (usePoints) {
        const storeMember = await ensureStoreMember(storeId, userId);
        const availablePoints = storeMember?.points ?? 0;
        const maxDiscountAmount = totalAmount * MAX_REDEEM_PERCENT;
        const maxPointsAllow = Math.floor(maxDiscountAmount * POINTS_TO_YUAN);
        pointsUsed = Math.min(usePoints, availablePoints, maxPointsAllow);
        pointsDiscount = pointsUsed / POINTS_TO_YUAN;
      }
      const payAmount = Math.max(totalAmount - pointsDiscount, 0);

      const [order] = await db
        .insert(orders)
        .values({
          orderNo: `MINI-${Date.now()}`,
          storeId,
          tableId,
          userId,
          totalAmount: totalAmount.toString(),
          payAmount: payAmount.toString(),
          pointsUsed,
          pointsDiscount: pointsDiscount.toString(),
          remark,
        })
        .returning();

      if (orderItemsData.length > 0) {
        await db.insert(orderItems).values(
          orderItemsData.map((item) => ({
            orderId: order!.id,
            productVariantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
            snapshot: item.snapshot,
            attributes: item.attributes,
          }))
        );
      }

      if (pointsUsed > 0) {
        await db
          .update(storeMembers)
          .set({ points: sql`${storeMembers.points} - ${pointsUsed}` })
          .where(and(eq(storeMembers.storeId, storeId), eq(storeMembers.userId, userId)));

        await db.insert(pointLogs).values({
          storeId,
          userId,
          orderId: order!.id,
          change: -pointsUsed,
          reason: "REDEEM_ORDER",
          meta: { orderNo: order!.orderNo, source: "mini" },
        });
      }

      return success(order, "下单成功");
    },
    {
      body: t.Object({
        storeId: t.Number(),
        tableId: t.Number(),
        items: t.Array(
          t.Object({
            variantId: t.Number(),
            quantity: t.Number(),
            attributes: t.Optional(t.Array(t.Object({ name: t.String(), value: t.String() }))),
          })
        ),
        remark: t.Optional(t.String()),
        usePoints: t.Optional(t.Number()),
      }),
      detail: { tags: ["Mini"], summary: "小程序下单（含积分抵扣）" },
    }
  )

  // 获取桌台信息（通过二维码）
  .get(
    "/table/:qrCode",
    async ({ params }) => {
      const result = await db
        .select()
        .from(tables)
        .leftJoin(stores, eq(tables.storeId, stores.id))
        .where(eq(tables.qrCode, params.qrCode))
        .limit(1);

      if (result.length === 0) {
        return error("桌台不存在或二维码无效", 404);
      }

      const row = result[0]!;
      return success({
        table: {
          id: row.tables.id,
          name: row.tables.name,
          capacity: row.tables.capacity,
          status: row.tables.status,
        },
        store: row.stores
          ? {
              id: row.stores.id,
              name: row.stores.name,
              logo: row.stores.logo,
              welcomeText: row.stores.welcomeText,
              orderTip: row.stores.orderTip,
              businessHours: row.stores.businessHours,
            }
          : null,
      });
    },
    {
      params: t.Object({ qrCode: t.String() }),
      detail: { tags: ["Mini"], summary: "通过二维码获取桌台信息" },
    }
  )
  // 获取门店信息
  .get(
    "/store/:id",
    async ({ params }) => {
      const [store] = await db.select().from(stores).where(eq(stores.id, params.id)).limit(1);

      if (!store) {
        return error("门店不存在", 404);
      }

      return success({
        id: store.id,
        name: store.name,
        logo: store.logo,
        welcomeText: store.welcomeText,
        orderTip: store.orderTip,
        businessHours: store.businessHours,
      });
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Mini"], summary: "获取门店信息" },
    }
  )
  // 获取分类列表
  .get(
    "/categories",
    async ({ query }) => {
      const storeId = query.storeId;
      if (!storeId) {
        return error("storeId 必填", 400);
      }

      const categoryList = await db
        .select()
        .from(categories)
        .where(and(eq(categories.storeId, storeId), eq(categories.status, "ACTIVE")))
        .orderBy(asc(categories.sort));

      return success(categoryList);
    },
    {
      query: t.Object({ storeId: t.Number() }),
      detail: { tags: ["Mini"], summary: "获取分类列表" },
    }
  )
  // 获取商品列表
  .get(
    "/products",
    async ({ query }) => {
      const { storeId, categoryId } = query;
      if (!storeId) {
        return error("storeId 必填", 400);
      }

      const conditions = [eq(products.storeId, storeId), eq(products.status, "AVAILABLE")];
      if (categoryId) {
        conditions.push(eq(products.categoryId, categoryId));
      }

      const productList = await db
        .select()
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(asc(products.sort));

      return success({
        list: productList.map((r) => ({
          id: r.products.id,
          categoryId: r.products.categoryId,
          name: r.products.name,
          description: r.products.description,
          image: r.products.imageUrl,
          price: Number(r.products.basePrice),
          sales: r.products.sales,
          status: r.products.status,
          createdAt: r.products.createdAt,
          category: r.categories ? { id: r.categories.id, name: r.categories.name } : null,
        })),
      });
    },
    {
      query: t.Object({
        storeId: t.Number(),
        categoryId: t.Optional(t.Number()),
      }),
      detail: { tags: ["Mini"], summary: "获取商品列表" },
    }
  )
  // 获取商品详情
  .get(
    "/products/:id",
    async ({ params }) => {
      const [result] = await db
        .select()
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.id, params.id))
        .limit(1);

      if (!result) {
        return error("商品不存在", 404);
      }

      return success({
        id: result.products.id,
        categoryId: result.products.categoryId,
        name: result.products.name,
        description: result.products.description,
        image: result.products.imageUrl,
        price: Number(result.products.basePrice),
        sales: result.products.sales,
        status: result.products.status,
        createdAt: result.products.createdAt,
        category: result.categories
          ? { id: result.categories.id, name: result.categories.name }
          : null,
      });
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Mini"], summary: "获取商品详情" },
    }
  )
  // 获取轮播图
  .get(
    "/banners",
    async ({ query }) => {
      const storeId = query.storeId;
      if (!storeId) {
        return error("storeId 必填", 400);
      }

      const bannerList = await db
        .select()
        .from(banners)
        .where(and(eq(banners.storeId, storeId), eq(banners.isActive, true)))
        .orderBy(asc(banners.sort));

      return success(bannerList);
    },
    {
      query: t.Object({ storeId: t.Number() }),
      detail: { tags: ["Mini"], summary: "获取轮播图列表" },
    }
  )
  // 获取可领取优惠券
  .get(
    "/coupons",
    async ({ query }) => {
      const storeId = query.storeId;
      if (!storeId) {
        return error("storeId 必填", 400);
      }

      const now = new Date();
      const couponList = await db.select().from(coupons).where(eq(coupons.storeId, storeId));

      // 过滤有效的优惠券
      const validCoupons = couponList.filter((c) => {
        if (c.status !== "ACTIVE") return false;
        if (c.startTime && new Date(c.startTime) > now) return false;
        if (c.endTime && new Date(c.endTime) < now) return false;
        if (c.totalCount !== null && c.usedCount >= c.totalCount) return false;
        return true;
      });

      return success(
        validCoupons.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          value: Number(c.value),
          minAmount: Number(c.minAmount),
          startTime: c.startTime,
          endTime: c.endTime,
        }))
      );
    },
    {
      query: t.Object({ storeId: t.Number() }),
      detail: { tags: ["Mini"], summary: "获取可领取优惠券" },
    }
  );
