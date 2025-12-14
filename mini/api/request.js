/**
 * 封装 uni.request 请求
 */
import config from './config'
import { handleHttpError, showError } from '@/utils/error-handler'

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

// 封装请求方法
const request = (options) => {
  // 应用请求拦截器
  options = requestInterceptor(options)
  
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      timeout: options.timeout || config.timeout,
      success: (response) => {
        try {
          const result = responseInterceptor(response)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      },
      fail: (error) => {
        console.error('请求失败:', error)
        
        // 使用统一的网络错误处理
        import('@/utils/error-handler').then(({ showNetworkError }) => {
          showNetworkError('网络请求', () => {
            // 重试请求
            request(options).then(resolve).catch(reject)
          }, true)
        })
        
        // 同时 reject，让调用方可以 catch
        const errorMsg = error.errMsg?.includes('timeout') 
          ? '请求超时，请检查网络' 
          : '网络连接失败，请检查网络设置'
        reject(new Error(errorMsg))
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
