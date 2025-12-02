import { Elysia, t } from "elysia";
import { eq, and, like, asc, desc, count } from "drizzle-orm";
import { db, products, categories, productVariants, productAttributes, stores } from "../db";
import { success, error, pagination } from "../lib/utils";

export const productRoutes = new Elysia({ prefix: "/api/products" })
  .get(
    "/",
    async ({ query }) => {
      const { page, pageSize, storeId, categoryId, status, keyword } = query;
      const { take, skip } = pagination(page, pageSize);

      const conditions = [];
      if (storeId) conditions.push(eq(products.storeId, storeId));
      if (categoryId) conditions.push(eq(products.categoryId, categoryId));
      if (status)
        conditions.push(eq(products.status, status as "AVAILABLE" | "SOLDOUT" | "HIDDEN"));
      if (keyword) conditions.push(like(products.name, `%${keyword}%`));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [productList, totalResult] = await Promise.all([
        db
          .select()
          .from(products)
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(whereClause)
          .orderBy(desc(products.createdAt))
          .limit(take)
          .offset(skip),
        db.select({ count: count() }).from(products).where(whereClause),
      ]);

      return success({
        list: productList.map((r) => ({ ...r.products, category: r.categories })),
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
        categoryId: t.Optional(t.Number()),
        status: t.Optional(t.String()),
        keyword: t.Optional(t.String()),
      }),
      detail: { tags: ["Products"], summary: "获取商品列表" },
    }
  )
  .get(
    "/:id",
    async ({ params }) => {
      const [product] = await db
        .select()
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.id, params.id))
        .limit(1);

      if (!product) return error("商品不存在", 404);

      const [variants, attributes] = await Promise.all([
        db.select().from(productVariants).where(eq(productVariants.productId, params.id)),
        db.select().from(productAttributes).where(eq(productAttributes.productId, params.id)),
      ]);

      return success({
        ...product.products,
        category: product.categories,
        variants,
        attributes,
      });
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Products"], summary: "获取商品详情" },
    }
  )
  .post(
    "/",
    async ({ body }) => {
      const [product] = await db
        .insert(products)
        .values({
          storeId: body.storeId,
          categoryId: body.categoryId,
          name: body.name,
          description: body.description,
          imageUrl: body.imageUrl,
          type: (body.type || "SINGLE") as "SINGLE" | "VARIANT",
          basePrice: body.basePrice.toString(),
        })
        .returning();

      // 创建默认规格
      if (body.type !== "VARIANT") {
        await db.insert(productVariants).values({
          productId: product!.id,
          specs: {},
          price: body.basePrice.toString(),
          stock: -1,
        });
      }

      // 创建规格
      if (body.variants && body.variants.length > 0) {
        await db.insert(productVariants).values(
          body.variants.map(
            (v: { specs: Record<string, string>; price: number; stock?: number }) => ({
              productId: product!.id,
              specs: v.specs,
              price: v.price.toString(),
              stock: v.stock ?? -1,
            })
          )
        );
      }

      // 创建属性
      if (body.attributes && body.attributes.length > 0) {
        await db.insert(productAttributes).values(
          body.attributes.map((a: { name: string; options: string[]; required?: boolean }) => ({
            productId: product!.id,
            name: a.name,
            options: a.options,
            required: a.required ?? false,
          }))
        );
      }

      return success(product, "商品创建成功");
    },
    {
      body: t.Object({
        storeId: t.Number(),
        categoryId: t.Number(),
        name: t.String({ minLength: 1, maxLength: 100, error: "商品名称1-100字符" }),
        description: t.Optional(t.String({ maxLength: 500, error: "描述最多500字符" })),
        imageUrl: t.Optional(t.String({ maxLength: 500 })),
        type: t.Optional(t.String()),
        basePrice: t.Number({ minimum: 0, error: "价格不能为负数" }),
        variants: t.Optional(t.Array(t.Any())),
        attributes: t.Optional(t.Array(t.Any())),
      }),
      detail: { tags: ["Products"], summary: "创建商品" },
    }
  )
  .put(
    "/:id",
    async ({ params, body }) => {
      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
      if (body.basePrice !== undefined) updateData.basePrice = body.basePrice.toString();
      if (body.sort !== undefined) updateData.sort = body.sort;

      const [product] = await db
        .update(products)
        .set(updateData)
        .where(eq(products.id, params.id))
        .returning();

      return success(product, "商品更新成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({
        name: t.Optional(t.String()),
        categoryId: t.Optional(t.Number()),
        description: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
        basePrice: t.Optional(t.Number()),
        sort: t.Optional(t.Number()),
      }),
      detail: { tags: ["Products"], summary: "更新商品" },
    }
  )
  .put(
    "/:id/status",
    async ({ params, body }) => {
      const [product] = await db
        .update(products)
        .set({ status: body.status as "AVAILABLE" | "SOLDOUT" | "HIDDEN" })
        .where(eq(products.id, params.id))
        .returning();

      return success(product, "状态更新成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      body: t.Object({ status: t.String() }),
      detail: { tags: ["Products"], summary: "更新商品状态" },
    }
  )
  .delete(
    "/:id",
    async ({ params }) => {
      await db.delete(products).where(eq(products.id, params.id));
      return success(null, "商品删除成功");
    },
    {
      params: t.Object({ id: t.Number() }),
      detail: { tags: ["Products"], summary: "删除商品" },
    }
  );
