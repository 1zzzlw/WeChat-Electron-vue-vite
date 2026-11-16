const { test } = require('node:test')
const assert = require('node:assert/strict')
const Database = require('better-sqlite3')
const { AccountSession } = require('../src/main/auth/accountSession.cjs')
const { DEVICE_USER_TABLE_SQL, migrateDeviceUserRecords, createAccountRepository } = require('../src/main/DB/accountRecords.cjs')

function fixture(initial = {}) {
  const db = new Database(':memory:')
  db.exec(DEVICE_USER_TABLE_SQL)
  const values = { ...initial }
  const store = {
    get: (key, fallback) => values[key] ?? fallback,
    set: (key, value) => typeof key === 'object' ? Object.assign(values, key) : values[key] = value,
    delete: key => { delete values[key] }
  }
  const encryption = {
    isEncryptionAvailable: () => true,
    encryptString: text => Buffer.from('protected:' + text),
    decryptString: blob => {
      if (!blob.toString().startsWith('protected:')) throw new Error('bad cipher')
      return blob.toString().slice(10)
    }
  }
  const accounts = createAccountRepository(db)
  const session = new AccountSession(store, encryption, accounts, 'win32')
  const login = (id, remember = true) => session.activate({ id, account: 'account-' + id, username: 'name-' + id, avatar: 'avatar-' + id }, 'access-' + id, 'refresh-' + id, remember)
  return { db, values, store, encryption, accounts, session, login }
}

test('旧 INTEGER 表迁移保留精确大整数、原登录时间及初始化状态，重复迁移安全', () => {
  const db = new Database(':memory:')
  db.exec(`CREATE TABLE device_user_record (user_id INTEGER PRIMARY KEY,first_login_time TEXT,last_login_time TEXT,device_tag TEXT,app_version TEXT);
    INSERT INTO device_user_record VALUES (1792113130553811123,'2026-01-01','2026-02-01','desktop','1.0');`)
  migrateDeviceUserRecords(db)
  migrateDeviceUserRecords(db)
  const row = db.prepare('SELECT * FROM device_user_record').get()
  assert.equal(row.user_id, '1792113130553811123')
  assert.equal(row.first_login_time, '2026-01-01')
  assert.equal(row.data_initialized, 1)
  assert.equal(row.remember_login, 0)
  db.close()
})

test('登录历史与初始化分开，昵称更新不刷新登录时间、不保存密码', () => {
  const f = fixture()
  f.login('1001')
  assert.equal(f.accounts.get('1001').data_initialized, 0)
  f.db.prepare("UPDATE device_user_record SET first_login_time='2025-01-01',last_login_time='2025-02-01' WHERE user_id='1001'").run()
  f.accounts.cacheProfile({ id: '1001', account: 'new-account', username: 'new-name' })
  assert.equal(f.accounts.get('1001').last_login_time, '2025-02-01')
  f.accounts.markInitialized('1001')
  f.login('1001')
  assert.equal(f.accounts.get('1001').first_login_time, '2025-01-01')
  assert.equal(f.accounts.get('1001').data_initialized, 1)
  assert.equal(f.accounts.list().length, 1)
  assert.equal(f.values.token, undefined)
  assert.equal(f.values.password, undefined)
  f.db.close()
})

test('两账号凭据独立加密，刷新旧会话被拒绝，切换保留凭据而退出只清除当前账号', () => {
  const f = fixture()
  const a = f.login('1001')
  f.session.clearCurrent(true)
  const b = f.login('1002')
  assert.equal(f.session.getRefreshToken('1001'), 'refresh-1001')
  assert.equal(f.session.getRefreshToken(), 'refresh-1002')
  assert.notEqual(f.values.accountTokens['1001'], 'refresh-1001')
  assert.equal(f.session.updateTokens(a, 'stale-access', 'stale-refresh'), false)
  assert.equal(f.session.updateTokens(b, 'new-access', 'new-refresh'), true)
  assert.equal(f.session.getRefreshToken(), 'new-refresh')
  assert.equal(f.session.list().some(a => Object.keys(a).some(k => /token|password/i.test(k))), false)
  f.session.clearCurrent()
  assert.equal(f.session.getRefreshToken('1002'), '')
  assert.equal(f.session.getRefreshToken('1001'), 'refresh-1001')
  assert.equal(f.session.list().length, 2)
  f.session.remove('1001')
  assert.equal(f.accounts.get('1001'), undefined)
  assert.equal(f.session.getRefreshToken('1001'), '')
  f.db.close()
})

