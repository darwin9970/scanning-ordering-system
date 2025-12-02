import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db, productVariants, products, categories } from "../db";
import redis, { cartKey } from "../lib/redis";
import { success, error } from "../lib/utils";
import { broadcastToTable, WS_EVENTS } from "../ws";

// 购物车项类型
interface CartItem {
  variantId: number;
  quantity: number;
  productId: number;
  productName: string;
  categoryId: number;
  categoryName: string;
  specs: Record<string, string>;
  price: string;
  imageUrl: string | null;
  attributes?: { name: string; value: string }[];
  addedBy?: string; // 添加者标识（用于协同）
  addedAt: number;
}

// 购物车数据结构
interface Cart {
  storeId: number;
  tableId: number;
  items: CartItem[];
  updatedAt: number;
}

// 购物车过期时间（2小时）
const CART_EXPIRE_SECONDS = 2 * 60 * 60;

// 获取购物车
async function getCart(storeId: number, tableId: number): Promise<Cart> {
  if (!redis) {
    return { storeId, tableId, items: [], updatedAt: Date.now() };
  }

  const key = cartKey(storeId, tableId);
  const data = await redis.get(key);

  if (!data) {
    return { storeId, tableId, items: [], updatedAt: Date.now() };
  }

  try {
    return JSON.parse(data);
  } catch {
    return { storeId, tableId, items: [], updatedAt: Date.now() };
  }
}

// 保存购物车
async function saveCart(cart: Cart): Promise<void> {
  if (!redis) return;

  const key = cartKey(cart.storeId, cart.tableId);
  cart.updatedAt = Date.now();
  await redis.setex(key, CART_EXPIRE_SECONDS, JSON.stringify(cart));
}

// 获取商品详情
async function getVariantDetails(variantId: number) {
  const [variant] = await db
    .select()
    .from(productVariants)
    .leftJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(productVariants.id, variantId))
    .limit(1);

  return variant;
}

