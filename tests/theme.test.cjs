const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

function harness(saved = 'light', savedStyle = 'ai-native') {
    const handlers = new Map()
    const events = new Map()
    const windows = [false, false, true].map(destroyed => ({
        destroyed, messages: [], background: null, isDestroyed() { return this.destroyed },
        setBackgroundColor(value) { this.background = value },
        webContents: { send(channel, value) { windows.find(window => window.webContents === this).messages.push({ channel, value }) } }
    }))
    const stored = { appearanceTheme: saved, appearanceStyle: savedStyle }
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
    const changeStyle = (value, route = '/account') => handlers.get('style:set')({
        sender: { getURL: () => 'file:///app/index.html#' + route }
    }, value)
    return { context, stored, windows, handlers, events, change, changeStyle }
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
        assert.equal(h.windows[0].background, '#14141c')
        assert.equal(h.windows[1].messages[0].value, 'dark')
        assert.equal(h.windows[2].messages.length, 0)
    })
    check('会话、联系人、收藏介绍页都能切换主题', () => {
        const h = harness()
        for (const route of ['/messageList', '/list', '/collectList']) assert.equal(h.change('dark', route), 'dark')
    })
    check('仅外观设置与认证入口允许切换，聊天和工作台拒绝 IPC', () => {
        const h = harness()
        for (const route of ['/login', '/register', '/pendingLogin', '/setting', '/chat?conversationId=1', '/aiWorkspace']) {
            assert.throws(() => h.change('dark', route), /外观设置/)
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
        assert.equal(newWindow.background, '#14141c')
        const reloaded = harness(h.stored.appearanceTheme)
        assert.equal(reloaded.handlers.get('theme:get')(), 'dark')
    })
    check('两种风格各自支持亮暗主题，风格切换保留主题', () => {
        const h = harness('dark')
        assert.equal(h.changeStyle('swiss'), 'swiss')
        assert.equal(h.stored.appearanceStyle, 'swiss')
        assert.equal(h.handlers.get('theme:get')(), 'dark')
        assert.equal(h.windows[0].background, '#141414')
        assert.equal(h.windows[0].messages[0].channel, 'style:changed')
        assert.equal(h.windows[2].messages.length, 0)
        h.change('light', '/account')
        assert.equal(h.windows[0].background, '#f5f5f3')
        h.changeStyle('ai-native')
        assert.equal(h.windows[0].background, '#f7f7fb')
    })
    check('重启恢复瑞士暗色，并拒绝第三种风格和非法来源', () => {
        const h = harness('dark', 'swiss')
        const event = {}
        h.events.get('style:initial')(event)
        assert.equal(event.returnValue, 'swiss')
        assert.throws(() => h.changeStyle('custom'), /无效/)
        assert.throws(() => h.changeStyle('ai-native', '/aiWorkspace'), /外观设置/)
        assert.equal(harness('light', 'obsolete').handlers.get('style:get')(), 'ai-native')
    })
    check('设置入口可更换外观，登录流程继承已保存外观', () => {
        const h = harness()
        for (const route of ['/account']) {
            assert.equal(h.change('dark', route), 'dark')
            assert.equal(h.changeStyle('swiss', route), 'swiss')
        }
    })
    check('四种外观的正文、辅助文字与按钮达到 4.5:1 对比度', () => {
        const css = fs.readFileSync(path.join(__dirname, '../public/theme.css'), 'utf8')
        const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        const luminance = hex => {
            const rgb = hex.slice(1).match(/../g).slice(0, 3).map(value => parseInt(value, 16) / 255)
                .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
            return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
        }
        const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05)
        for (const style of ['ai-native', 'swiss']) for (const mode of ['light', 'dark']) {
            const tokens = {}
            for (const [, selector, body] of rules) {
                if (!selector.includes(':root')) continue
                if (selector.includes("data-theme='dark'") && mode !== 'dark') continue
                if (selector.includes("data-ui-style='swiss'") && style !== 'swiss') continue
                for (const [, name, value] of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) tokens[name] = value.trim()
            }
            for (const foreground of ['text-primary', 'text-secondary', 'text-muted', 'accent']) {
                for (const background of ['app-bg', 'bg-deep', 'surface-1', 'surface-2', 'surface-3', 'accent-soft', 'input-surface']) {
                    assert.ok(contrast(tokens['--color-' + foreground], tokens['--color-' + background]) >= 4.5,
                        [style, mode, foreground, background].join('/'))
                }
            }
            assert.ok(contrast(tokens['--color-on-accent'], tokens['--color-accent']) >= 4.5)
        }
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
