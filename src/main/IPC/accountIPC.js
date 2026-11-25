import { ipcMain, BrowserWindow } from 'electron'
import { accountSession, getDeviceId, requestLogin, refreshSession } from '../auth/session.js'
import { logout } from '../Util/logout.js'


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
ipcMain.handle('account:capabilities', () => ({ canRememberLogin: accountSession.canRemember(), deviceId: getDeviceId() }))
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

ipcMain.handle('account:refresh', (_event, snapshot) => refreshSession(snapshot))

ipcMain.handle('account:update-tokens', (_event, snapshot, tokens) =>
  accountSession.updateTokens(snapshot, tokens?.accessToken, tokens?.refreshToken)
)
ipcMain.handle('account:expire', async (_event, snapshot) => {
  if (!accountSession.isCurrent(snapshot)) return false
  await logout({ revoke: false })
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
