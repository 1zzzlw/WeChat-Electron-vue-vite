const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { EventEmitter } = require('node:events')

// 跑真实 IPC 处理函数，替换操作系统窗口/磁盘边界。
function harness(options = {}) {
    const handlers = new Map()
    const events = new Map()
    const sent = []
    const writes = []
    const crops = []
    const clipboards = []
    const timers = new Map()
    let nextTimer = 0
    let count = 0
    let window
    const image = (width, height) => ({
        getSize: () => ({ width, height }), isEmpty: () => false,
        toPNG: () => Buffer.from('png'), toDataURL: () => 'data:image/png;base64,preview',
        resize: size => image(size.width, size.height),
        crop: rect => { crops.push(rect); return image(rect.width, rect.height) }
    })
    const source = {
        visible: true, shows: 0, destroyed: false,
        isDestroyed() { return this.destroyed }, isVisible() { return this.visible },
        hide() { this.visible = false }, show() { this.visible = true; this.shows++ }, focus() {},
        getBounds: () => ({ x: -1920, y: 0, width: 1100, height: 700 }),
        webContents: { send: (channel, result) => sent.push({ channel, result }) }
    }
    const display = { id: 2, bounds: { x: -1920, y: 0, width: 1920, height: 1080 }, scaleFactor: 2 }
    const scope = {
        Buffer, refs: { mainWindow: source },
        ipcMain: { handle: (name, fn) => handlers.set(name, fn), on: (name, fn) => events.set(name, fn) },
        BrowserWindow: { fromWebContents: () => source, getFocusedWindow: () => source },
        screen: { getDisplayMatching: () => display, getPrimaryDisplay: () => display },
        desktopCapturer: { getSources: async () => {
            if (options.capture) return options.capture()
            if (options.failCapture) throw new Error('screen unavailable')
            return [{ display_id: '1', thumbnail: image(800, 600) },
                { display_id: '2', thumbnail: image(7680, 4320) }]
        } },
        nativeImage: {}, clipboard: { writeImage: value => clipboards.push(value) },
        app: { getPath: () => '/pictures' },
        delay: async () => {},
        createExtraWindow: (type, windowOptions) => {
            count++
            window = new EventEmitter()
            window.options = windowOptions
            window.webContents = new EventEmitter()
            window.webContents.send = () => {}
            window.isDestroyed = () => window.destroyed
            window.destroy = () => { window.destroyed = true; window.emit('closed') }
            return window
        },
        setTimeout: callback => { const id = ++nextTimer; timers.set(id, callback); return id },
        clearTimeout: id => timers.delete(id),
        console: { error() {} },
        require: name => name === 'fs' ? {
            promises: {
                writeFile: async (...args) => {
                    writes.push(args)
                    if (options.write) await options.write()
                    if (options.failWrite) throw new Error('disk full')
                },
                unlink: async () => {}
            }
        } : require(name)
    }
    const code = fs.readFileSync(path.join(__dirname, '../src/main/IPC/chatToolIPC.js'), 'utf8')
        .replace(/^import .*\r?\n/gm, '').replace('export async function', 'async function')
    vm.runInNewContext(code + '\nthis.open = createCaptureWindow', scope)
    const save = rect => handlers.get('window:save-capture')({ sender: window.webContents }, { viewportWidth: 1920, viewportHeight: 1080, ...rect })
    return { scope, source, sent, writes, crops, clipboards, timers, events, handlers, save,
        get window() { return window }, get count() { return count },
        open: () => scope.open(source), cancel: () => events.get('window:close-capture')({ sender: window.webContents }) }
}

