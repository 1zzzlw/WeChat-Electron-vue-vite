let pending = null

export function refreshToken(snapshot) {
  const key = snapshot.userId + ':' + snapshot.revision
  if (pending?.key === key) return pending.promise
  const promise = window.accountApi.refreshSession(snapshot).finally(() => {
    if (pending?.key === key) pending = null
  })
  pending = { key, promise }
  return promise
}

export function isRefreshToken(config) {
  return !!config?.__isRefreshToken
}
