/**
 * 初始化预设页面配置
 * 运行: bun run scripts/init-page-configs.ts
 */

import { db, pageConfigs, stores } from '../src/db'
import { eq, and } from 'drizzle-orm'
import type { PageComponent } from '../src/db'

// 预设首页配置（精美布局）
const PRESET_HOME_CONFIG: PageComponent[] = [
  {
    id: 'home-banner-1',
    type: 'BANNER',
    title: '轮播图',
    visible: true,
    props: {
      autoplay: true,
      interval: 3000,
      height: 200,
      showIndicator: true,
      indicatorStyle: 'dot'
    }
  },
  {
    id: 'home-notice-1',
    type: 'NOTICE',
    title: '公告栏',
    visible: true,
    props: {
      scrollable: true,
      speed: 50
    }
  },
  {
    id: 'home-nav-1',
    type: 'NAV_GRID',
    title: '快捷导航',
    visible: true,
    props: {
      columns: 4,
      items: [
        { icon: '🔥', text: '热销', link: { type: 'category', value: '' } },
        { icon: '🎁', text: '套餐', link: { type: 'page', value: '/pages/combos/list' } },
        { icon: '🎫', text: '优惠券', link: { type: 'page', value: '/pages/mine/coupons' } },
        { icon: '📋', text: '订单', link: { type: 'page', value: '/pages/order/list' } }
      ]
    }
  },
  {
    id: 'home-focus-1',
    type: 'FOCUS_ENTRY',
    title: '焦点入口',
    visible: true,
    props: {
      icon: '🍜',
      text: '立即点餐',
      bgColor: '#FF6B35',
      link: { type: 'page', value: '/pages/menu/menu' }
    }
  },
  {
    id: 'home-hot-1',
    type: 'HOT_PRODUCTS',
    title: '热销推荐',
    visible: true,
    props: {
      limit: 6,
      showRank: true
    }
  },
  {
    id: 'home-spacer-1',
    type: 'SPACER',
    title: '分隔符',
    visible: true,
    props: {
      height: 20,
      backgroundColor: '#f5f5f5'
    }
  },
  {
    id: 'home-new-1',
    type: 'NEW_PRODUCTS',
    title: '新品上市',
    visible: true,
    props: {
      limit: 4,
      showBadge: true
    }
  },
  {
    id: 'home-coupon-1',
    type: 'COUPON',
    title: '优惠券',
    visible: true,
    props: {
      showCount: 3
    }
  }
]

// 预设点餐页配置（包含点单组件）
const PRESET_MENU_CONFIG: PageComponent[] = [
  {
    id: 'menu-banner-1',
    type: 'BANNER',
    title: '轮播图',
    visible: true,
    props: {
      autoplay: true,
      interval: 3000,
      height: 180
    }
  },
  {
    id: 'menu-notice-1',
    type: 'NOTICE',
    title: '公告栏',
    visible: true,
    props: {
      scrollable: true
    }
  },
  {
    id: 'menu-order-1',
    type: 'ORDER_COMPONENT',
    title: '点单组件',
    visible: true,
    props: {
      categoryStyle: 'left', // 左侧分类
      productStyle: 'large', // 大图模式
      showSales: true,
      showStock: false,
      showDesc: true
    }
  }
]

async function initPageConfigs() {
  console.log('开始初始化预设页面配置...')

  // 获取所有门店
  const allStores = await db.select().from(stores)

  if (allStores.length === 0) {
    console.log('⚠️  没有找到门店，请先创建门店')
    return
  }

  console.log(`找到 ${allStores.length} 个门店`)

  for (const store of allStores) {
    console.log(`\n处理门店: ${store.name} (ID: ${store.id})`)

    // 检查是否已有配置
    const existingHome = await db
      .select()
      .from(pageConfigs)
      .where(and(eq(pageConfigs.storeId, store.id), eq(pageConfigs.pageType, 'HOME')))
      .limit(1)

    const existingMenu = await db
      .select()
      .from(pageConfigs)
      .where(and(eq(pageConfigs.storeId, store.id), eq(pageConfigs.pageType, 'MENU')))
      .limit(1)

    // 创建首页配置
    if (existingHome.length === 0) {
      await db.insert(pageConfigs).values({
        storeId: store.id,
        pageType: 'HOME',
        components: PRESET_HOME_CONFIG,
        isPublished: true,
        publishedAt: new Date()
      })
      console.log('  ✅ 已创建首页配置')
    } else {
      console.log('  ⏭️  首页配置已存在，跳过')
    }

    // 创建点餐页配置
    if (existingMenu.length === 0) {
      await db.insert(pageConfigs).values({
        storeId: store.id,
        pageType: 'MENU',
        components: PRESET_MENU_CONFIG,
        isPublished: true,
        publishedAt: new Date()
      })
      console.log('  ✅ 已创建点餐页配置')
    } else {
      console.log('  ⏭️  点餐页配置已存在，跳过')
    }
  }

  console.log('\n✅ 初始化完成！')
  console.log('\n提示：')
  console.log('1. 首页配置已发布，小程序首页将显示配置的布局')
  console.log('2. 点餐页配置已发布，小程序点餐页将显示配置的布局')
  console.log('3. 可以在后台管理系统中修改这些配置')
}

// 运行
initPageConfigs()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('初始化失败:', error)
    process.exit(1)
  })
