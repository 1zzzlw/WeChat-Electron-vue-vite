const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { loadHandoff } = require('./fixtures/loadingHandoff.cjs')

function harness(options = {}) {
    const handlers = new Map()
    const events = new Map()
    const order = []
    let loading
    let paintReady
    const paint = new Promise(resolve => { paintReady = resolve })
    const main = {
        destroyed: false, visible: true, shows: 0,
        isDestroyed() { return this.destroyed }, hide() { this.visible = false },
        show() { this.visible = true; this.shows++; order.push('show-main') },
        setSize(width, height) { order.push(['resize', width, height]) },
        setMinimumSize() {}, setResizable() {}, center() {},
        webContents: {
            send: channel => order.push(channel),
            capturePage: async (_rect, settings) => {
                assert.equal(settings.stayHidden, true)
                order.push('paint-start')
                if (options.failPaint) throw new Error('capture failed')
                await paint
                order.push('paint-ready')
            }
        }
    }
    loadHandoff({
        ipcMain: { on: (name, handler) => events.set(name, handler), handle: (name, handler) => handlers.set(name, handler) },
        refs: { mainWindow: main }, store: { get: () => 'fixture-user' },
        isExistUserRecord: () => !!options.hasRecord,
        createExtraWindow: () => {
            loading = new EventEmitter()
            loading.webContents = new EventEmitter()
            loading.isDestroyed = () => !!loading.destroyed
            loading.destroy = () => {
                loading.destroyed = true
                order.push('destroy-loading')
                loading.emit('closed')
            }
            return loading
        },
        multipleInsert() {}, initAndUpdateUserLoginRecord() {},
        initConversationList: async () => ({ data: [] }), initFriendList: async () => ({ data: [] }),
        initMessageList: async () => ({ data: [] }),
        websocket: { connect: () => order.push('connect') },
        windowPool: new Map(), app: {}, globalShortcut: { register() {} }, createCaptureWindow() {},
        console: { log() {}, info() {}, warn() {} }
    })
    return {
        main, order, paintReady,
        get loading() { return loading },
        start: () => handlers.get('loading-isNeedInit')({}),
        continue: sender => events.get('close-loading-window')({ sender: sender || loading.webContents }),
        enter: () => events.get('window:type')({}, 'main')
    }
}

async function run() {
    const results = []
    const check = async (name, scenario) => {
        try { await scenario(); results.push({ name, status: 'PASS' }) }
        catch (error) { results.push({ name, status: 'FAIL', error: error.stack }) }
    }
    await check('点击进入时保留加载页，不能提前显示登录窗口', async () => {
        const h = harness()
        h.start(); h.continue()
        assert.equal(h.main.visible, false)
        assert.equal(h.main.shows, 0)
        assert.equal(h.loading.isDestroyed(), false)
        assert.ok(h.order.includes('data-init-complete'))
    })
    await check('按主界面尺寸完成绘制后才能显示，随后关闭加载页', async () => {
        const h = harness()
        h.start(); h.continue()
        const pending = h.enter()
        assert.equal(h.main.visible, false)
        assert.equal(h.loading.isDestroyed(), false)
        assert.deepEqual(h.order.find(item => Array.isArray(item)), ['resize', 1100, 700])
        h.paintReady(); await pending
        assert.ok(h.order.indexOf('paint-ready') < h.order.indexOf('show-main'))
        assert.ok(h.order.indexOf('show-main') < h.order.indexOf('destroy-loading'))
        assert.equal(h.main.shows, 1, 'closed 回调不应重复恢复旧窗口')
    })
    await check('正常交接后不会因 closed 回调再次显示', async () => {
        const h = harness()
        h.start(); h.continue(); h.paintReady(); await h.enter()
        h.loading.emit('closed')
        assert.equal(h.main.shows, 1)
    })
    await check('加载页意外退出仍恢复原窗口，保留原有错误恢复', async () => {
        const h = harness()
        h.start(); h.loading.destroy()
        assert.equal(h.main.visible, true)
        assert.equal(h.main.shows, 1)
    })
    await check('其他窗口不能发起加载完成交接', async () => {
        const h = harness()
        h.start(); h.continue({})
        assert.equal(h.order.includes('data-init-complete'), false)
        assert.equal(h.main.visible, false)
    })
    await check('已有账号无需加载页时仍可进入主界面', async () => {
        const h = harness({ hasRecord: true })
        assert.equal(h.start(), false)
        h.paintReady(); await h.enter()
        assert.equal(h.main.shows, 1)
    })
    await check('绘制确认失败不使加载页永久卡住', async () => {
        const h = harness({ failPaint: true })
        h.start(); h.continue(); await h.enter()
        assert.equal(h.main.visible, true)
        assert.equal(h.loading.isDestroyed(), true)
        assert.equal(h.main.shows, 1)
    })
    if (results.some(result => result.status === 'FAIL')) {
        const error = new Error('加载窗口交接回归失败'); error.results = results; throw error
    }
    return results
}

module.exports = { run }
if (require.main === module) {
    run().then(results => console.log('加载窗口交接回归：' + results.length + '项通过'))
        .catch(error => { console.error(error.results || error); process.exitCode = 1 })
}
