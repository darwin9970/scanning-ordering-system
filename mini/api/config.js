// API 配置

// 开发环境 API 地址
const DEV_BASE_URL = 'http://localhost:4000'

// 生产环境 API 地址 (部署后修改)
const PROD_BASE_URL = 'https://api.example.com'

// 当前环境
const isDev = process.env.NODE_ENV === 'development'

export const config = {
  // API 基础地址
  baseUrl: isDev ? DEV_BASE_URL : PROD_BASE_URL,

  // 请求超时时间 (毫秒)
  timeout: 10000,

  // WebSocket 地址
  wsUrl: isDev ? 'ws://localhost:4000/ws' : 'wss://api.example.com/ws'
}

export default config
