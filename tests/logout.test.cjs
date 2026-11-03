const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

test('退出登录结束旧页面、清除凭证并保留历史和外观配置，重复点击只执行一次', async () => {
    const events = []
    const saved = { token: 'old-refresh', accessToken: 'old-access', userId: 'old-user', username: 'old-name', appearanceStyle: 'swiss', appearanceTheme: 'dark', modelApiKeys: { 'old-user': 'encrypted' }, storeLocation: 'history' }
    let localToken = 'old-short-token'
    const child = { isDestroyed: () => false, destroy: () => events.push('destroy-child') }
    const main = { isDestroyed: () => false, hide() {}, show() {}, focus() {}, setMinimumSize() {}, isMaximized: () => true,
        unmaximize() {}, setResizable() {}, setSize: (width, height) => events.push(['size', width, height]), center() {},
        webContents: { executeJavaScript: async () => { localToken = null } },
        loadURL: async url => { events.push(url); saved.token = 'late-refresh-from-old-page' },
        loadFile: async (_file, options) => events.push(options.hash) }
    const source = fs.readFileSync(path.join(__dirname, '../src/main/Util/logout.js'), 'utf8')
        .replace(/^import .*\r?\n/gm, '').replace('export async function', 'async function')
        .replace("import('../File/fileUpload.js')", 'Promise.resolve({ cancelAllUploads: cancelUploadsMock })')
    const context = { refs: { mainWindow: main }, store: { delete: key => { delete saved[key] } },
        BrowserWindow: { getAllWindows: () => [main, child] }, websocket: { disconnect: () => events.push('disconnect') },
        finishLoadingWindow: () => events.push('finish-loading'), cancelUploadsMock: () => events.push('cancel-uploads'),
        is: { dev: false }, process: { env: {} }, join: path.join, __dirname }
    const logout = vm.runInNewContext(source + '\nlogout', context)
    await Promise.all([logout(), logout()])
    assert.equal(saved.token, undefined)
    assert.equal(saved.accessToken, undefined)
    assert.equal(saved.userId, undefined)
    assert.equal(saved.username, undefined)
    assert.equal(localToken, null)
    assert.equal(saved.appearanceStyle, 'swiss')
    assert.equal(saved.appearanceTheme, 'dark')
    assert.equal(saved.storeLocation, 'history')
    assert.ok(saved.modelApiKeys['old-user'])
    assert.equal(events.filter(event => event === 'destroy-child').length, 1)
    assert.equal(events.filter(event => event === 'cancel-uploads').length, 1)
    assert.ok(events.indexOf('about:blank') < events.indexOf('/login'))
    assert.ok(events.indexOf('disconnect') < events.indexOf('about:blank'))
    assert.deepEqual(events.find(event => Array.isArray(event)), ['size', 400, 580])
})
