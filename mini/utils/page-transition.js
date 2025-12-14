/**
 * 页面切换过渡动画工具
 * 提供统一的页面切换动画效果
 */

/**
 * 页面进入动画
 * @param {string} type - 动画类型: slide, fade, scale
 */
export function pageEnter(type = 'slide') {
  // uni-app 的页面动画需要在 pages.json 中配置
  // 这里提供工具函数用于动态设置
  const animationMap = {
    slide: {
      animationType: 'slide-in-right',
      animationDuration: 300
    },
    fade: {
      animationType: 'fade-in',
      animationDuration: 250
    },
    scale: {
      animationType: 'zoom-in',
      animationDuration: 300
    }
  }
  
  return animationMap[type] || animationMap.slide
}

/**
 * 页面退出动画
 * @param {string} type - 动画类型: slide, fade, scale
 */
export function pageExit(type = 'slide') {
  const animationMap = {
    slide: {
      animationType: 'slide-out-left',
      animationDuration: 300
    },
    fade: {
      animationType: 'fade-out',
      animationDuration: 250
    },
    scale: {
      animationType: 'zoom-out',
      animationDuration: 300
    }
  }
  
  return animationMap[type] || animationMap.slide
}

/**
 * 自定义导航栏动画
 * @param {object} options - 动画选项
 */
export function animateNavigation(options = {}) {
  // 在 uni-app 中，导航栏动画主要通过 CSS 实现
  // 这里提供工具函数用于统一管理
  return {
    duration: options.duration || 300,
    timingFunction: options.timingFunction || 'ease-out'
  }
}

