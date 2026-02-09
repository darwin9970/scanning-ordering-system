/**
 * Toast 提示工具
 * 统一管理成功、失败、警告等提示
 */

/**
 * 成功提示
 * @param {string} title - 提示文字
 * @param {number} duration - 显示时长（毫秒）
 */
export function showSuccess(title, duration = 2000) {
  uni.showToast({
    title,
    icon: 'success',
    duration,
    mask: true
  })

  // 触觉反馈
  // #ifdef MP-WEIXIN
  uni.vibrateShort({
    type: 'light'
  })
  // #endif
}

/**
 * 错误提示
 * @param {string} title - 提示文字
 * @param {number} duration - 显示时长（毫秒）
 */
export function showError(title, duration = 2000) {
  uni.showToast({
    title,
    icon: 'none',
    duration,
    mask: true,
    image: '/static/images/icon-error.png' // 可选：自定义错误图标
  })

  // 触觉反馈
  // #ifdef MP-WEIXIN
  uni.vibrateShort({
    type: 'medium'
  })
  // #endif
}

/**
 * 警告提示
 * @param {string} title - 提示文字
 * @param {number} duration - 显示时长（毫秒）
 */
export function showWarning(title, duration = 2000) {
  uni.showToast({
    title,
    icon: 'none',
    duration,
    mask: false
  })
}

/**
 * 信息提示
 * @param {string} title - 提示文字
 * @param {number} duration - 显示时长（毫秒）
 */
export function showInfo(title, duration = 2000) {
  uni.showToast({
    title,
    icon: 'none',
    duration,
    mask: false
  })
}

/**
 * 加载提示
 * @param {string} title - 提示文字，默认"加载中..."
 */
export function showLoading(title = '加载中...') {
  uni.showLoading({
    title,
    mask: true
  })
}

/**
 * 隐藏加载提示
 */
export function hideLoading() {
  uni.hideLoading()
}

/**
 * 操作成功提示（带详细描述）
 * @param {string} action - 操作名称，如"加入购物车"、"下单成功"
 * @param {string} detail - 详细信息，可选
 */
export function showActionSuccess(action, detail) {
  const title = detail ? `${action}成功！${detail}` : `${action}成功！`
  showSuccess(title)
}

/**
 * 操作失败提示（带原因）
 * @param {string} action - 操作名称
 * @param {string} reason - 失败原因
 */
export function showActionError(action, reason) {
  const title = reason ? `${action}失败：${reason}` : `${action}失败，请重试`
  showError(title)
}
