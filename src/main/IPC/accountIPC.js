import { ipcMain, BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'
import axios from 'axios'
import { accountSession } from '../auth/session.js'
import { logout } from '../Util/logout.js'
import { getBackendUrl } from '../../shared/backend.js'

const auth = axios.create({ baseURL: getBackendUrl(is.dev), timeout: 30000 })
let refreshing = null

async function requestLogin(path, data, token) {
  const response = await auth.post(path, data, token ? { headers: { Authorization: token } } : {})
  if (response.data?.code !== 1) throw new Error(response.data?.msg || '登录失败，请重试')
  return {
    profile: response.data.data,
    accessToken: (response.headers.authorization || '').replace(/^Bearer\s+/i, ''),
    refreshToken: response.headers.refreshtoken || ''
  }
}

const failure = (error) => ({
  code: 0,
  msg:
    error.response?.data?.msg ||
    (error.response
      ? '登录凭据已失效，请重新输入密码'
      : error.code
        ? '连接服务失败，请稍后重试'
        : error.message)
})

ipcMain.handle('account:list', () => accountSession.list())
ipcMain.handle('account:capabilities', () => ({ canRememberLogin: accountSession.canRemember() }))
ipcMain.handle('account:session', () => accountSession.snapshot())
ipcMain.handle('account:activate', (_event, snapshot, profile, tokens) => {
  if (!accountSession.isCurrent(snapshot)) throw new Error('本次登录已取消')
  return accountSession.activate(profile, tokens?.accessToken, tokens?.refreshToken, false)
})

ipcMain.handle('account:login', async (_event, input) => {
  try {
    const body = {
      account: String(input?.account || '').trim(),
      password: String(input?.password || ''),
      verifyCode: String(input?.verifyCode || '').trim()
    }
    if (!body.account || !body.password || !body.verifyCode)
      throw new Error('请填写账号、密码和验证码')
    const remember = input?.rememberLogin === true
    if (remember && !accountSession.canRemember()) throw new Error('当前系统无法安全保存登录凭据')
    return await accountSession.authenticate(() => requestLogin('/user/login', body), remember)
  } catch (error) {
    return failure(error)
  }
})

ipcMain.handle('account:quick-login', async (_event, value) => {
  const userId = String(value || '')
  try {
    const token = accountSession.getRefreshToken(userId)
    if (!token) return { code: 0, requiresPassword: true, msg: '请重新输入密码登录' }
    return await accountSession.authenticate(
      () => requestLogin('/user/pendingLogin', { userId }, token),
      true,
      userId
    )
  } catch (error) {
    if ([400, 401, 403].includes(error.response?.status)) {
      accountSession.saveToken(userId, '', false)
      return { ...failure(error), requiresPassword: true }
    }
    return failure(error)
  }
})

ipcMain.handle('account:refresh', async (_event, snapshot) => {
  if (!accountSession.isCurrent(snapshot) || !snapshot.userId) return false
  const key = `${snapshot.userId}:${snapshot.revision}`
  if (refreshing?.key === key) return refreshing.promise
  const promise = (async () => {
    const token = accountSession.getRefreshToken()
    if (!token) return false
    try {
      const response = await auth.post(
        `/user/refreshToken/${snapshot.userId}`,
        {},
        { headers: { Authorization: token } }
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
})

ipcMain.handle('account:update-tokens', (_event, snapshot, tokens) =>
  accountSession.updateTokens(snapshot, tokens?.accessToken, tokens?.refreshToken)
)
ipcMain.handle('account:expire', async (_event, snapshot) => {
  if (!accountSession.isCurrent(snapshot)) return false
  await logout()
  return true
})
ipcMain.handle('account:switch', () => logout({ keepCredentials: true }))
ipcMain.handle('account:remove', (event, value) => {
  // 删除历史记录只开放给主登录窗口，不能让其他资料/媒体子窗口移除账号。
  const window = BrowserWindow.fromWebContents(event.sender)
  if (
    !window ||
    !/\/(login|pendingLogin)(?:\?|$)/.test(window.webContents.getURL().split('#')[1] || '')
  )
    throw new Error('请在登录界面移除历史账号')
  accountSession.remove(String(value || ''))
  return true
})
