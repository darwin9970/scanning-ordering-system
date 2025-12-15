import { Elysia, t } from "elysia";
import { db, banners } from "../db";
import { eq, and, desc, isNull, or, lte, gte } from "drizzle-orm";
import { requirePermission } from "../lib/auth";
import { logOperation } from "../lib/operation-log";

// 公开接口 (小程序用)
const publicRoutes = new Elysia().get(
  "/list",
  async ({ query }) => {
    const { storeId, position } = query;
    const now = new Date();

    const conditions = [
      eq(banners.isActive, true),
      or(isNull(banners.startTime), lte(banners.startTime, now)),
      or(isNull(banners.endTime), gte(banners.endTime, now)),
    ];

    if (position) {
      conditions.push(
        eq(banners.position, position as "HOME_TOP" | "MENU_TOP" | "CATEGORY" | "PROMOTION")
      );
    }

    if (storeId) {
      conditions.push(or(eq(banners.storeId, Number(storeId)), isNull(banners.storeId)));
    }

    const list = await db
      .select()
      .from(banners)
      .where(and(...conditions))
      .orderBy(desc(banners.sort), desc(banners.createdAt));

    return { code: 200, data: list };
  },
  {
    query: t.Object({
      storeId: t.Optional(t.String()),
      position: t.Optional(t.String()),
    }),
  }
);

// 管理端接口 (需要认证)
const adminRoutes = new Elysia()
  .use(requirePermission("banners:read"))
  // 获取 Banner 列表
  .get(
    "/",
    async ({ user, query }) => {
      const { page = "1", pageSize = "20", position, storeId } = query;
      const offset = (Number(page) - 1) * Number(pageSize);

      const conditions = [];

      // 按门店筛选
      if (storeId) {
        conditions.push(eq(banners.storeId, Number(storeId)));
      } else if (user && user.role !== "SUPER_ADMIN" && user.storeId) {
        conditions.push(or(eq(banners.storeId, user.storeId), isNull(banners.storeId)));
      }

      if (position) {
        conditions.push(
          eq(banners.position, position as "HOME_TOP" | "MENU_TOP" | "CATEGORY" | "PROMOTION")
        );
      }

      const list = await db
        .select()
        .from(banners)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(banners.sort), desc(banners.createdAt))
        .limit(Number(pageSize))
        .offset(offset);

      return { code: 200, data: { list, page: Number(page), pageSize: Number(pageSize) } };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
        position: t.Optional(t.String()),
        storeId: t.Optional(t.String()),
      }),
    }
  )
  // 获取单个 Banner
  .get(
    "/:id",
    async ({ params }) => {
      const banner = await db
        .select()
        .from(banners)
        .where(eq(banners.id, Number(params.id)))
        .limit(1);

      if (banner.length === 0) {
        return { code: 404, message: "Banner不存在" };
      }

      return { code: 200, data: banner[0] };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  // 创建 Banner
  .post(
    "/",
    async ({ body, user }) => {
      const storeId = user?.role === "SUPER_ADMIN" ? body.storeId : user?.storeId;

      const [banner] = await db
        .insert(banners)
        .values({
          storeId: storeId || null,
          title: body.title,
          image: body.image,
          position: body.position as "HOME_TOP" | "MENU_TOP" | "CATEGORY" | "PROMOTION",
          linkType: body.linkType,
          linkValue: body.linkValue,
          sort: body.sort || 0,
          isActive: body.isActive ?? true,
          startTime: body.startTime ? new Date(body.startTime) : null,
          endTime: body.endTime ? new Date(body.endTime) : null,
        })
        .returning();

      return { code: 200, data: banner, message: "创建成功" };
    },
    {
      body: t.Object({
        storeId: t.Optional(t.Number()),
        title: t.String(),
        image: t.String(),
        position: t.String(),
        linkType: t.Optional(t.String()),
        linkValue: t.Optional(t.String()),
        sort: t.Optional(t.Number()),
        isActive: t.Optional(t.Boolean()),
        startTime: t.Optional(t.String()),
        endTime: t.Optional(t.String()),
      }),
    }
  )
  // 更新 Banner
  .put(
    "/:id",
    async ({ params, body }) => {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (body.title !== undefined) updateData.title = body.title;
      if (body.image !== undefined) updateData.image = body.image;
      if (body.position !== undefined) updateData.position = body.position;
      if (body.linkType !== undefined) updateData.linkType = body.linkType;
      if (body.linkValue !== undefined) updateData.linkValue = body.linkValue;
      if (body.sort !== undefined) updateData.sort = body.sort;
      if (body.isActive !== undefined) updateData.isActive = body.isActive;
      if (body.startTime !== undefined)
        updateData.startTime = body.startTime ? new Date(body.startTime) : null;
      if (body.endTime !== undefined)
        updateData.endTime = body.endTime ? new Date(body.endTime) : null;

      const [banner] = await db
        .update(banners)
        .set(updateData)
        .where(eq(banners.id, Number(params.id)))
        .returning();

      if (!banner) {
        return { code: 404, message: "Banner不存在" };
      }

      return { code: 200, data: banner, message: "更新成功" };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String()),
        image: t.Optional(t.String()),
        position: t.Optional(t.String()),
        linkType: t.Optional(t.String()),
        linkValue: t.Optional(t.String()),
        sort: t.Optional(t.Number()),
        isActive: t.Optional(t.Boolean()),
        startTime: t.Optional(t.String()),
        endTime: t.Optional(t.String()),
      }),
    }
  )
  // 删除 Banner
  .delete(
    "/:id",
    async ({ params, user }) => {
      const [deleted] = await db
        .delete(banners)
        .where(eq(banners.id, Number(params.id)))
        .returning();

      if (!deleted) {
        return { code: 404, message: "Banner不存在" };
      }

      await logOperation({
        adminId: user?.id,
        action: "delete",
        targetType: "banner",
        targetId: Number(params.id),
        storeId: deleted.storeId ?? null,
        details: { title: deleted.title, position: deleted.position },
      });

      return { code: 200, message: "删除成功" };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  // 批量更新排序
  .put(
    "/sort",
    async ({ body }) => {
      for (const item of body.items) {
        await db
          .update(banners)
          .set({ sort: item.sort, updatedAt: new Date() })
          .where(eq(banners.id, item.id));
      }

      return { code: 200, message: "排序更新成功" };
    },
    {
      body: t.Object({
        items: t.Array(
          t.Object({
            id: t.Number(),
            sort: t.Number(),
          })
        ),
      }),
    }
  )
  // 切换启用状态
  .put(
    "/:id/toggle",
    async ({ params }) => {
      const [current] = await db
        .select()
        .from(banners)
        .where(eq(banners.id, Number(params.id)))
        .limit(1);

      if (!current) {
        return { code: 404, message: "Banner不存在" };
      }

      const [updated] = await db
        .update(banners)
        .set({ isActive: !current.isActive, updatedAt: new Date() })
        .where(eq(banners.id, Number(params.id)))
        .returning();

      if (!updated) {
        return { code: 500, message: "更新失败" };
      }

      return { code: 200, data: updated, message: updated.isActive ? "已启用" : "已禁用" };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  );

export const bannerRoutes = new Elysia({ prefix: "/banners" }).use(publicRoutes).use(adminRoutes);
