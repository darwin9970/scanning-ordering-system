import { eq } from 'drizzle-orm'
import { db, printJobs, printers, orders, orderItems } from '../db'
import redis, { PRINT_STREAM_KEY } from '../lib/redis'
import { broadcastToStore, WS_EVENTS } from '../ws'

const CONSUMER_GROUP = 'print_workers'
const CONSUMER_NAME = `worker_${process.pid}`
const MAX_RETRIES = 3

interface PrintJobMessage {
  orderId: number
  printerId: number
  jobId: number
}

// 创建消费者组
async function ensureConsumerGroup() {
  if (!redis) return false

  try {
    await redis.xgroup('CREATE', PRINT_STREAM_KEY, CONSUMER_GROUP, '0', 'MKSTREAM')
    console.log(`✅ Consumer group ${CONSUMER_GROUP} created`)
  } catch (e) {
    if (e instanceof Error && !e.message?.includes('BUSYGROUP')) {
      console.error('Failed to create consumer group:', e)
      return false
    }
  }
  return true
}

// 处理打印任务
async function processPrintJob(job: PrintJobMessage): Promise<boolean> {
  const { orderId, printerId, jobId } = job

  try {
    // 获取打印机信息
    const [printer] = await db.select().from(printers).where(eq(printers.id, printerId)).limit(1)

    if (!printer) {
      console.error(`Printer ${printerId} not found`)
      return false
    }

    // 获取订单和订单项
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId))

    if (!order) {
      console.error(`Order ${orderId} not found`)
      return false
    }

    // 构建打印内容
    const printContent = buildPrintContent(order, items, printer)

    // 更新任务状态为打印中
    await db.update(printJobs).set({ status: 'PRINTING' }).where(eq(printJobs.id, jobId))

    // 调用打印机 API（这里模拟）
    const success = await sendToPrinter(printer, printContent)

    if (success) {
      // 更新任务状态为成功
      await db.update(printJobs).set({ status: 'SUCCESS' }).where(eq(printJobs.id, jobId))

      // 广播打印完成通知
      broadcastToStore(order.storeId, WS_EVENTS.PRINT_JOB_COMPLETED, {
        jobId,
        orderId,
        printerName: printer.name
      })

      console.log(`✅ Print job ${jobId} completed`)
      return true
    } else {
      throw new Error('Printer API failed')
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e)
    console.error(`❌ Print job ${jobId} failed:`, errorMsg)

    // 获取当前重试次数
    const [currentJob] = await db.select().from(printJobs).where(eq(printJobs.id, jobId)).limit(1)

    if (currentJob && currentJob.retries < MAX_RETRIES) {
      // 增加重试次数
      await db
        .update(printJobs)
        .set({
          status: 'PENDING',
          retries: currentJob.retries + 1,
          error: errorMsg
        })
        .where(eq(printJobs.id, jobId))

      // 重新加入队列
      if (redis) {
        await redis.xadd(PRINT_STREAM_KEY, '*', 'data', JSON.stringify(job))
      }
    } else {
      // 标记为死信
      await db
        .update(printJobs)
        .set({
          status: 'DEAD',
          error: `Max retries exceeded: ${errorMsg}`
        })
        .where(eq(printJobs.id, jobId))

      // 广播打印失败通知
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
      if (order) {
        broadcastToStore(order.storeId, WS_EVENTS.PRINT_JOB_FAILED, {
          jobId,
          orderId,
          error: errorMsg
        })
      }
    }

    return false
  }
}

// 构建打印内容
function buildPrintContent(
  order: typeof orders.$inferSelect,
  items: (typeof orderItems.$inferSelect)[],
  printer: typeof printers.$inferSelect
) {
  const lines: string[] = []

  lines.push('================================')
  lines.push(`       ${printer.type === 'KITCHEN' ? '后厨' : '收银'}小票`)
  lines.push('================================')
  lines.push(`订单号: ${order.orderNo}`)
  lines.push(`下单时间: ${order.createdAt.toLocaleString('zh-CN')}`)
  lines.push('--------------------------------')

  items.forEach((item) => {
    const snapshot = item.snapshot as { name: string; specs?: Record<string, string> }
    let itemLine = `${snapshot.name} x${item.quantity}`
    if (snapshot.specs && Object.keys(snapshot.specs).length > 0) {
      itemLine += ` (${Object.values(snapshot.specs).join('/')})`
    }
    lines.push(itemLine)

    if (item.attributes) {
      const attrs = item.attributes as { name: string; value: string }[]
      attrs.forEach((attr) => {
        lines.push(`  - ${attr.name}: ${attr.value}`)
      })
    }
  })

  lines.push('--------------------------------')
  lines.push(`合计: ¥${order.payAmount}`)
  if (order.remark) {
    lines.push(`备注: ${order.remark}`)
  }
  lines.push('================================')

  return lines.join('\n')
}

// 发送到打印机（模拟）
async function sendToPrinter(
  printer: typeof printers.$inferSelect,
  content: string
): Promise<boolean> {
  // 这里应该调用实际的打印机 API
  // 例如：飞鹅云、易联云等
  console.log(`📠 Sending to printer ${printer.sn}:`)
  console.log(content)

  // 模拟打印延迟
  await new Promise((resolve) => setTimeout(resolve, 500))

  // 模拟 95% 成功率
  return Math.random() > 0.05
}

// 主循环
async function startWorker() {
  console.log('🖨️ Print Worker starting...')

  if (!redis) {
    console.warn('⚠️ Redis not available, print worker disabled')
    return
  }

  const groupCreated = await ensureConsumerGroup()
  if (!groupCreated) {
    console.error('Failed to initialize consumer group')
    return
  }

  console.log('🖨️ Print Worker started, waiting for jobs...')

  while (true) {
    try {
      // 从 Stream 读取消息
      const messages = (await redis.xreadgroup(
        'GROUP',
        CONSUMER_GROUP,
        CONSUMER_NAME,
        'COUNT',
        10,
        'BLOCK',
        5000, // 5秒超时
        'STREAMS',
        PRINT_STREAM_KEY,
        '>'
      )) as [string, [string, string[]][]][] | null

      if (!messages || messages.length === 0) continue

      for (const [_stream, entries] of messages) {
        for (const [messageId, fields] of entries) {
          try {
            const data = JSON.parse(fields[1] || '{}') as PrintJobMessage
            const success = await processPrintJob(data)

            if (success) {
              // ACK 消息
              await redis.xack(PRINT_STREAM_KEY, CONSUMER_GROUP, messageId)
            }
          } catch (e) {
            console.error('Failed to process message:', e)
          }
        }
      }
    } catch (e) {
      console.error('Worker error:', e)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
}

// 导出启动函数
export { startWorker }

// 如果直接运行此文件
if (import.meta.main) {
  startWorker()
}
