/**
 * 错误处理工具
 * 统一处理网络错误、业务错误等
 */

import { showError, showWarning } from './toast'

/**
 * 处理 API 错误
 * @param {Error} error - 错误对象
 * @param {object} options - 配置选项
 * @param {string} options.action - 操作名称
 * @param {function} options.onRetry - 重试回调
 * @param {boolean} options.showRetry - 是否显示重试按钮
 */
export function handleApiError(error, options = {}) {
  const { action = '操作', onRetry, showRetry = false } = options

  // 网络错误
  if (error.errMsg?.includes('network') || error.errMsg?.includes('timeout')) {
    showNetworkError(action, onRetry, showRetry)
    return
  }

  // 业务错误
  if (error.message) {
    showError(error.message)
    return
  }

  // 未知错误
  showError(`${action}失败，请稍后重试`)
}

/**
 * 显示网络错误提示
 * @param {string} action - 操作名称
 * @param {function} onRetry - 重试回调
 * @param {boolean} showRetry - 是否显示重试按钮
 */
export function showNetworkError(action, onRetry, showRetry = true) {
  uni.showModal({
    title: '网络错误',
    content: `${action}失败，请检查网络连接后重试`,
    showCancel: showRetry,
    confirmText: showRetry ? '重试' : '确定',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm && onRetry) {
        onRetry()
      }
    }
  })
}

/**
 * 显示表单验证错误
 * @param {string} field - 字段名称
 * @param {string} message - 错误信息
 */
export function showFormError(field, message) {
  showError(`${field}：${message}`)
}

/**
 * 处理 HTTP 状态码错误
 * @param {number} status - HTTP 状态码
 * @param {string} action - 操作名称
 */
export function handleHttpError(status, action = '操作') {
  const errorMap = {
    400: '请求参数错误',
    401: '未授权，请重新登录',
    403: '没有权限执行此操作',
    404: '请求的资源不存在',
    500: '服务器错误，请稍后重试',
    502: '网关错误',
    503: '服务暂时不可用',
    504: '请求超时'
  }

  const message = errorMap[status] || `${action}失败，请稍后重试`

  if (status === 401) {
    // 未授权，跳转登录
    uni.showModal({
      title: '提示',
      content: '登录已过期，请重新登录',
      showCancel: false,
      success: () => {
        // 清除 token
        uni.removeStorageSync('token')
        // 跳转登录页（如果有）
        // uni.reLaunch({ url: '/pages/login/login' })
      }
    })
  } else {
    showError(message)
  }
}
