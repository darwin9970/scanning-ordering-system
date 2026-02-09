import { Elysia, t } from 'elysia'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { db, promotions } from '../db'
import { success } from '../lib/utils'

// 满减规则类型
interface FullReduceRule {
  tiers: { min: number; discount: number }[]
}

// 折扣规则类型
interface DiscountRule {
  discount: number // 0.8 表示8折
  maxDiscount?: number
}

// 第二份半价规则类型
interface SecondHalfPriceRule {
  discountRate: number // 0.5 表示半价，0.3 表示3折
  maxItems?: number // 可选：最多享受优惠的商品数量
}

// 满件折扣规则类型
interface QuantityDiscountRule {
  tiers: Array<{
    minQuantity: number // 最低购买数量
    discount: number // 折扣率 (0.9 = 9折)
  }>
  applicableProducts?: number[] // 适用商品ID（可选）
  applicableCategories?: number[] // 适用分类ID（可选）
}

// 买一送一规则类型
interface BuyOneGetOneRule {
  buyProductId: number // 购买商品ID
  getProductId: number // 赠送商品ID（可与购买商品相同）
  buyQuantity: number // 购买数量（默认1）
  getQuantity: number // 赠送数量（默认1）
  maxSets?: number // 最多享受几组（可选，防止薅羊毛）
  getProductPrice?: number // 赠品价格（用于计算折扣金额）
}

// 计算满减优惠
export function calculateFullReduceDiscount(amount: number, rules: FullReduceRule): number {
  const sortedTiers = [...rules.tiers].sort((a, b) => b.min - a.min)
  for (const tier of sortedTiers) {
    if (amount >= tier.min) {
      return tier.discount
    }
  }
  return 0
}

// 计算折扣优惠
export function calculateDiscountAmount(amount: number, rules: DiscountRule): number {
  const discount = amount * (1 - rules.discount)
  if (rules.maxDiscount && discount > rules.maxDiscount) {
    return rules.maxDiscount
  }
  return discount
}

// 计算第二份半价优惠
export function calculateSecondHalfPriceDiscount(
  items: Array<{ price: number; quantity: number }>,
  rules: SecondHalfPriceRule
): number {
  // 按价格降序排序，优先对高价商品打折
  const sortedItems = [...items].sort((a, b) => b.price - a.price)

  let totalDiscount = 0
  let discountedCount = 0
  const maxItems = rules.maxItems || Infinity

  for (const item of sortedItems) {
    // 每2个为一组，第2个享受折扣
    const pairs = Math.floor(item.quantity / 2)
    const itemsToDiscount = Math.min(pairs, maxItems - discountedCount)

    if (itemsToDiscount <= 0) break

    // 计算折扣金额
    totalDiscount += item.price * (1 - rules.discountRate) * itemsToDiscount
    discountedCount += itemsToDiscount
  }

  return totalDiscount
}

// 计算满件折扣优惠
export function calculateQuantityDiscountAmount(
  items: Array<{ productId?: number; categoryId?: number; price: number; quantity: number }>,
  rules: QuantityDiscountRule
): number {
  // 筛选适用商品
  let eligibleItems = items

  if (rules.applicableProducts && rules.applicableProducts.length > 0) {
    eligibleItems = items.filter(
      (item) => item.productId && rules.applicableProducts!.includes(item.productId)
    )
  } else if (rules.applicableCategories && rules.applicableCategories.length > 0) {
    eligibleItems = items.filter(
      (item) => item.categoryId && rules.applicableCategories!.includes(item.categoryId)
    )
  }

  // 计算总数量
  const totalQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0)

  // 找到适用的最高折扣档位
  const sortedTiers = [...rules.tiers].sort((a, b) => b.minQuantity - a.minQuantity)
  const applicableTier = sortedTiers.find((tier) => totalQuantity >= tier.minQuantity)

  if (!applicableTier) {
    return 0 // 未达到最低数量要求
  }

  // 计算折扣金额
  const totalAmount = eligibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discountAmount = totalAmount * (1 - applicableTier.discount)

  return discountAmount
}

