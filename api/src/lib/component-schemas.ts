import { z } from 'zod'

// 通用链接类型
const linkSchema = z.object({
  type: z.enum(['page', 'category', 'product', 'url', 'miniprogram', 'search', 'cart']),
  value: z.string().optional(),
  appId: z.string().optional(),
  path: z.string().optional()
})

// 基础组件 Props 验证
export const componentSchemas = {
  // 轮播图
  BANNER: z.object({
    autoplay: z.boolean().default(true),
    interval: z.number().min(1000).max(10000).default(3000),
    height: z.number().min(100).max(500).default(180),
    showIndicator: z.boolean().default(true),
    indicatorStyle: z.enum(['dot', 'number']).default('dot'),
    indicatorPosition: z.enum(['left', 'center', 'right']).default('center'),
    indicatorColor: z.string().default('white')
  }),

  // 公告栏
  NOTICE: z.object({
    scrollable: z.boolean().default(true),
    speed: z.number().min(10).max(200).default(50),
    bgColor: z.string().default('#fff7e6'),
    textColor: z.string().default('#d48806')
  }),

  // 导航网格
  NAV_GRID: z.object({
    columns: z.number().min(2).max(5).default(4),
    items: z
      .array(
        z.object({
          icon: z.string(),
          text: z.string().max(10),
          link: linkSchema
        })
      )
      .max(20)
  }),

  // 热销商品
  HOT_PRODUCTS: z.object({
    limit: z.number().min(1).max(20).default(6),
    showRank: z.boolean().default(true),
    title: z.string().max(20).optional()
  }),

  // 新品推荐
  NEW_PRODUCTS: z.object({
    limit: z.number().min(1).max(20).default(4),
    showBadge: z.boolean().default(true),
    title: z.string().max(20).optional()
  }),

  // 优惠券
  COUPON: z.object({
    showCount: z.number().min(1).max(10).default(3)
  }),

  // 单图广告
  IMAGE: z.object({
    image: z.string().url().optional(),
    height: z.number().min(50).max(500).default(120),
    link: linkSchema.optional()
  }),

  // 商品列表
  PRODUCT_LIST: z.object({
    categoryId: z.number().optional(),
    limit: z.number().min(1).max(50).default(10)
  }),

  // 商品网格
  PRODUCT_GRID: z.object({
    categoryId: z.number().optional(),
    columns: z.number().min(2).max(4).default(2),
    limit: z.number().min(1).max(50).default(8)
  }),

  // 分隔符
  SPACER: z.object({
    height: z.number().min(5).max(100).default(20),
    backgroundColor: z.string().default('#f5f5f5')
  }),

  // 搜索模块
  SEARCH: z.object({
    placeholder: z.string().max(20).default('搜索商品'),
    bgColor: z.string().default('#f5f5f5')
  }),

  // 门店标题
  STORE_TITLE: z.object({
    showStatus: z.boolean().default(true),
    showDistance: z.boolean().default(true)
  }),

  // 购物车悬浮按钮
  CART_FLOAT: z.object({
    position: z.enum(['right-bottom', 'left-bottom']).default('right-bottom'),
    showCount: z.boolean().default(true)
  }),

  // 文本元素
  TEXT: z.object({
    content: z.string().max(500).default(''),
    fontSize: z.number().min(10).max(50).default(14),
    color: z.string().default('#333'),
    fontWeight: z.enum(['normal', 'bold']).default('normal'),
    align: z.enum(['left', 'center', 'right']).default('left')
  }),

  // 自由容器
  FREE_CONTAINER: z.object({
    height: z.number().min(50).max(1000).default(200),
    bgColor: z.string().default('transparent'),
    bgImage: z.string().url().optional(),
    padding: z.number().min(0).max(50).default(0),
    overflow: z.enum(['visible', 'hidden', 'scroll']).default('hidden')
  }),

  // 会员信息
  USER_INFO: z.object({
    showAvatar: z.boolean().default(true),
    showNickname: z.boolean().default(true),
    showBalance: z.boolean().default(true),
    showPoints: z.boolean().default(true),
    showCoupons: z.boolean().default(true)
  }),

  // 功能入口
  FUNC_ENTRY: z.object({
    columns: z.number().min(2).max(5).default(4),
    items: z
      .array(
        z.object({
          icon: z.string(),
          text: z.string().max(10),
          link: linkSchema
        })
      )
      .max(20)
  }),

  // 焦点入口
  FOCUS_ENTRY: z.object({
    icon: z.string().default('🔥'),
    text: z.string().max(20).default('点我下单'),
    bgColor: z.string().default('#ff6b35'),
    link: linkSchema.optional()
  }),

  // 集点卡
  STAMP_CARD: z.object({
    title: z.string().max(20).default('集点活动'),
    subtitle: z.string().max(30).optional(),
    total: z.number().min(1).max(50).default(10),
    current: z.number().min(0).max(50).default(0)
  }),

  // 储值余额入口
  BALANCE_ENTRY: z.object({
    showBalance: z.boolean().default(true)
  }),

  // 积分入口
  POINTS_ENTRY: z.object({
    showPoints: z.boolean().default(true)
  }),

  // 客服入口
  SERVICE_ENTRY: z.object({
    action: z.enum(['contact', 'call']).default('call'),
    icon: z.string().default('chat'),
    iconColor: z.string().default('#ff6b35'),
    text: z.string().max(20).default('联系客服')
  }),

  // 门店列表
  STORE_LIST: z.object({
    limit: z.number().min(1).max(20).default(5),
    showDistance: z.boolean().default(true)
  }),

  // 套餐推广
  COMBO_PROMO: z.object({
    title: z.string().max(20).optional(),
    limit: z.number().min(1).max(20).default(4)
  }),

  // 充值选项
  RECHARGE_OPTIONS: z.object({
    columns: z.number().min(1).max(3).default(2),
    items: z
      .array(
        z.object({
          amount: z.number().min(1),
          gift: z.number().min(0),
          giftType: z.enum(['balance', 'points']).default('balance')
        })
      )
      .max(10)
  }),

  // 充值按钮
  RECHARGE_BUTTON: z.object({
    text: z.string().max(20).default('立即充值'),
    bgColor: z.string().default('#ff6b35'),
    textColor: z.string().default('#fff')
  }),

  // 营销模块
  PROMOTION: z.object({
    items: z
      .array(
        z.object({
          image: z.string().url(),
          link: linkSchema
        })
      )
      .max(10)
  }),

  // 微信公众号
  WECHAT_OA: z.object({
    name: z.string().max(30).default('公众号名称'),
    description: z.string().max(50).default('关注公众号获取更多优惠'),
    avatar: z.string().url().optional(),
    btnText: z.string().max(10).default('关注'),
    btnColor: z.string().default('#07c160'),
    btnTextColor: z.string().default('#fff')
  }),

  // 微信小商店
  WECHAT_SHOP: z.object({
    title: z.string().max(30).default('微信小商店'),
    description: z.string().max(50).default('点击进入小商店'),
    image: z.string().url().optional(),
    appId: z.string().optional(),
    path: z.string().optional()
  }),

  // 就餐方式选择器
  DINING_TYPE: z.object({
    types: z
      .array(
        z.object({
          icon: z.string(),
          label: z.string().max(10),
          value: z.string()
        })
      )
      .min(2)
      .max(5)
      .default([
        { icon: '🍽️', label: '堂食', value: 'dine_in' },
        { icon: '🥡', label: '自取', value: 'takeout' },
        { icon: '🛵', label: '外卖', value: 'delivery' }
      ])
  }),

  // 礼品卡数量
  GIFT_CARD_COUNT: z.object({
    label: z.string().max(20).default('我的礼品卡')
  }),

  // 集章数量
  STAMP_COUNT: z.object({
    label: z.string().max(20).default('我的集章')
  }),

  // 点单组件
  ORDER_COMPONENT: z.object({
    categoryStyle: z.enum(['left', 'top']).default('left'),
    productStyle: z.enum(['list', 'grid', 'large']).default('list'),
    showSales: z.boolean().default(true),
    showStock: z.boolean().default(false),
    showDesc: z.boolean().default(true),
    showCart: z.boolean().default(true)
  })
}

// 验证组件 props
export function validateComponentProps(type: string, props: any) {
  const schema = componentSchemas[type as keyof typeof componentSchemas]
  if (!schema) {
    throw new Error(`未知的组件类型: ${type}`)
  }

  try {
    return schema.parse(props)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      throw new Error(`组件 ${type} 的配置验证失败: ${errors}`)
    }
    throw error
  }
}

// 验证整个组件
export function validateComponent(component: any) {
  // 基础字段验证
  const baseSchema = z.object({
    id: z.string(),
    type: z.string(),
    title: z.string().max(50).optional(),
    visible: z.boolean(),
    props: z.record(z.any()),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().min(1).max(1000).optional(),
    height: z.number().min(1).max(2000).optional(),
    zIndex: z.number().optional(),
    locked: z.boolean().optional()
  })

  const validatedBase = baseSchema.parse(component)

  // 验证 props
  const validatedProps = validateComponentProps(validatedBase.type, validatedBase.props)

  return {
    ...validatedBase,
    props: validatedProps
  }
}
