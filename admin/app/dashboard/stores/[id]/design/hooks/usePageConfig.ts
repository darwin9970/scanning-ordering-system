import { useState, useCallback } from 'react'

export interface PageSettings {
  title: string
  navBgColor: string
  navTextColor: 'white' | 'black'
  pageBgColor: string
  hideNav: boolean
}

export interface GlobalConfig {
  themeColor: string
  paddingLeft: number
  paddingRight: number
  borderRadius: 'none' | 'rounded' | 'large' | 'custom'
  customRadius: number
  shadow: boolean
}

export interface TabBarConfig {
  color: string
  selectedColor: string
  backgroundColor: string
  borderStyle: 'black' | 'white'
  list: { pagePath: string; text: string; iconPath: string; selectedIconPath: string }[]
}

const DEFAULT_PAGE_SETTINGS: PageSettings = {
  title: '',
  navBgColor: '#ffffff',
  navTextColor: 'black',
  pageBgColor: '#f5f5f5',
  hideNav: false
}

const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  themeColor: '#ff6b35',
  paddingLeft: 12,
  paddingRight: 12,
  borderRadius: 'rounded',
  customRadius: 8,
  shadow: true
}

const DEFAULT_TABBAR_CONFIG: TabBarConfig = {
  color: '#999999',
  selectedColor: '#ff6b35',
  backgroundColor: '#ffffff',
  borderStyle: 'black',
  list: [
    {
      pagePath: 'pages/home/home',
      text: '首页',
      iconPath: '/static/tabbar/home.png',
      selectedIconPath: '/static/tabbar/home-active.png'
    },
    {
      pagePath: 'pages/menu/menu',
      text: '点餐',
      iconPath: '/static/tabbar/menu.png',
      selectedIconPath: '/static/tabbar/menu-active.png'
    },
    {
      pagePath: 'pages/order/list',
      text: '订单',
      iconPath: '/static/tabbar/order.png',
      selectedIconPath: '/static/tabbar/order-active.png'
    },
    {
      pagePath: 'pages/mine/mine',
      text: '我的',
      iconPath: '/static/tabbar/mine.png',
      selectedIconPath: '/static/tabbar/mine-active.png'
    }
  ]
}

export function usePageConfig() {
  const [pageSettings, setPageSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS)
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(DEFAULT_GLOBAL_CONFIG)
  const [tabBarConfig, setTabBarConfig] = useState<TabBarConfig>(DEFAULT_TABBAR_CONFIG)

  const updatePageSettings = useCallback((updates: Partial<PageSettings>) => {
    setPageSettings((prev) => ({ ...prev, ...updates }))
  }, [])

  const updateGlobalConfig = useCallback((updates: Partial<GlobalConfig>) => {
    setGlobalConfig((prev) => ({ ...prev, ...updates }))
  }, [])

  const updateTabBarConfig = useCallback((updates: Partial<TabBarConfig>) => {
    setTabBarConfig((prev) => ({ ...prev, ...updates }))
  }, [])

  const updateTabBarItem = useCallback(
    (index: number, updates: Partial<TabBarConfig['list'][0]>) => {
      setTabBarConfig((prev) => ({
        ...prev,
        list: prev.list.map((item, i) => (i === index ? { ...item, ...updates } : item))
      }))
    },
    []
  )

  const addTabBarItem = useCallback(() => {
    setTabBarConfig((prev) => ({
      ...prev,
      list: [...prev.list, { pagePath: '', text: '新标签', iconPath: '', selectedIconPath: '' }]
    }))
  }, [])

  const removeTabBarItem = useCallback((index: number) => {
    setTabBarConfig((prev) => ({
      ...prev,
      list: prev.list.filter((_, i) => i !== index)
    }))
  }, [])

  const resetPageSettings = useCallback(() => {
    setPageSettings(DEFAULT_PAGE_SETTINGS)
  }, [])

  const resetGlobalConfig = useCallback(() => {
    setGlobalConfig(DEFAULT_GLOBAL_CONFIG)
  }, [])

  const resetTabBarConfig = useCallback(() => {
    setTabBarConfig(DEFAULT_TABBAR_CONFIG)
  }, [])

  return {
    pageSettings,
    globalConfig,
    tabBarConfig,
    updatePageSettings,
    updateGlobalConfig,
    updateTabBarConfig,
    updateTabBarItem,
    addTabBarItem,
    removeTabBarItem,
    resetPageSettings,
    resetGlobalConfig,
    resetTabBarConfig
  }
}

export type UsePageConfigReturn = ReturnType<typeof usePageConfig>
