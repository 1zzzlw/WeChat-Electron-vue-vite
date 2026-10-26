const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const axios = require('axios')

async function run() {
    const root = path.join(__dirname, '..')
    const refreshSource = fs.readFileSync(path.join(root, 'src/renderer/src/utils/axios/refreshToken.js'), 'utf8')
        .replace(/^import[^\n]*\n/gm, '').replace(/export /g, '')
    const requestSource = fs.readFileSync(path.join(root, 'src/renderer/src/utils/axios/request.js'), 'utf8')
        .replace(/^import[^\n]*\n/gm, '').replace('import.meta.env.DEV', 'true').replace('export default server', '')
    const results = []
    const check = async (name, plan, scenario) => {
        const values = { accessToken: 'old-access', token: 'valid-refresh', userId: 'A' }
        const localValues = { token: 'old-access' }
        const location = { href: '#/chat' }
        let refreshCalls = 0
        let ordinaryCalls = 0
        let server
        const quiet = { log() {}, info() {}, error() {} }
        const api = vm.runInNewContext(refreshSource + '\n({ refreshToken, isRefreshToken });', {
            console: quiet,
            request: { post: (...args) => server.post(...args) },
            getRefreshToken: async () => {
                if (plan.ipcFailure) { plan.ipcFailure = false; throw new Error('模拟IPC读取失败') }
                return values.token
            }
        })
        const response = (config, status, data, headers = {}) => ({
            config, status, data, headers, statusText: String(status)
        })
        const adapter = async config => {
            if (config.url.startsWith('/user/refreshToken/')) {
                refreshCalls++
                assert.equal(config.__isRefreshToken, true)
                assert.equal(config.headers.Authorization, 'valid-refresh')
                const outcome = plan.responses.shift() || 'success'
                if (outcome === 'network') throw new axios.AxiosError('模拟断网', 'ERR_NETWORK', config)
                if (['400', '401', '500'].includes(outcome)) {
                    throw new axios.AxiosError('模拟HTTP异常', 'ERR_BAD_RESPONSE', config, {}, response(config, Number(outcome), {}))
                }
                return response(config, 200, { code: outcome === 'businessFailure' ? 0 : 1 },
                    outcome === 'businessFailure' ? {} : {
                        authorization: 'Bearer new-access', refreshtoken: 'new-refresh'
                    })
            }
            ordinaryCalls++
            if (config.headers.Authorization === 'new-access') return response(config, 200, { code: 1 })
            throw new axios.AxiosError('短期Token失效', 'ERR_BAD_REQUEST', config, {}, response(config, 401, {}))
        }
        server = vm.runInNewContext(requestSource + '\nserver;', {
            axios: { create: options => axios.create({ ...options, adapter }) },
            getAccessToken: () => localValues.token,
            refreshToken: (...args) => api.refreshToken(...args),
            isRefreshToken: api.isRefreshToken, console: quiet,
            window: {
                location,
                userInfoApi: {
                    storeGetUserInfo: async key => values[key],
                    storeSetUserInfo: async (key, value) => { values[key] = value }
                }
            },
            localStorage: {
                getItem: key => localValues[key],
                setItem: (key, value) => { localValues[key] = value }
            }
        })
        try {
            await scenario({ server, values, location, counts: () => ({ refreshCalls, ordinaryCalls }) })
            results.push({ name, status: 'PASS' })
        } catch (error) {
            results.push({ name, status: 'FAIL', error: error.stack })
        }
    }
    await check('网络失败后结束原请求，恢复网络后重新刷新成功',
        { responses: ['network', 'success'] }, async ({ server, values, location, counts }) => {
            await assert.rejects(server.get('/protected'), error => error.code === 'ERR_NETWORK')
            assert.equal(values.token, 'valid-refresh')
            assert.equal(location.href, '#/chat')
            assert.equal((await server.get('/protected')).code, 1)
            assert.equal(counts().refreshCalls, 2)
        })
    await check('多个401共享一次刷新并重放各自请求',
        { responses: ['success'] }, async ({ server, counts }) => {
            await Promise.all([server.get('/protected'), server.get('/protected'), server.get('/protected')])
            assert.equal(counts().refreshCalls, 1)
            assert.equal(counts().ordinaryCalls, 6)
        })
    await check('并发刷新失败时全部结束，后续可重新刷新',
        { responses: ['network', 'success'] }, async ({ server, counts }) => {
            const outcomes = await Promise.allSettled([
                server.get('/protected'), server.get('/protected'), server.get('/protected')
            ])
            assert.equal(outcomes.filter(item => item.status === 'rejected').length, 3)
            assert.equal(counts().refreshCalls, 1)
            assert.equal((await server.get('/protected')).code, 1)
            assert.equal(counts().refreshCalls, 2)
        })
    for (const status of ['400', '401']) {
        await check('刷新HTTP' + status + '清理登录状态且不递归刷新',
            { responses: [status] }, async ({ server, values, location, counts }) => {
                await assert.rejects(server.get('/protected'))
                assert.equal(values.token, '')
                assert.equal(values.accessToken, '')
                assert.equal(location.href, '#/login')
                assert.equal(counts().refreshCalls, 1)
            })
    }
    await check('刷新HTTP500保留登录状态，后续刷新可恢复',
        { responses: ['500', 'success'] }, async ({ server, location, counts }) => {
            await assert.rejects(server.get('/protected'), error => error.response?.status === 500)
            assert.equal(location.href, '#/chat')
            assert.equal((await server.get('/protected')).code, 1)
            assert.equal(counts().refreshCalls, 2)
        })
    await check('业务失败正常返回并进入原有登录流程',
        { responses: ['businessFailure'] }, async ({ server, location }) => {
            await assert.rejects(server.get('/protected'))
            assert.equal(location.href, '#/login')
        })
    await check('读取本地Token异常后仍可再次刷新',
        { responses: ['success'], ipcFailure: true }, async ({ server, counts }) => {
            await assert.rejects(server.get('/protected'), /模拟IPC读取失败/)
            assert.equal((await server.get('/protected')).code, 1)
            assert.equal(counts().refreshCalls, 1)
        })
    const failures = results.filter(result => result.status === 'FAIL')
    if (failures.length) { const error = new Error('Token刷新回归失败'); error.results = results; throw error }
    return results
}

module.exports = { run }
if (require.main === module) {
    run().then(results => console.log('Token刷新回归：' + results.length + '项通过'))
        .catch(error => { console.error(error.results || error); process.exitCode = 1 })
}
