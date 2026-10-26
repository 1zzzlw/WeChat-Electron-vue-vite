const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

function harness(saved = 'light') {
    const handlers = new Map()
    const events = new Map()
    const windows = [false, false, true].map(destroyed => ({
        destroyed, messages: [], background: null, isDestroyed() { return this.destroyed },
        setBackgroundColor(value) { this.background = value },
        webContents: { send(channel, value) { windows.find(window => window.webContents === this).messages.push({ channel, value }) } }
    }))
    const stored = { appearanceTheme: saved }
    const context = {
        store: { get: key => stored[key], set: (key, value) => { stored[key] = value } },
        nativeTheme: { themeSource: 'system' },
        BrowserWindow: { getAllWindows: () => windows },
        ipcMain: { on: (name, callback) => events.set(name, callback), handle: (name, callback) => handlers.set(name, callback) }
    }
    const source = fs.readFileSync(path.join(__dirname, '../src/main/Util/theme.js'), 'utf8')
        .replace(/^import .*\r?\n/gm, '').replaceAll('export function', 'function')
    vm.runInNewContext(source, context)
    const change = (value, route = '/messageList') => handlers.get('theme:set')({
        sender: { getURL: () => 'file:///app/index.html#' + route }
    }, value)
    return { context, stored, windows, handlers, events, change }
}

async function run() {
    const results = []
    const check = (name, scenario) => {
        try { scenario(); results.push({ name, status: 'PASS' }) }
        catch (error) { results.push({ name, status: 'FAIL', error: error.stack }) }
    }
    check('启动时恢复存储的暗色主题，并同步 Electron 原生主题', () => {
        const h = harness('dark')
        h.context.initializeTheme()
        assert.equal(h.context.nativeTheme.themeSource, 'dark')
        const event = {}
        h.events.get('theme:initial')(event)
        assert.equal(event.returnValue, 'dark')
    })
    check('切换后持久化并广播所有存活窗口，跳过已销毁窗口', () => {
        const h = harness()
        h.change('dark')
        assert.equal(h.stored.appearanceTheme, 'dark')
        assert.equal(h.context.nativeTheme.themeSource, 'dark')
        assert.equal(h.windows[0].background, '#162d40')
        assert.equal(h.windows[1].messages[0].value, 'dark')
        assert.equal(h.windows[2].messages.length, 0)
    })
    check('会话、联系人、收藏介绍页都能切换主题', () => {
        const h = harness()
        for (const route of ['/messageList', '/list', '/collectList']) assert.equal(h.change('dark', route), 'dark')
    })
    check('登录、设置、聊天和 AI 工作台不能通过 IPC 切换主题', () => {
        const h = harness()
        for (const route of ['/login', '/setting', '/chat?conversationId=1', '/aiWorkspace']) {
            assert.throws(() => h.change('dark', route), /介绍界面/)
        }
        assert.equal(h.stored.appearanceTheme, 'light')
    })
    check('拒绝无效主题，存储中的旧值也有明确默认值', () => {
        const h = harness('obsolete')
        assert.equal(h.handlers.get('theme:get')(), 'light')
        assert.throws(() => h.change('system'), /无效/)
    })
    check('切换后新窗口直接继承当前背景和首屏主题', () => {
        const h = harness()
        h.change('dark')
        const newWindow = { setBackgroundColor(value) { this.background = value } }
        h.context.applyWindowTheme(newWindow)
        assert.equal(newWindow.background, '#162d40')
        const reloaded = harness(h.stored.appearanceTheme)
        assert.equal(reloaded.handlers.get('theme:get')(), 'dark')
    })
    if (results.some(result => result.status === 'FAIL')) {
        const error = new Error('主题回归失败'); error.results = results; throw error
    }
    return results
}

module.exports = { run }
if (require.main === module) {
    run().then(results => console.log('主题回归：' + results.length + '项通过'))
        .catch(error => { console.error(error.results || error); process.exitCode = 1 })
}
