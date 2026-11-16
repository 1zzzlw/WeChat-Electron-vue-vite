const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { parse, compileTemplate } = require('vue/compiler-sfc')
const { ref, reactive, createSSRApp } = require('vue')

async function loginPage(accountApi, overrides = {}) {
  const { transformWithEsbuild } = await import('vite')
  const component = parse(fs.readFileSync(path.join(__dirname, '../src/renderer/src/views/login/Login.vue'), 'utf8')).descriptor
  const script = component.scriptSetup.content.replace(/^import[^\n]*\n/gm, '')
  const code = await transformWithEsbuild(script + '\nmodule.exports = { loginForm, recentAccounts, showRecentAccounts, isLoading, rememberLogin, canRemember, selectAccount, removeAccount, Login, ruleFormRef, rules, handleEnterLogin, refreshVerifyCode, verifyCodeImg, Register };', 'Login.ts', { loader: 'ts', format: 'cjs' })
  const mounted = []
  const notices = []
  const calls = []
  const module = { exports: {} }
  vm.runInNewContext(code.code, {
    module, exports: module.exports, ref, reactive,
    onMounted: handler => mounted.push(handler), onUnmounted() {},
    useRouter: () => ({}),
    ElMessage: { warning: m => notices.push(m), error: m => notices.push(m) },
    ElMessageBox: { confirm: async () => true },
    loginApi: data => accountApi.login(data),
    verifyCodeApi: async () => ({}), URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL() {} },
    window: { accountApi }, console: { error() {} },
    enterAccount: async () => calls.push('enter'), ...overrides
  })
  for (const handler of mounted) await handler()
  return { ...module.exports, notices, calls }
}

const record = { userId: '1001', account: 'first', username: 'First', avatar: '', rememberLogin: true, canQuickLogin: true }

test('实际组件渲染在空历史列表和有历史账号时都显示下拉入口', async () => {
  const { transformWithEsbuild } = await import('vite')
  const { renderToString } = require('vue/server-renderer')
  const component = parse(fs.readFileSync(path.join(__dirname, '../src/renderer/src/views/login/Login.vue'), 'utf8')).descriptor
  const template = compileTemplate({ source: component.template.content, filename: 'Login.vue', id: 'account-dropdown' })
  const compiled = await transformWithEsbuild(template.code, 'Login.js', { format: 'cjs' })
  const module = { exports: {} }
  vm.runInNewContext(compiled.code, { module, exports: module.exports, require })
  const icons = require('@element-plus/icons-vue')
  const elementPlus = require('element-plus')
  for (const accounts of [[], [record]]) {
    const page = await loginPage({ listAccounts: async () => accounts, capabilities: async () => ({ canRememberLogin: true }) })
    page.showRecentAccounts.value = true
    const app = createSSRApp({ setup: () => page, render: module.exports.render })
    app.use(elementPlus)
    app.provide(elementPlus.ID_INJECTION_KEY, { prefix: 100, current: 0 })
    app.provide(elementPlus.ZINDEX_INJECTION_KEY, { current: 0 })
    app.component('WindowControls', { render: () => null })
    for (const name of ['User', 'Lock', 'ArrowDown']) app.component(name, icons[name])
    const context = {}
    const html = await renderToString(app, context)
    assert.match(html, /aria-label="选择历史账号"/)
    assert.match(html, /class="recent-toggle[ "]/)
    const popup = Object.values(context.teleports || {}).join('')
    assert.ok(popup.includes(accounts.length ? record.account : '暂无历史账号'))
  }
})

test('没有保存凭据的历史账号只填入账号，不发起免密登录', async () => {
  let requests = 0
  const page = await loginPage({ listAccounts: async () => [record], capabilities: async () => ({ canRememberLogin: true }), quickLogin: async () => requests++ })
  page.loginForm.password = 'old-password'
  page.loginForm.verifyCode = 'old-code'
  await page.selectAccount({ ...record, canQuickLogin: false })
  assert.equal(page.loginForm.account, 'first')
  assert.equal(page.loginForm.password, '')
  assert.equal(page.loginForm.verifyCode, '')
  assert.equal(requests, 0)
})

test('有效历史账号验证成功后进入同一个数据初始化流程', async () => {
  const requests = []
  const page = await loginPage({ listAccounts: async () => [record], capabilities: async () => ({ canRememberLogin: true }), quickLogin: async id => { requests.push(id); return { code: 1 } } })
  await page.selectAccount(record)
  assert.deepEqual(requests, ['1001'])
  assert.deepEqual(page.calls, ['enter'])
  assert.equal(page.isLoading.value, false)
})

test('历史凭据失效保留账号输入并更新列表，不进入聊天', async () => {
  const page = await loginPage({ listAccounts: async () => [{ ...record, canQuickLogin: false }], capabilities: async () => ({ canRememberLogin: true }), quickLogin: async () => ({ code: 0, requiresPassword: true, msg: '请重新输入密码' }) })
  await page.selectAccount(record)
  assert.equal(page.loginForm.account, 'first')
  assert.equal(page.loginForm.password, '')
  assert.equal(page.recentAccounts.value[0].canQuickLogin, false)
  assert.deepEqual(page.notices, ['请重新输入密码'])
  assert.deepEqual(page.calls, [])
})

test('密码登录把记住选项交给主进程，成功后清除页面密码', async () => {
  let payload
  const page = await loginPage({ listAccounts: async () => [], capabilities: async () => ({ canRememberLogin: true }), login: async input => { payload = input; return { code: 1 } } })
  page.loginForm.account = 'first'
  page.loginForm.password = 'fixture-password'
  page.loginForm.verifyCode = 'fixture-code'
  page.rememberLogin.value = true
  await page.Login({ validate: async () => true })
  assert.equal(payload.rememberLogin, true)
  assert.equal(payload.account, 'first')
  assert.equal(page.loginForm.password, '')
  assert.deepEqual(page.calls, ['enter'])
})

test('移除历史账号仅提交目标 ID，并刷新可见列表', async () => {
  let removed
  const page = await loginPage({ listAccounts: async () => removed ? [] : [record], capabilities: async () => ({ canRememberLogin: true }), removeAccount: async id => { removed = id } })
  await page.removeAccount('1001')
  assert.equal(removed, '1001')
  assert.equal(page.recentAccounts.value.length, 0)
})

test('移除历史账号失败时提示错误并保留列表，取消操作不报错', async () => {
  const api = { listAccounts: async () => [record], capabilities: async () => ({ canRememberLogin: true }), removeAccount: async () => { throw new Error('unavailable') } }
  const page = await loginPage(api)
  await page.removeAccount('1001')
  assert.deepEqual(page.notices, ['移除账号失败，请稍后重试'])
  assert.equal(page.recentAccounts.value.length, 1)
  const cancelled = await loginPage(api, { ElMessageBox: { confirm: async () => { throw 'cancel' } } })
  await cancelled.removeAccount('1001')
  assert.deepEqual(cancelled.notices, [])
})
