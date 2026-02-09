import { z } from 'zod'

// ==================== 通用校验 ====================

export const phoneRegex = /^1[3-9]\d{9}$/

// ==================== 门店校验 ====================

export const storeSchema = z.object({
  name: z.string().min(1, '门店名称不能为空').max(100, '门店名称最多100字符'),
  address: z.string().max(200, '地址最多200字符').optional().or(z.literal('')),
  phone: z.string().regex(phoneRegex, '请输入正确的手机号').optional().or(z.literal('')),
  latitude: z.number().min(-90, '纬度范围 -90 到 90').max(90, '纬度范围 -90 到 90').optional(),
  longitude: z
    .number()
    .min(-180, '经度范围 -180 到 180')
    .max(180, '经度范围 -180 到 180')
    .optional(),
  logo: z.string().max(500).optional().or(z.literal(''))
})

export type StoreFormData = z.infer<typeof storeSchema>

// ==================== 分类校验 ====================

export const categorySchema = z.object({
  storeId: z.number({ error: '请选择门店' }),
  name: z.string().min(1, '分类名称不能为空').max(50, '分类名称最多50字符'),
  sort: z.number().min(0, '排序值不能为负数').max(999, '排序值最大999').optional(),
  icon: z.string().max(50, '图标最多50字符').optional().or(z.literal(''))
})

export type CategoryFormData = z.infer<typeof categorySchema>

// ==================== 商品校验 ====================

export const productSchema = z.object({
  storeId: z.number({ error: '请选择门店' }),
  categoryId: z.number({ error: '请选择分类' }),
  name: z.string().min(1, '商品名称不能为空').max(100, '商品名称最多100字符'),
  description: z.string().max(500, '描述最多500字符').optional().or(z.literal('')),
  imageUrl: z.string().max(500).optional().or(z.literal('')),
  basePrice: z
    .number({ error: '请输入有效价格' })
    .min(0, '价格不能为负数')
    .max(99999, '价格最大99999'),
  type: z.enum(['SINGLE', 'VARIANT']).optional()
})

export type ProductFormData = z.infer<typeof productSchema>

// ==================== 商品规格校验 ====================

export const variantSchema = z.object({
  name: z.string().min(1, '规格名称不能为空').max(50, '规格名称最多50字符'),
  price: z.number({ error: '请输入有效价格' }).min(0, '价格不能为负数').max(99999, '价格最大99999'),
  stock: z.number().min(-1, '库存不能小于-1').optional()
})

export type VariantFormData = z.infer<typeof variantSchema>

// ==================== 桌台校验 ====================

export const tableSchema = z.object({
  storeId: z.number({ error: '请选择门店' }),
  name: z.string().min(1, '桌台名称不能为空').max(50, '桌台名称最多50字符'),
  capacity: z.number().min(1, '容纳人数至少1人').max(50, '容纳人数最多50人').optional()
})

export type TableFormData = z.infer<typeof tableSchema>

// 批量创建桌台
export const tableBatchSchema = z.object({
  storeId: z.number({ error: '请选择门店' }),
  prefix: z.string().min(1, '前缀不能为空').max(10, '前缀最多10字符'),
  startNum: z.number().min(1, '起始号最小为1'),
  count: z.number().min(1, '数量至少1').max(100, '数量最多100'),
  capacity: z.number().min(1, '容纳人数至少1人').max(50, '容纳人数最多50人').optional()
})

export type TableBatchFormData = z.infer<typeof tableBatchSchema>

// ==================== 打印机校验 ====================

export const printerSchema = z.object({
  storeId: z.number({ error: '请选择门店' }),
  sn: z.string().min(1, 'SN码不能为空').max(100, 'SN码最多100字符'),
  key: z.string().min(1, '密钥不能为空').max(100, '密钥最多100字符'),
  name: z.string().min(1, '打印机名称不能为空').max(50, '打印机名称最多50字符'),
  type: z.enum(['KITCHEN', 'CASHIER', 'BAR']).optional()
})

export type PrinterFormData = z.infer<typeof printerSchema>

// ==================== 员工校验 ====================

export const staffSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少3字符')
    .max(50, '用户名最多50字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字、下划线'),
  password: z.string().min(6, '密码至少6字符').max(100, '密码最多100字符').or(z.literal('')),
  name: z.string().min(1, '姓名不能为空').max(50, '姓名最多50字符'),
  role: z.enum(['SUPER_ADMIN', 'OWNER', 'STAFF']),
  storeId: z.number().optional()
})

export type StaffFormData = z.infer<typeof staffSchema>

// 更新员工（密码可选）
export const staffUpdateSchema = staffSchema.partial().extend({
  password: z
    .string()
    .min(6, '密码至少6字符')
    .max(100, '密码最多100字符')
    .optional()
    .or(z.literal(''))
})

export type StaffUpdateFormData = z.infer<typeof staffUpdateSchema>

// ==================== 辅助函数 ====================

/**
 * 格式化 zod 错误
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    if (!errors[path]) {
      errors[path] = issue.message
    }
  }
  return errors
}

/**
 * 价格格式化（分转元）
 */
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2)
}

/**
 * 价格解析（元转分）
 */
export function parsePrice(yuan: string | number): number {
  return Math.round(Number(yuan) * 100)
}