// 计算买一送一优惠
export function calculateBuyOneGetOneDiscount(
  items: Array<{ productId?: number; price: number; quantity: number }>,
  rules: BuyOneGetOneRule
): { discount: number; freeItems: Array<{ productId: number; quantity: number }> } {
  // 找到购买的商品
  const buyItem = items.find((item) => item.productId === rules.buyProductId)

  if (!buyItem) {
    return { discount: 0, freeItems: [] }
  }

  // 计算可以获得多少组赠品
  const sets = Math.floor(buyItem.quantity / rules.buyQuantity)
  const maxSets = rules.maxSets || Infinity
  const actualSets = Math.min(sets, maxSets)

  if (actualSets === 0) {
    return { discount: 0, freeItems: [] }
  }

  // 计算赠品数量
  const freeQuantity = actualSets * rules.getQuantity

  // 计算折扣金额（赠品的价值）
  const freeItemPrice = rules.getProductPrice || 0
  const discount = freeItemPrice * freeQuantity

  return {
    discount,
    freeItems: [
      {
        productId: rules.getProductId,
        quantity: freeQuantity
      }
    ]
  }
}

// 核心计算逻辑，供 Cart 和 Order 复用
export async function calculatePromotionsForOrder(
  storeId: number,
  items: Array<{ productId?: number; categoryId?: number; price: number; quantity: number }>,
  amount: number,
  isNewUser: boolean = false
) {
  const now = new Date()

  // 获取有效活动
  const conditions = [
    eq(promotions.status, 'ACTIVE'),
    lte(promotions.startTime, now),
    gte(promotions.endTime, now),
    eq(promotions.storeId, storeId)
  ]

  const activePromotions = await db
    .select()
    .from(promotions)
    .where(and(...conditions))
    .orderBy(desc(promotions.priority))

  let totalDiscount = 0
  const appliedPromotions: Array<{
    id: number
    name: string
    type: string
    discount: number
  }> = []

  for (const promo of activePromotions) {
    // 新人专享检查
    if (promo.type === 'NEW_USER' && !isNewUser) {
      continue
    }

    let discount = 0

    if (promo.type === 'FULL_REDUCE') {
      const rules = promo.rules as unknown as FullReduceRule
      discount = calculateFullReduceDiscount(amount, rules)
    } else if (promo.type === 'DISCOUNT' || promo.type === 'TIME_LIMITED') {
      const rules = promo.rules as unknown as DiscountRule
      discount = calculateDiscountAmount(amount, rules)
    } else if (promo.type === 'NEW_USER') {
      const rules = promo.rules as { discount: number }
      discount = rules.discount
    } else if (promo.type === 'SECOND_HALF_PRICE') {
      const rules = promo.rules as unknown as SecondHalfPriceRule
      discount = calculateSecondHalfPriceDiscount(items || [], rules)
    } else if (promo.type === 'QUANTITY_DISCOUNT') {
      const rules = promo.rules as unknown as QuantityDiscountRule
      discount = calculateQuantityDiscountAmount(items || [], rules)
    } else if (promo.type === 'BUY_ONE_GET_ONE') {
      const rules = promo.rules as unknown as BuyOneGetOneRule
      const result = calculateBuyOneGetOneDiscount(items || [], rules)
      discount = result.discount
      // Note: freeItems info is available in result.freeItems if needed
    }

    if (discount > 0) {
      appliedPromotions.push({
        id: promo.id,
        name: promo.name,
        type: promo.type,
        discount: Math.round(discount * 100) / 100
      })

      totalDiscount += discount

      // 如果不可叠加，只应用第一个
      if (!promo.stackable) {
        break
      }
    }
  }

  return {
    originalAmount: amount,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    finalAmount: Math.round((amount - totalDiscount) * 100) / 100,
    appliedPromotions
  }
}

export const promotionRoutes = new Elysia({ prefix: '/api/promotions' })
  // ... (existing endpoints) ...

  // 计算订单优惠（预览）
  .post(
    '/calculate',
    async ({ body }) => {
      const { storeId, amount, isNewUser, items } = body
      return success(
        await calculatePromotionsForOrder(storeId || 0, items || [], amount, isNewUser)
      )
    },
    {
      body: t.Object({
        storeId: t.Optional(t.Number()),
        amount: t.Number({ minimum: 0 }),
        isNewUser: t.Optional(t.Boolean()),
        items: t.Optional(
          t.Array(
            t.Object({
              productId: t.Optional(t.Number()),
              categoryId: t.Optional(t.Number()),
              price: t.Number(),
              quantity: t.Number()
            })
          )
        )
      }),
      detail: { tags: ['Promotions'], summary: '计算订单优惠' }
    }
  )
