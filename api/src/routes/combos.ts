import { Elysia, t } from "elysia";
import { eq, and, desc, count } from "drizzle-orm";
import { db, combos, comboItems, products, productVariants } from "../db";
import { success, error, pagination } from "../lib/utils";
import { logOperation } from "../lib/operation-log";

export const comboRoutes = new Elysia({ prefix: "/api/combos" })
  // 获取套餐列表
  .get(
    "/",
    async ({ query }) => {
      const { page, pageSize, storeId, status } = query;
      const { take, skip } = pagination(page, pageSize);

      const conditions = [];
      if (storeId) conditions.push(eq(combos.storeId, storeId));
      if (status) conditions.push(eq(combos.status, status as "AVAILABLE" | "SOLDOUT" | "HIDDEN"));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [comboList, totalResult] = await Promise.all([
        db
          .select()
          .from(combos)
          .where(whereClause)
          .orderBy(desc(combos.sort), desc(combos.createdAt))
          .limit(take)
          .offset(skip),
        db.select({ count: count() }).from(combos).where(whereClause),
      ]);

      // 获取每个套餐的商品列表
      const result = await Promise.all(
        comboList.map(async (combo: typeof combos.$inferSelect) => {
          const items = await db
            .select({
              comboItem: comboItems,
              product: products,
              variant: productVariants,
            })
            .from(comboItems)
            .leftJoin(products, eq(comboItems.productId, products.id))
            .leftJoin(productVariants, eq(comboItems.variantId, productVariants.id))
            .where(eq(comboItems.comboId, combo.id));

          return {
            ...combo,
            items: items.map(
              (i: {
                comboItem: typeof comboItems.$inferSelect;
                product: typeof products.$inferSelect | null;
                variant: typeof productVariants.$inferSelect | null;
              }) => ({
                ...i.comboItem,
                product: i.product,
                variant: i.variant,
              })
            ),
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
        storeId: t.Optional(t.Number()),
        status: t.Optional(t.String()),
      }),
      detail: { tags: ["Combos"], summary: "获取套餐列表" },
    }
  )

  // 获取套餐详情
  .get(
    "/:id",
    async ({ params }) => {
      const [combo] = await db.select().from(combos).where(eq(combos.id, params.id)).limit(1);

      if (!combo) return error("套餐不存在", 404);

      // 获取套餐商品
      const items = await db
        .select({
          comboItem: comboItems,
          product: products,
          variant: productVariants,
        })
        .from(comboItems)
        .leftJoin(products, eq(comboItems.productId, products.id))
        .leftJoin(productVariants, eq(comboItems.variantId, productVariants.id))
        .where(eq(comboItems.comboId, params.id));

      return success({
        ...combo,
        items: items.map(
          (i: {
            comboItem: typeof comboItems.$inferSelect;
            product: typeof products.$inferSelect | null;
            variant: typeof productVariants.$inferSelect | null;
          }) => ({
            ...i.comboItem,
            product: i.product,
            variant: i.variant,
          })
        ),
      });
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Combos"], summary: "获取套餐详情" },
    }
  )

  // 创建套餐
  .post(
    "/",
    async ({ body }) => {
      const { storeId, name, description, imageUrl, price, items } = body;

      // 计算原价
      let originalPrice = 0;
      for (const item of items) {
        if (item.variantId) {
          const [variant] = await db
            .select()
            .from(productVariants)
            .where(eq(productVariants.id, item.variantId))
            .limit(1);
          if (variant) {
            originalPrice += Number(variant.price) * (item.quantity || 1);
          }
        } else {
          const [product] = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);
          if (product) {
            originalPrice += Number(product.basePrice) * (item.quantity || 1);
          }
        }
      }

      // 创建套餐
      const [combo] = await db
        .insert(combos)
        .values({
          storeId,
          name,
          description,
          imageUrl,
          originalPrice: originalPrice.toString(),
          price: price.toString(),
        })
        .returning();

      // 创建套餐商品关联
      if (items.length > 0) {
        await db.insert(comboItems).values(
          items.map((item) => ({
            comboId: combo!.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity || 1,
            isOptional: item.isOptional || false,
            optionGroup: item.optionGroup,
          }))
        );
      }

      return success(combo, "套餐创建成功");
    },
    {
      body: t.Object({
        storeId: t.Number(),
        name: t.String({ minLength: 1, maxLength: 100 }),
        description: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
        price: t.Number({ minimum: 0 }),
        items: t.Array(
          t.Object({
            productId: t.Number(),
            variantId: t.Optional(t.Number()),
            quantity: t.Optional(t.Number({ minimum: 1 })),
            isOptional: t.Optional(t.Boolean()),
            optionGroup: t.Optional(t.String()),
          })
        ),
      }),
      detail: { tags: ["Combos"], summary: "创建套餐" },
    }
  )

  // 更新套餐
  .put(
    "/:id",
    async ({ params, body }) => {
      const updateData: Record<string, unknown> = {};

      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
      if (body.price !== undefined) updateData.price = body.price.toString();
      if (body.stock !== undefined) updateData.stock = body.stock;
      if (body.sort !== undefined) updateData.sort = body.sort;
      if (body.status !== undefined) updateData.status = body.status;

      const [combo] = await db
        .update(combos)
        .set(updateData)
        .where(eq(combos.id, params.id))
        .returning();

      if (!combo) return error("套餐不存在", 404);

      // 如果有更新商品列表
      if (body.items) {
        // 删除旧的关联
        await db.delete(comboItems).where(eq(comboItems.comboId, params.id));

        // 重新计算原价
        let originalPrice = 0;
        for (const item of body.items) {
          if (item.variantId) {
            const [variant] = await db
              .select()
              .from(productVariants)
              .where(eq(productVariants.id, item.variantId))
              .limit(1);
            if (variant) {
              originalPrice += Number(variant.price) * (item.quantity || 1);
            }
          } else {
            const [product] = await db
              .select()
              .from(products)
              .where(eq(products.id, item.productId))
              .limit(1);
            if (product) {
              originalPrice += Number(product.basePrice) * (item.quantity || 1);
            }
          }
        }

        // 更新原价
        await db
          .update(combos)
          .set({ originalPrice: originalPrice.toString() })
          .where(eq(combos.id, params.id));

        // 添加新的关联
        if (body.items.length > 0) {
          await db.insert(comboItems).values(
            body.items.map((item) => ({
              comboId: params.id,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity || 1,
              isOptional: item.isOptional || false,
              optionGroup: item.optionGroup,
            }))
          );
        }
      }

      return success(combo, "套餐更新成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
        price: t.Optional(t.Number()),
        stock: t.Optional(t.Number()),
        sort: t.Optional(t.Number()),
        status: t.Optional(t.String()),
        items: t.Optional(
          t.Array(
            t.Object({
              productId: t.Number(),
              variantId: t.Optional(t.Number()),
              quantity: t.Optional(t.Number()),
              isOptional: t.Optional(t.Boolean()),
              optionGroup: t.Optional(t.String()),
            })
          )
        ),
      }),
      detail: { tags: ["Combos"], summary: "更新套餐" },
    }
  )

  // 更新套餐状态
  .put(
    "/:id/status",
    async ({ params, body }) => {
      const [combo] = await db
        .update(combos)
        .set({ status: body.status as "AVAILABLE" | "SOLDOUT" | "HIDDEN" })
        .where(eq(combos.id, params.id))
        .returning();

      if (!combo) return error("套餐不存在", 404);

      return success(combo, "状态更新成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({ status: t.String() }),
      detail: { tags: ["Combos"], summary: "更新套餐状态" },
    }
  )

  // 删除套餐
  .delete(
    "/:id",
    async ({ params }) => {
      const [existing] = await db.select().from(combos).where(eq(combos.id, params.id)).limit(1);
      await db.delete(comboItems).where(eq(comboItems.comboId, params.id));
      await db.delete(combos).where(eq(combos.id, params.id));

      await logOperation({
        adminId: null,
        action: "delete",
        targetType: "combo",
        targetId: params.id,
        storeId: existing?.storeId ?? null,
        details: { name: existing?.name },
      });
      return success(null, "套餐删除成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Combos"], summary: "删除套餐" },
    }
  );
