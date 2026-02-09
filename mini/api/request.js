/**
 * 封装 uni.request 请求
 */
import config from './config'
import { handleHttpError, showError } from '@/utils/error-handler'

// 请求配置
const REQUEST_CONFIG = {
  maxRetries: 3, // 最大重试次数
  retryDelay: 1000, // 重试延迟（ms）
  timeout: config.timeout || 10000, // 超时时间
  retryableStatusCodes: [408, 429, 500, 502, 503, 504] // 可重试的状态码
}

// 请求拦截器
const requestInterceptor = (options) => {
  // 添加 baseUrl
  if (!options.url.startsWith('http')) {
    options.url = config.baseUrl + options.url
  }

  // 添加通用 headers
  options.header = {
    'Content-Type': 'application/json',
    ...options.header
  }

  // 添加 token (如果有)
  const token = uni.getStorageSync('token')
  if (token) {
    options.header['Authorization'] = `Bearer ${token}`
  }

  return options
}

// 响应拦截器
const responseInterceptor = (response) => {
  const { statusCode, data } = response

  // HTTP 状态码检查
  if (statusCode >= 200 && statusCode < 300) {
    // 业务状态码检查
    if (data.code === 200 || data.code === 0) {
      return data.data
    } else {
      // 业务错误 - 使用统一的错误处理
      const errorMsg = data.message || '操作失败，请稍后重试'
      showError(errorMsg)
      const error = new Error(errorMsg)
      error.code = data.code
      throw error
    }
  } else {
    // HTTP 错误 - 使用统一的错误处理
    handleHttpError(statusCode)
    const error = new Error(data?.message || `请求失败: ${statusCode}`)
    error.statusCode = statusCode
    throw error
  }
}

// 延迟函数
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 判断是否可重试
const isRetryable = (error) => {
  // 网络错误可重试
  if (error.errMsg?.includes('timeout') || error.errMsg?.includes('fail')) {
    return true
  }
  // 特定状态码可重试
  if (error.statusCode && REQUEST_CONFIG.retryableStatusCodes.includes(error.statusCode)) {
    return true
  }
  return false
}

// 封装请求方法（带重试逻辑）
const request = (options, retryCount = 0) => {
  // 应用请求拦截器
  options = requestInterceptor(options)

  // 设置超时
  if (!options.timeout) {
    options.timeout = REQUEST_CONFIG.timeout
  }

  return new Promise((resolve, reject) => {
    // 超时定时器
    const timeoutId = setTimeout(() => {
      const timeoutError = new Error('请求超时')
      timeoutError.isTimeout = true
      reject(timeoutError)
    }, options.timeout)

    uni.request({
      ...options,
      success: (response) => {
        clearTimeout(timeoutId)
        try {
          const result = responseInterceptor(response)
          resolve(result)
        } catch (error) {
          // 如果是可重试错误且未达到最大重试次数
          if (isRetryable(error) && retryCount < REQUEST_CONFIG.maxRetries) {
            console.log(`请求失败，第 ${retryCount + 1} 次重试...`)
            delay(REQUEST_CONFIG.retryDelay * (retryCount + 1))
              .then(() => request(options, retryCount + 1))
              .then(resolve)
              .catch(reject)
          } else {
            reject(error)
          }
        }
      },
      fail: (error) => {
        clearTimeout(timeoutId)
        console.error('请求失败:', error)

        // 如果是可重试错误且未达到最大重试次数
        if (isRetryable(error) && retryCount < REQUEST_CONFIG.maxRetries) {
          console.log(`网络错误，第 ${retryCount + 1} 次重试...`)
          delay(REQUEST_CONFIG.retryDelay * (retryCount + 1))
            .then(() => request(options, retryCount + 1))
            .then(resolve)
            .catch(reject)
        } else {
          // 使用统一的网络错误处理
          import('@/utils/error-handler').then(({ showNetworkError }) => {
            showNetworkError(
              '网络请求',
              () => {
                // 重试请求
                request(options, 0).then(resolve).catch(reject)
              },
              true
            )
          })

          // 同时 reject，让调用方可以 catch
          const errorMsg = error.errMsg?.includes('timeout')
            ? '请求超时，请检查网络'
            : '网络连接失败，请检查网络设置'
          reject(new Error(errorMsg))
        }
      }
    })
  })
}

// GET 请求
export const get = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  })
}

// POST 请求
export const post = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  })
}

// PUT 请求
export const put = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  })
}

// DELETE 请求
export const del = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  })
}

export default request