test('不记住登录时只在内存保留长期 Token，重启后需要密码', () => {
  const f = fixture()
  f.login('1001', false)
  assert.equal(f.session.getRefreshToken(), 'refresh-1001')
  assert.deepEqual(f.values.accountTokens, {})
  const restarted = new AccountSession(f.store, f.encryption, f.accounts, 'win32')
  assert.equal(restarted.getRefreshToken(), '')
  assert.equal(restarted.list()[0].canQuickLogin, false)
  f.db.close()
})

test('旧单账号 Token 迁移为密文，旧明文键清理，解密失败只撤销对应账号', () => {
  const f = fixture({ userId: '1001', token: 'legacy-refresh', account: 'legacy', username: 'legacy-name', password: 'old-password' })
  f.accounts.recordLogin({ id: '1001', account: 'legacy' }, false)
  f.session.migrateLegacy()
  assert.equal(f.values.token, undefined)
  assert.equal(f.values.password, undefined)
  assert.equal(f.session.getRefreshToken('1001'), 'legacy-refresh')
  const restarted = new AccountSession(f.store, f.encryption, f.accounts, 'win32')
  assert.equal(restarted.getRefreshToken(), 'legacy-refresh')
  f.values.accountTokens['1001'] = Buffer.from('corrupt').toString('base64')
  assert.equal(restarted.getRefreshToken(), '')
  assert.equal(f.accounts.get('1001').remember_login, 0)
  f.db.close()
})

test('安全存储不可用不降级保存凭据，普通密码登录仍可使用', () => {
  const f = fixture()
  f.encryption.isEncryptionAvailable = () => false
  assert.throws(() => f.login('1001'), /安全/)
  f.login('1001', false)
  assert.equal(f.session.getRefreshToken(), 'refresh-1001')
  f.db.close()
})

test('旧账号未完成数据初始化时也能迁移为历史账号，保留未初始化状态', () => {
  const f = fixture({ userId: '1001', token: 'legacy-refresh', account: 'legacy' })
  f.session.migrateLegacy()
  assert.equal(f.session.list()[0].account, 'legacy')
  assert.equal(f.session.list()[0].canQuickLogin, true)
  assert.equal(f.accounts.get('1001').data_initialized, 0)
  assert.equal(f.session.getRefreshToken(), 'legacy-refresh')
  f.db.close()
})

test('并发登录只执行一次；切换后迟到的登录不能重新激活旧账号', async () => {
  const f = fixture()
  let resolve
  const operation = new Promise(done => { resolve = done })
  const pending = f.session.authenticate(() => operation, true)
  await assert.rejects(f.session.authenticate(() => operation, true), /正在登录/)
  f.session.clearCurrent(true)
  f.login('1002')
  resolve({ profile: { id: '1001' }, accessToken: 'old-access', refreshToken: 'old-refresh' })
  await assert.rejects(pending, /取消/)
  assert.equal(f.session.snapshot().userId, '1002')
  assert.equal(f.accounts.get('1001'), undefined)
  f.db.close()
})

test('快捷登录返回其他账号时拒绝激活', async () => {
  const f = fixture()
  await assert.rejects(f.session.authenticate(async () => ({ profile: { id: '1002' }, accessToken: 'a', refreshToken: 'r' }), true, '1001'), /不匹配/)
  assert.equal(f.session.snapshot().userId, '')
  f.db.close()
})
