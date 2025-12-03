/**
 * 封装 uni.request 请求
 */
import config from './config'

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
      // 业务错误
      const error = new Error(data.message || '请求失败')
      error.code = data.code
      throw error
    }
  } else if (statusCode === 401) {
    // 未授权，清除 token 并跳转登录
    uni.removeStorageSync('token')
    uni.showToast({
      title: '登录已过期',
      icon: 'none'
    })
    throw new Error('未授权')
  } else {
    // 其他 HTTP 错误
    const error = new Error(data.message || `请求失败: ${statusCode}`)
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
        uni.showToast({
          title: '网络请求失败',
          icon: 'none'
        })
        reject(new Error('网络请求失败'))
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