export const cartRoutes = new Elysia({ prefix: "/api/cart" })
  // 获取购物车
  .get(
    "/:storeId/:tableId",
    async ({ params }) => {
      const { storeId, tableId } = params;
      const cart = await getCart(storeId, tableId);

      // 计算总金额
      const totalAmount = cart.items.reduce((sum, item) => {
        return sum + Number(item.price) * item.quantity;
      }, 0);

      return success({
        ...cart,
        totalAmount,
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      });
    },
    {
      params: t.Object({
        storeId: t.Number(),
        tableId: t.Number(),
      }),
      detail: { tags: ["Cart"], summary: "获取购物车" },
    }
  )

  // 添加商品到购物车
  .post(
    "/:storeId/:tableId/items",
    async ({ params, body }) => {
      const { storeId, tableId } = params;
      const { variantId, quantity, attributes, addedBy } = body;

      // 获取商品详情
      const variant = await getVariantDetails(variantId);
      if (!variant || !variant.products) {
        return error("商品不存在", 404);
      }

      // 检查库存
      const stock = variant.product_variants.stock;
      if (stock !== -1 && stock < quantity) {
        return error(`库存不足，仅剩 ${stock} 件`, 400);
      }

      // 检查商品状态
      if (variant.products.status !== "AVAILABLE") {
        return error("商品已下架或售罄", 400);
      }

      const cart = await getCart(storeId, tableId);

      // 查找是否已存在相同商品（同规格同属性）
      const existingIndex = cart.items.findIndex(
        (item) =>
          item.variantId === variantId &&
          JSON.stringify(item.attributes || []) === JSON.stringify(attributes || [])
      );

      if (existingIndex >= 0) {
        // 更新数量
        cart.items[existingIndex]!.quantity += quantity;
      } else {
        // 添加新项
        const newItem: CartItem = {
          variantId,
          quantity,
          productId: variant.products.id,
          productName: variant.products.name,
          categoryId: variant.categories?.id || 0,
          categoryName: variant.categories?.name || "",
          specs: variant.product_variants.specs || {},
          price: variant.product_variants.price,
          imageUrl: variant.products.imageUrl,
          attributes,
          addedBy,
          addedAt: Date.now(),
        };
        cart.items.push(newItem);
      }

      await saveCart(cart);

      // 广播购物车更新
      broadcastToTable(storeId, tableId, WS_EVENTS.CART_UPDATED, {
        cart,
        action: "add",
        item: { variantId, quantity },
        operator: addedBy,
      });

      return success(cart, "添加成功");
    },
    {
      params: t.Object({
        storeId: t.Number(),
        tableId: t.Number(),
      }),
      body: t.Object({
        variantId: t.Number(),
        quantity: t.Number({ minimum: 1 }),
        attributes: t.Optional(t.Array(t.Object({ name: t.String(), value: t.String() }))),
        addedBy: t.Optional(t.String()),
      }),
      detail: { tags: ["Cart"], summary: "添加商品到购物车" },
    }
  )

  // 更新购物车商品数量
  .put(
    "/:storeId/:tableId/items/:variantId",
    async ({ params, body }) => {
      const { storeId, tableId, variantId } = params;
      const { quantity, attributes, operator } = body;

      const cart = await getCart(storeId, tableId);

      // 查找商品
      const itemIndex = cart.items.findIndex(
        (item) =>
          item.variantId === variantId &&
          JSON.stringify(item.attributes || []) === JSON.stringify(attributes || [])
      );

      if (itemIndex < 0) {
        return error("购物车中无此商品", 404);
      }

      if (quantity <= 0) {
        // 删除商品
        cart.items.splice(itemIndex, 1);
      } else {
        // 检查库存
        const variant = await getVariantDetails(variantId);
        if (variant) {
          const stock = variant.product_variants.stock;
          if (stock !== -1 && stock < quantity) {
            return error(`库存不足，仅剩 ${stock} 件`, 400);
          }
        }
        cart.items[itemIndex]!.quantity = quantity;
      }

      await saveCart(cart);

      // 广播购物车更新
      broadcastToTable(storeId, tableId, WS_EVENTS.CART_UPDATED, {
        cart,
        action: quantity <= 0 ? "remove" : "update",
        item: { variantId, quantity },
        operator,
      });

      return success(cart, quantity <= 0 ? "已移除" : "数量已更新");
    },
    {
      params: t.Object({
        storeId: t.Number(),
        tableId: t.Number(),
        variantId: t.Number(),
      }),
      body: t.Object({
        quantity: t.Number(),
        attributes: t.Optional(t.Array(t.Object({ name: t.String(), value: t.String() }))),
        operator: t.Optional(t.String()),
      }),
      detail: { tags: ["Cart"], summary: "更新购物车商品数量" },
    }
  )

  // 删除购物车商品
  .delete(
    "/:storeId/:tableId/items/:variantId",
    async ({ params, query }) => {
      const { storeId, tableId, variantId } = params;

      const cart = await getCart(storeId, tableId);

      // 查找并删除商品
      const initialLength = cart.items.length;
      cart.items = cart.items.filter((item) => item.variantId !== variantId);

      if (cart.items.length === initialLength) {
        return error("购物车中无此商品", 404);
      }

      await saveCart(cart);

      // 广播购物车更新
      broadcastToTable(storeId, tableId, WS_EVENTS.CART_UPDATED, {
        cart,
        action: "remove",
        item: { variantId },
        operator: query.operator,
      });

      return success(cart, "已移除");
    },
    {
      params: t.Object({
        storeId: t.Number(),
        tableId: t.Number(),
        variantId: t.Number(),
      }),
      query: t.Object({
        operator: t.Optional(t.String()),
      }),
      detail: { tags: ["Cart"], summary: "删除购物车商品" },
    }
  )

  // 清空购物车
  .delete(
    "/:storeId/:tableId",
    async ({ params, query }) => {
      const { storeId, tableId } = params;

      if (redis) {
        const key = cartKey(storeId, tableId);
        await redis.del(key);
      }

      const emptyCart: Cart = {
        storeId,
        tableId,
        items: [],
        updatedAt: Date.now(),
      };

      // 广播购物车清空
      broadcastToTable(storeId, tableId, WS_EVENTS.CART_UPDATED, {
        cart: emptyCart,
        action: "clear",
        operator: query.operator,
      });

      return success(emptyCart, "购物车已清空");
    },
    {
      params: t.Object({
        storeId: t.Number(),
        tableId: t.Number(),
      }),
      query: t.Object({
        operator: t.Optional(t.String()),
      }),
      detail: { tags: ["Cart"], summary: "清空购物车" },
    }
  )

  // 批量同步购物车（协同点单用）
  .post(
    "/:storeId/:tableId/sync",
    async ({ params, body }) => {
      const { storeId, tableId } = params;
      const { operations, operator } = body;

      const cart = await getCart(storeId, tableId);

      for (const op of operations) {
        if (op.action === "add") {
          const variant = await getVariantDetails(op.variantId);
          if (!variant || !variant.products) continue;

          const existingIndex = cart.items.findIndex(
            (item) =>
              item.variantId === op.variantId &&
              JSON.stringify(item.attributes || []) === JSON.stringify(op.attributes || [])
          );

          if (existingIndex >= 0) {
            cart.items[existingIndex]!.quantity += op.quantity || 1;
          } else {
            cart.items.push({
              variantId: op.variantId,
              quantity: op.quantity || 1,
              productId: variant.products.id,
              productName: variant.products.name,
              categoryId: variant.categories?.id || 0,
              categoryName: variant.categories?.name || "",
              specs: variant.product_variants.specs || {},
              price: variant.product_variants.price,
              imageUrl: variant.products.imageUrl,
              attributes: op.attributes,
              addedBy: operator,
              addedAt: Date.now(),
            });
          }
        } else if (op.action === "remove") {
          cart.items = cart.items.filter((item) => item.variantId !== op.variantId);
        } else if (op.action === "update") {
          const itemIndex = cart.items.findIndex((item) => item.variantId === op.variantId);
          if (itemIndex >= 0 && op.quantity !== undefined) {
            if (op.quantity <= 0) {
              cart.items.splice(itemIndex, 1);
            } else {
              cart.items[itemIndex]!.quantity = op.quantity;
            }
          }
        }
      }

      await saveCart(cart);

      // 广播同步结果
      broadcastToTable(storeId, tableId, WS_EVENTS.CART_UPDATED, {
        cart,
        action: "sync",
        operator,
      });

      // 计算总金额
      const totalAmount = cart.items.reduce((sum, item) => {
        return sum + Number(item.price) * item.quantity;
      }, 0);

      return success({
        ...cart,
        totalAmount,
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      });
    },
    {
      params: t.Object({
        storeId: t.Number(),
        tableId: t.Number(),
      }),
      body: t.Object({
        operations: t.Array(
          t.Object({
            action: t.Union([t.Literal("add"), t.Literal("remove"), t.Literal("update")]),
            variantId: t.Number(),
            quantity: t.Optional(t.Number()),
            attributes: t.Optional(t.Array(t.Object({ name: t.String(), value: t.String() }))),
          })
        ),
        operator: t.Optional(t.String()),
      }),
      detail: { tags: ["Cart"], summary: "批量同步购物车操作" },
    }
  );
