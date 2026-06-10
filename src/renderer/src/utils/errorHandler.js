/**
 * 全局统一错误处理模块
 * 捕获未处理的异常和 Promise rejection，统一记录日志并可选上报
 */

/**
 * 错误等级
 */
export const ErrorLevel = {
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
}

/**
 * 处理错误：打印结构化日志
 * @param {string} context - 错误发生的上下文描述
 * @param {Error|any} error - 错误对象
 * @param {string} level - 错误等级
 */
export function handleError(context, error, level = ErrorLevel.ERROR) {
  const timestamp = new Date().toISOString()
  const message = error?.message || String(error)
  const stack = error?.stack || ''

  const logEntry = {
    timestamp,
    level,
    context,
    message,
    stack
  }

  switch (level) {
    case ErrorLevel.WARN:
      console.warn(`[${context}]`, message)
      break
    case ErrorLevel.FATAL:
      console.error(`🔴 FATAL [${context}]`, message, '\n', stack)
      break
    default:
      console.error(`[${context}]`, message, '\n', stack)
  }

  // 将错误记录到 electron-store（便于调试）
  try {
    if (window.userInfoApi?.storeSetUserInfo) {
      const logs = JSON.parse(localStorage.getItem('_errorLogs') || '[]')
      logs.unshift(logEntry)
      // 最多保留 50 条
      if (logs.length > 50) logs.length = 50
      localStorage.setItem('_errorLogs', JSON.stringify(logs))
    }
  } catch {
    // 静默：日志系统自身不能抛异常
  }

  return logEntry
}

/**
 * 注册全局错误监听（在 main.js 中调用一次）
 */
export function setupGlobalErrorHandlers(app) {
  // Vue 组件内未捕获的异常
  app.config.errorHandler = (err, instance, info) => {
    handleError(`Vue:${info}`, err, ErrorLevel.ERROR)
  }

  // 全局未捕获的 JS 异常
  window.onerror = (message, source, lineno, colno, error) => {
    handleError('Window', error || new Error(message), ErrorLevel.FATAL)
  }

  // 未处理的 Promise rejection
  window.onunhandledrejection = (event) => {
    handleError('UnhandledPromise', event.reason, ErrorLevel.ERROR)
    // 阻止默认的控制台报错（可选）
    event.preventDefault()
  }
}

/**
 * 包装异步函数，自动捕获异常
 * 用法：const safeFn = safeAsync('上下文', async () => { ... })
 */
export function safeAsync(context, fn, fallback) {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      handleError(context, error)
      if (fallback !== undefined) return fallback
      throw error
    }
  }
}
