/** 缓存有效期：5分钟 */
export const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * 检查 localStorage 持久化缓存是否有效
 * 有效返回 true，过期返回 false 并自动更新版本号/时间戳
 */
export function checkCache(
  state: { _cacheVersion: string; _cacheTimestamp: number },
  userId: string,
  ttl: number = CACHE_TTL_MS
): boolean {
  const currentCacheVersion = `${userId}_${Date.now()}`
  const elapsed = Date.now() - state._cacheTimestamp
  if (!state._cacheVersion.startsWith(userId) || elapsed > ttl) {
    state._cacheVersion = currentCacheVersion
    state._cacheTimestamp = Date.now()
    return false
  }
  return true
}
