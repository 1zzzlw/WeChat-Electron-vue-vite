const PROFILE_KEYS = [
  'username',
  'avatar',
  'phone',
  'account',
  'email',
  'birthday',
  'gender',
  'address'
]

class AccountSession {
  constructor(store, encryption, accounts, platform = process.platform) {
    this.store = store
    this.encryption = encryption
    this.accounts = accounts
    this.platform = platform
    this.refreshToken = ''
    this.revision = 0
    this.authenticating = false
  }

  canRemember() {
    return (
      this.encryption.isEncryptionAvailable() &&
      !(this.platform === 'linux' && this.encryption.getSelectedStorageBackend() === 'basic_text')
    )
  }

  snapshot() {
    return {
      userId: String(this.store.get('userId') || ''),
      revision: this.revision,
      accessToken: this.store.get('accessToken') || ''
    }
  }

  isCurrent(snapshot) {
    const current = this.snapshot()
    return snapshot?.userId === current.userId && snapshot?.revision === current.revision
  }

  migrateLegacy() {
    const id = this.snapshot().userId
    const legacy = this.store.get('token')
    if (id) {
      const profile = {
        id,
        ...Object.fromEntries(PROFILE_KEYS.map((k) => [k, this.store.get(k)]))
      }
      if (!this.accounts.get(id)) this.accounts.recordLogin(profile, false)
      else this.accounts.cacheProfile(profile)
    }
    if (id && legacy) {
      this.refreshToken = legacy
      if (this.canRemember()) this.saveToken(id, legacy, true)
    }
    this.store.delete('token')
    this.store.delete('password')
  }

  saveToken(userId, token, remember) {
    const tokens = { ...this.store.get('accountTokens', {}) }
    if (remember && token) {
      if (!this.canRemember()) throw new Error('当前系统无法安全保存登录凭据，请取消记住登录状态')
      tokens[userId] = this.encryption.encryptString(token).toString('base64')
    } else delete tokens[userId]
    this.store.set('accountTokens', tokens)
    this.accounts.remember(userId, remember && Boolean(token))
  }

  getRefreshToken(userId = this.snapshot().userId) {
    if (!userId) return ''
    if (userId === this.snapshot().userId && this.refreshToken) return this.refreshToken
    const encrypted = this.store.get('accountTokens', {})[userId]
    if (!encrypted || !this.canRemember()) return ''
    try {
      return this.encryption.decryptString(Buffer.from(encrypted, 'base64'))
    } catch {
      this.saveToken(userId, '', false)
      return ''
    }
  }

  list() {
    const tokens = this.store.get('accountTokens', {})
    return this.accounts.list().map((row) => ({
      ...row,
      rememberLogin: Boolean(row.rememberLogin),
      canQuickLogin: Boolean(row.rememberLogin && tokens[row.userId] && this.canRemember())
    }))
  }

  activate(profile, accessToken, refreshToken, remember) {
    const id = String(profile.id || '')
    if (!id || !accessToken || !refreshToken) throw new Error('服务端未返回完整的登录信息')
    if (typeof profile.id === 'number' && !Number.isSafeInteger(profile.id))
      throw new Error('服务端用户 ID 精度不正确')
    if (remember && !this.canRemember()) throw new Error('当前系统无法安全保存登录凭据')
    this.accounts.recordLogin({ ...profile, id }, remember)
    this.saveToken(id, refreshToken, remember)
    this.store.set({
      userId: id,
      accessToken,
      ...Object.fromEntries(PROFILE_KEYS.map((k) => [k, profile[k] ?? null]))
    })
    this.store.delete('token')
    this.refreshToken = refreshToken
    this.revision++
    return this.snapshot()
  }

  updateTokens(snapshot, accessToken, refreshToken) {
    if (!this.isCurrent(snapshot) || !snapshot.userId) return false
    if (refreshToken) {
      this.saveToken(
        snapshot.userId,
        refreshToken,
        Boolean(this.accounts.get(snapshot.userId)?.remember_login)
      )
      this.refreshToken = refreshToken
    }
    if (accessToken) this.store.set('accessToken', accessToken)
    return true
  }

  clearCurrent(keepCredentials = false) {
    const id = this.snapshot().userId
    this.revision++
    this.refreshToken = ''
    this.authenticating = false
    if (id && !keepCredentials) this.saveToken(id, '', false)
    for (const key of ['token', 'accessToken', 'userId', ...PROFILE_KEYS]) this.store.delete(key)
  }

  remove(userId) {
    if (userId === this.snapshot().userId) this.clearCurrent()
    this.saveToken(userId, '', false)
    this.accounts.remove(userId)
  }

  async authenticate(operation, remember, expectedUserId) {
    if (this.authenticating) throw new Error('正在登录，请稍候')
    const revision = this.revision
    const ticket = Symbol('login')
    this.authenticating = ticket
    try {
      const result = await operation()
      if (revision !== this.revision) throw new Error('本次登录已取消')
      if (expectedUserId && String(result.profile.id) !== expectedUserId)
        throw new Error('登录账号与保存的凭据不匹配，请重新输入密码')
      const session = this.activate(
        result.profile,
        result.accessToken,
        result.refreshToken,
        remember
      )
      return { code: 1, data: result.profile, session }
    } finally {
      if (this.authenticating === ticket) this.authenticating = false
    }
  }
}

module.exports = { AccountSession }