async function run() {
    const results = []
    const check = async (name, scenario) => {
        try { await scenario(); results.push({ name, status: 'PASS' }) }
        catch (error) { results.push({ name, status: 'FAIL', error: error.stack }) }
    }
    await check('快速连点和快捷键只创建一个窗口', async () => {
        const h = harness()
        const first = h.open()
        assert.equal((await h.open()).busy, true)
        await first
        assert.equal(h.count, 1)
        h.cancel()
        assert.equal(h.source.visible, true)
        assert.equal(h.sent.length, 1)
    })
    await check('选择来源窗口所在副屏，不依赖 sources[0]', async () => {
        const h = harness()
        await h.open()
        assert.equal(h.window.options.x, -1920)
        await h.save({ x: 0, y: 0, width: 1920, height: 1080 })
        assert.equal(h.crops[0].width, 7680)
        assert.equal(h.crops[0].height, 4320)
        assert.equal(h.writes.length, 1)
        assert.equal(h.clipboards.length, 1)
        assert.equal(h.sent[0].result.ok, true)
    })
    await check('实际图像比例不同于系统缩放值时仍正确裁剪', async () => {
        const h = harness()
        await h.open()
        await h.save({ x: 100, y: 50, width: 400, height: 200 })
        assert.equal(JSON.stringify(h.crops[0]), JSON.stringify({ x: 400, y: 200, width: 1600, height: 800 }))
    })
    await check('选区越界时裁到图像边缘', async () => {
        const h = harness()
        await h.open()
        await h.save({ x: 1900, y: 1000, width: 100, height: 200 })
        assert.equal(JSON.stringify(h.crops[0]), JSON.stringify({ x: 7600, y: 4000, width: 80, height: 320 }))
    })
    await check('空选区/无效数值不会写盘且能恢复主窗口', async () => {
        for (const rect of [{ x: 0, y: 0, width: 0, height: 1 }, { x: NaN, y: 0, width: 1, height: 1 }]) {
            const h = harness()
            await h.open()
            await h.save(rect)
            assert.equal(h.writes.length, 0)
            assert.equal(h.source.visible, true)
            assert.ok(h.sent[0].result.error)
        }
    })
    await check('保存中重复确认只保存一份', async () => {
        let release
        const wait = new Promise(resolve => { release = resolve })
        const h = harness({ write: () => wait })
        await h.open()
        const first = h.save({ x: 0, y: 0, width: 100, height: 100 })
        const second = await h.save({ x: 0, y: 0, width: 100, height: 100 })
        assert.equal(second.ok, false)
        release()
        await first
        assert.equal(h.writes.length, 1)
        assert.equal(h.sent.length, 1)
    })
    await check('磁盘失败后窗口恢复并允许重新截图', async () => {
        const h = harness({ failWrite: true })
        await h.open()
        await h.save({ x: 0, y: 0, width: 100, height: 100 })
        assert.equal(h.source.visible, true)
        assert.ok(h.sent[0].result.error)
        assert.equal((await h.open()).ok, true)
        h.cancel()
    })
    await check('抓屏异常后不遗留会话锁和隐藏窗口', async () => {
        const h = harness({ failCapture: true })
        assert.equal((await h.open()).ok, false)
        assert.equal(h.source.visible, true)
        assert.equal((await h.open()).busy, undefined)
    })
    await check('窗口异常退出只恢复一次且下次可以打开', async () => {
        const h = harness()
        await h.open()
        h.window.webContents.emit('render-process-gone')
        assert.equal(h.source.shows, 1)
        assert.equal(h.sent.length, 1)
        assert.equal((await h.open()).ok, true)
        h.cancel()
    })
    await check('准备超时后忽略迟到的抓屏结果', async () => {
        let release
        let started
        const startedPromise = new Promise(resolve => { started = resolve })
        const sources = new Promise(resolve => { release = resolve })
        const h = harness({ capture: () => { started(); return sources } })
        const pending = h.open()
        await startedPromise
        for (const callback of [...h.timers.values()]) callback()
        release([])
        await pending
        assert.equal(h.count, 0)
        assert.equal(h.source.visible, true)
    })
    await check('旧截图保存期间取消，新会话不被旧任务关闭', async () => {
        let release
        const wait = new Promise(resolve => { release = resolve })
        const h = harness({ write: () => wait })
        await h.open()
        const pending = h.save({ x: 0, y: 0, width: 100, height: 100 })
        h.cancel()
        await h.open()
        const secondWindow = h.window
        release()
        await pending
        assert.equal(secondWindow.isDestroyed(), undefined)
        assert.equal(h.clipboards.length, 0)
        h.cancel()
    })
    await check('非截图窗口不能提交或关闭会话', async () => {
        const h = harness()
        await h.open()
        h.events.get('window:close-capture')({ sender: {} })
        assert.equal((await h.handlers.get('window:save-capture')({ sender: {} }, {})).ok, false)
        assert.equal(h.source.visible, false)
        h.cancel()
    })
    if (results.some(result => result.status === 'FAIL')) {
        const error = new Error('截图回归失败'); error.results = results; throw error
    }
    return results
}

module.exports = { run }
if (require.main === module) {
    run().then(results => console.log('截图回归：' + results.length + '项通过'))
        .catch(error => { console.error(error.results || error); process.exitCode = 1 })
}
