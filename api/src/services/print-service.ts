import { eq } from 'drizzle-orm'
import { db, printJobs, categoryPrinters, products, orderItems, printers } from '../db'
import redis, { PRINT_STREAM_KEY } from '../lib/redis'

interface OrderItemWithCategory {
  id: number
  categoryId: number
  productId: number
}

// 创建打印任务
export async function createPrintJobs(orderId: number, storeId: number) {
  // 获取订单项及其分类
  const items = await db
    .select({
      id: orderItems.id,
      categoryId: products.categoryId,
      productId: products.id
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productVariantId, products.id))
    .where(eq(orderItems.orderId, orderId))

  // 按分类分组
  const categoryItems = new Map<number, OrderItemWithCategory[]>()
  for (const item of items) {
    if (!item.categoryId) continue
    if (!categoryItems.has(item.categoryId)) {
      categoryItems.set(item.categoryId, [])
    }
    categoryItems.get(item.categoryId)!.push(item as OrderItemWithCategory)
  }

  // 获取每个分类绑定的打印机
  const printJobsToCreate: { orderId: number; printerId: number; content: object }[] = []

  for (const [categoryId, _items] of categoryItems) {
    const bindings = await db
      .select({ printerId: categoryPrinters.printerId })
      .from(categoryPrinters)
      .where(eq(categoryPrinters.categoryId, categoryId))

    for (const binding of bindings) {
      // 检查是否已有相同的打印任务
      const existing = printJobsToCreate.find((j) => j.printerId === binding.printerId)
      if (!existing) {
        printJobsToCreate.push({
          orderId,
          printerId: binding.printerId,
          content: { categoryId, itemCount: _items.length }
        })
      }
    }
  }

  // 如果没有分类绑定，发送到所有后厨打印机
  if (printJobsToCreate.length === 0) {
    const kitchenPrinters = await db.select().from(printers).where(eq(printers.storeId, storeId))

    for (const printer of kitchenPrinters) {
      if (printer.type === 'KITCHEN') {
        printJobsToCreate.push({
          orderId,
          printerId: printer.id,
          content: { allItems: true }
        })
      }
    }
  }

  // 创建打印任务记录
  const createdJobs = []
  for (const job of printJobsToCreate) {
    const [created] = await db
      .insert(printJobs)
      .values({
        orderId: job.orderId,
        printerId: job.printerId,
        content: job.content,
        status: 'PENDING'
      })
      .returning()

    if (created) {
      createdJobs.push(created)

      // 发送到 Redis Stream
      if (redis) {
        await redis.xadd(
          PRINT_STREAM_KEY,
          '*',
          'data',
          JSON.stringify({
            orderId: job.orderId,
            printerId: job.printerId,
            jobId: created.id
          })
        )
      }
    }
  }

  console.log(`📠 Created ${createdJobs.length} print jobs for order ${orderId}`)
  return createdJobs
}

// 手动重试打印任务
export async function retryPrintJob(jobId: number) {
  const [job] = await db.select().from(printJobs).where(eq(printJobs.id, jobId)).limit(1)

  if (!job) {
    throw new Error('Print job not found')
  }

  if (job.status !== 'FAILED' && job.status !== 'DEAD') {
    throw new Error('Only failed jobs can be retried')
  }

  // 重置状态
  await db
    .update(printJobs)
    .set({
      status: 'PENDING',
      retries: 0,
      error: null
    })
    .where(eq(printJobs.id, jobId))

  // 重新加入队列
  if (redis) {
    await redis.xadd(
      PRINT_STREAM_KEY,
      '*',
      'data',
      JSON.stringify({
        orderId: job.orderId,
        printerId: job.printerId,
        jobId: job.id
      })
    )
  }

  return job
}
