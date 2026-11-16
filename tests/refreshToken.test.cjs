const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const axios = require('axios')

async function run() {
  const root = path.join(__dirname, '..')
  const refreshCode = fs.readFileSync(path.join(root, 'src/renderer/src/utils/axios/refreshToken.js'), 'utf8').replace(/export /g, '')
  const requestCode = fs.readFileSync(path.join(root, 'src/renderer/src/utils/axios/request.js'), 'utf8').replace(/^import[^\n]*\n/gm, '').replace('import.meta.env.DEV', 'true').replace('export default server', '')
  const results = []
  const check = async (name, scenario) => {
    try { await scenario(); results.push({ name, status: 'PASS' }) }
    catch (error) { results.push({ name, status: 'FAIL', error: error.stack }) }
  }
  function fixture(outcomes = ['success']) {
    let session = { userId: 'A', revision: 1, accessToken: 'old-access' }
    let refreshCalls = 0, ordinaryCalls = 0, expired = 0
    let resolveLate
    let rejectLate
    const local = { token: 'old-access' }
    const same = snapshot => snapshot.userId === session.userId && snapshot.revision === session.revision
    const accountApi = {
      getSession: async () => ({ ...session }),
      refreshSession: async snapshot => {
        refreshCalls++
        await new Promise(resolve => setTimeout(resolve, 5))
        const outcome = outcomes.shift() || 'success'
        if (outcome === 'network') throw new Error('network unavailable')
        if (!same(snapshot)) return false
        if (outcome === 'expired') return false
        session.accessToken = 'new-access'
        return true
      },
      updateTokens: async (snapshot, tokens) => {
        if (!same(snapshot)) return false
        if (tokens.accessToken) session.accessToken = tokens.accessToken
        return true
      },
      expireSession: async snapshot => {
        if (!same(snapshot)) return false
        expired++
        session = { userId: '', revision: session.revision + 1, accessToken: '' }
        return true
      }
    }
    const refresh = vm.runInNewContext(refreshCode + '\n({ refreshToken, isRefreshToken })', { window: { accountApi } })
    const makeResponse = (config, status = 200, headers = {}) => ({ config, status, headers, data: { code: 1 } })
    const adapter = async config => {
      if (config.url === '/late') return new Promise((resolve, reject) => { resolveLate = () => resolve(makeResponse(config, 200, { authorization: 'Bearer stale-access', refreshtoken: 'stale-refresh' })); rejectLate = () => reject(new axios.AxiosError('expired', 'ERR_BAD_REQUEST', config, {}, makeResponse(config, 401))) })
      ordinaryCalls++
      if (config.headers.Authorization === 'new-access') return makeResponse(config)
      throw new axios.AxiosError('expired', 'ERR_BAD_REQUEST', config, {}, makeResponse(config, 401))
    }
    const server = vm.runInNewContext(requestCode + '\nserver', {
      axios: { ...axios, create: options => axios.create({ ...options, adapter }) },
      getAccessToken: () => local.token, getBackendUrl: () => 'http://unused.test',
      ...refresh, window: { accountApi }, console: { log() {}, info() {}, error() {} },
      localStorage: { setItem: (key, value) => { local[key] = value }, removeItem: key => { delete local[key] } }
    })
    return { server, local, state: () => ({ ...session }), counts: () => ({ refreshCalls, ordinaryCalls, expired }),
      switchAccount: () => { session = { userId: 'B', revision: 2, accessToken: 'b-access' } },
      late: () => resolveLate(), lateError: () => rejectLate() }
  }
  await check('网络刷新失败保留登录，后续可恢复', async () => {
    const f = fixture(['network', 'success'])
    await assert.rejects(f.server.get('/protected'), /network/)
    assert.equal(f.state().userId, 'A')
    assert.equal((await f.server.get('/protected')).code, 1)
    assert.equal(f.counts().refreshCalls, 2)
  })
  await check('多个401共享一次刷新并分别重放', async () => {
    const f = fixture()
    await Promise.all([f.server.get('/protected'), f.server.get('/protected'), f.server.get('/protected')])
    assert.equal(f.counts().refreshCalls, 1)
    assert.equal(f.counts().ordinaryCalls, 6)
  })
  await check('无效长期凭据使当前会话退出', async () => {
    const f = fixture(['expired'])
    await assert.rejects(f.server.get('/protected'))
    assert.equal(f.state().userId, '')
    assert.equal(f.counts().expired, 1)
    assert.equal(f.local.token, undefined)
  })
  await check('切换账号后迟到的成功响应不能更新Token', async () => {
    const f = fixture()
    const pending = f.server.get('/late')
    const rejected = assert.rejects(pending, error => axios.isCancel(error))
    await new Promise(resolve => setTimeout(resolve, 1))
    f.switchAccount(); f.late()
    await rejected
    assert.equal(f.state().accessToken, 'b-access')
  })
  await check('切换账号后迟到的401不能刷新或退出新账号', async () => {
    const f = fixture()
    const pending = f.server.get('/late')
    const rejected = assert.rejects(pending, error => axios.isCancel(error))
    await new Promise(resolve => setTimeout(resolve, 1))
    f.switchAccount(); f.lateError()
    await rejected
    assert.equal(f.counts().refreshCalls, 0)
    assert.equal(f.counts().expired, 0)
    assert.equal(f.state().userId, 'B')
  })
  if (results.some(r => r.status === 'FAIL')) { const error = new Error('Token刷新回归失败'); error.results = results; throw error }
  return results
}
module.exports = { run }
if (require.main === module) run().then(r => console.log('Token刷新回归：' + r.length + '项通过')).catch(e => { console.error(e.results || e); process.exitCode = 1 })
