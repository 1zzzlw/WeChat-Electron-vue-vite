import { randomUUID } from 'node:crypto'
import { safeStorage } from 'electron'
import { is } from '@electron-toolkit/utils'
import axios from 'axios'
import { store } from '../shared.js'
import { accounts } from '../DB/mainDB.js'
import { getBackendUrl } from '../../shared/backend.js'
import accountSessionModule from './accountSession.cjs'

export const accountSession = new accountSessionModule.AccountSession(store, safeStorage, accounts)
const auth = axios.create({ baseURL: getBackendUrl(is.dev), timeout: 30000 })
let refreshing = null
let revoking = false

export function getDeviceId() {
  let id = store.get('deviceId')
  if (!id) {
    id = 'desktop_' + randomUUID()
    store.set('deviceId', id)
  }
  return id
}

export async function requestLogin(path, data, token) {
  const headers = { 'X-Device-Id': getDeviceId() }
  if (token) headers.Authorization = token
  const response = await auth.post(path, data, { headers })
  if (response.data?.code !== 1) throw new Error(response.data?.msg || '登录失败，请重试')
  return {
    profile: response.data.data,
    accessToken: (response.headers.authorization || '').replace(/^Bearer\s+/i, ''),
    refreshToken: response.headers.refreshtoken || ''
  }
}

export async function refreshSession(snapshot) {
  if (revoking || !accountSession.isCurrent(snapshot) || !snapshot.userId) return false
  const key = `${snapshot.userId}:${snapshot.revision}`
  if (refreshing?.key === key) return refreshing.promise
  const promise = (async () => {
    const token = accountSession.getRefreshToken()
    if (!token) return false
    try {
      const response = await auth.post(
        `/user/refreshToken/${snapshot.userId}`,
        {},
        { headers: { Authorization: token, 'X-Device-Id': getDeviceId() } }
      )
      if (response.data?.code !== 1) return false
      return accountSession.updateTokens(
        snapshot,
        (response.headers.authorization || '').replace(/^Bearer\s+/i, ''),
        response.headers.refreshtoken
      )
    } catch (error) {
      if ([400, 401, 403].includes(error.response?.status)) return false
      throw new Error('暂时无法刷新登录状态，请稍后重试')
    }
  })().finally(() => {
    if (refreshing?.key === key) refreshing = null
  })
  refreshing = { key, promise }
  return promise
}

export async function revokeSession(snapshot) {
  revoking = true
  try {
    const key = `${snapshot.userId}:${snapshot.revision}`
    if (refreshing?.key === key) await refreshing.promise.catch(() => {})
    if (!accountSession.isCurrent(snapshot)) return
    const token = accountSession.getRefreshToken()
    if (!token) return
    await auth.post('/user/logout', {}, { headers: { Authorization: token }, timeout: 4000 })
  } finally {
    revoking = false
  }
}
