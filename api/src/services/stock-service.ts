import { eq, sql } from 'drizzle-orm'
import { db, productVariants, products } from '../db'
import { broadcastToStore } from '../ws'

// 库存相关事件
const STOCK_EVENTS = {
  STOCK_LOW: 'stock_low',
  STOCK_OUT: 'stock_out',
  STOCK_UPDATED: 'stock_updated'
}

// 库存预警阈值
const STOCK_WARNING_THRESHOLD = 10

interface StockDeductionItem {
  variantId: number
  quantity: number
}

interface StockDeductionResult {
  success: boolean
  variantId: number
  deducted: number
  remaining: number
  error?: string
}

/**
 * 扣减库存
 */
export async function deductStock(
  storeId: number,
  items: StockDeductionItem[]
): Promise<{ success: boolean; results: StockDeductionResult[]; errors: string[] }> {
  const results: StockDeductionResult[] = []
  const errors: string[] = []

  for (const item of items) {
    try {
      // 获取当前库存
      const [variant] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, item.variantId))
        .limit(1)

      if (!variant) {
        errors.push(`规格 ${item.variantId} 不存在`)
        results.push({
          success: false,
          variantId: item.variantId,
          deducted: 0,
          remaining: 0,
          error: '规格不存在'
        })
        continue
      }

      // -1 表示不限库存
      if (variant.stock === -1) {
        results.push({
          success: true,
          variantId: item.variantId,
          deducted: item.quantity,
          remaining: -1
        })
        continue
      }

      // 检查库存是否足够
      if (variant.stock < item.quantity) {
        errors.push(`规格 ${item.variantId} 库存不足，当前库存: ${variant.stock}`)
        results.push({
          success: false,
          variantId: item.variantId,
          deducted: 0,
          remaining: variant.stock,
          error: `库存不足，仅剩 ${variant.stock} 件`
        })
        continue
      }

      // 扣减库存
      const [updated] = await db
        .update(productVariants)
        .set({
          stock: sql`${productVariants.stock} - ${item.quantity}`
        })
        .where(eq(productVariants.id, item.variantId))
        .returning()

      const newStock = updated!.stock

      results.push({
        success: true,
        variantId: item.variantId,
        deducted: item.quantity,
        remaining: newStock
      })

      // 检查是否需要发送预警
      if (newStock <= STOCK_WARNING_THRESHOLD && newStock > 0) {
        // 获取商品信息
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, variant.productId))
          .limit(1)

        broadcastToStore(storeId, STOCK_EVENTS.STOCK_LOW, {
          variantId: item.variantId,
          productId: variant.productId,
          productName: product?.name,
          remaining: newStock,
          threshold: STOCK_WARNING_THRESHOLD
        })
      }

      // 检查是否售罄
      if (newStock === 0) {
        // 更新商品状态为售罄
        await db
          .update(productVariants)
          .set({ status: 'INACTIVE' })
          .where(eq(productVariants.id, item.variantId))

        // 获取商品信息
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, variant.productId))
          .limit(1)

        broadcastToStore(storeId, STOCK_EVENTS.STOCK_OUT, {
          variantId: item.variantId,
          productId: variant.productId,
          productName: product?.name
        })
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : '未知错误'
      errors.push(`规格 ${item.variantId} 扣减失败: ${errorMsg}`)
      results.push({
        success: false,
        variantId: item.variantId,
        deducted: 0,
        remaining: 0,
        error: errorMsg
      })
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors
  }
}

/**
 * 恢复库存（退款时使用）
 */
export async function restoreStock(storeId: number, items: StockDeductionItem[]): Promise<void> {
  for (const item of items) {
    const [variant] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, item.variantId))
      .limit(1)

    if (!variant || variant.stock === -1) continue

    // 恢复库存
    await db
      .update(productVariants)
      .set({
        stock: sql`${productVariants.stock} + ${item.quantity}`,
        status: 'ACTIVE' // 恢复可用状态
      })
      .where(eq(productVariants.id, item.variantId))

    // 广播库存更新
    broadcastToStore(storeId, STOCK_EVENTS.STOCK_UPDATED, {
      variantId: item.variantId,
      action: 'restore',
      quantity: item.quantity
    })
  }
}

/**
 * 检查库存是否足够
 */
export async function checkStock(items: StockDeductionItem[]): Promise<{
  available: boolean
  unavailableItems: { variantId: number; required: number; available: number }[]
}> {
  const unavailableItems: { variantId: number; required: number; available: number }[] = []

  for (const item of items) {
    const [variant] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, item.variantId))
      .limit(1)

    if (!variant) {
      unavailableItems.push({
        variantId: item.variantId,
        required: item.quantity,
        available: 0
      })
      continue
    }

    // -1 表示不限库存
    if (variant.stock !== -1 && variant.stock < item.quantity) {
      unavailableItems.push({
        variantId: item.variantId,
        required: item.quantity,
        available: variant.stock
      })
    }
  }

  return {
    available: unavailableItems.length === 0,
    unavailableItems
  }
}

/**
 * 批量更新库存
 */
export async function batchUpdateStock(
  updates: { variantId: number; stock: number }[]
): Promise<void> {
  for (const update of updates) {
    await db
      .update(productVariants)
      .set({
        stock: update.stock,
        status: update.stock === 0 ? 'INACTIVE' : 'ACTIVE'
      })
      .where(eq(productVariants.id, update.variantId))
  }
}
