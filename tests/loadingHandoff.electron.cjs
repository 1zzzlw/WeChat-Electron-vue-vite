// 真实 Vue 登录/路由与隐藏窗口合成，接口和数据库使用隔离假数据。
const { app, BrowserWindow, ipcMain } = require('electron')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { loadHandoff } = require('./fixtures/loadingHandoff.cjs')

const root = path.join(__dirname, '..')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const windows = []
const errors = []
let loading
let main
let completed
const order = []
const timeout = setTimeout(() => { console.error('主界面交接验证超时'); app.exit(1) }, 25000)

async function waitFor(window, expression) {
    for (let attempt = 0; attempt < 100; attempt++) {
        if (await window.webContents.executeJavaScript(expression)) return
        await delay(30)
    }
    throw new Error('等待页面状态失败：' + expression)
}

function createWindow(options) {
    const window = new BrowserWindow({ show: false, frame: false, ...options,
        webPreferences: { preload: path.join(root, 'out/preload/index.js'), contextIsolation: true,
            sandbox: false, offscreen: true, backgroundThrottling: true, webSecurity: false,
            partition: 'loading-handoff-test' }
    })
    windows.push(window)
    window.webContents.on('console-message', event => {
        if (/Uncaught|FATAL|Unable to load preload/.test(event.message)) errors.push(event.message)
    })
    return window
}

app.whenReady().then(async () => {
    const data = new Map([['wallpaperPath', pathToFileURL(path.join(root, 'public/wallpaper/1.jpg')).href]])
    ipcMain.on('theme:initial', event => { event.returnValue = 'light' })
    ipcMain.handle('theme:get', () => 'light')
    ipcMain.handle('window:getUserInfo', (_event, key) => data.get(key))
    ipcMain.handle('window:setUserInfo', (_event, key, value) => data.set(key, value))
    ipcMain.handle('query:conversation', () => [])
    ipcMain.handle('query:friend', () => [])
    main = createWindow({ width: 300, height: 370 })
    let visible = true
    let frame = null
    main.show = () => {
        order.push({ event: 'show-main', mainFrame: !!frame, green: frame?.toBitmap()[5 * 4 + 1] })
        visible = true
    }
    const hide = main.hide.bind(main)
    main.hide = () => { visible = false; hide(); order.push({ event: 'hide-main' }) }
    main.isVisible = () => visible
    const capture = main.webContents.capturePage.bind(main.webContents)
    main.webContents.capturePage = async (...args) => {
        assert.equal(visible, false, '完成绘制前主窗口必须保持隐藏')
        frame = await capture(...args)
        assert.equal(frame.isEmpty(), false)
        order.push({ event: 'paint-main', green: frame.toBitmap()[5 * 4 + 1] })
        return frame
    }
    loadHandoff({
        ipcMain, app, refs: { mainWindow: main }, store: { get: key => data.get(key) },
        isExistUserRecord: () => false,
        createExtraWindow: (_type, options) => {
            loading = createWindow(options)
            loading.show = () => order.push({ event: 'show-loading' })
            loading.once('ready-to-show', () => loading.show())
            loading.once('closed', () => {
                order.push({ event: 'closed-loading' })
                completed()
            })
            loading.loadFile(path.join(root, 'out/renderer/loading.html'))
            return loading
        },
        multipleInsert() {}, initAndUpdateUserLoginRecord() {},
        initConversationList: async () => ({ data: [] }), initFriendList: async () => ({ data: [] }),
        initMessageList: async () => ({ data: [] }),
        websocket: { connect() {} }, windowPool: new Map(),
        globalShortcut: { register() {} }, createCaptureWindow() {}
    })
    await main.webContents.session.protocol.handle('http', request => {
        if (/verify/i.test(request.url)) return new Response(Buffer.alloc(0), { headers: { 'Content-Type': 'image/png' } })
        const response = /\/login/.test(request.url)
            ? { code: 1, data: { id: 'handoff-user', username: '测试用户', account: 'fixture', avatar: pathToFileURL(path.join(root, 'resources/icon.png')).href } }
            : { code: 1, data: [] }
        return new Response(JSON.stringify(response), { headers: { 'Content-Type': 'application/json',
            refreshtoken: 'fixture-token', authorization: 'Bearer fixture-access' } })
    })
    await main.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/login' })
    await waitFor(main, "!!document.querySelector('.login-form-button button')")
    await main.webContents.executeJavaScript('(' + function () {
        // 第一帧登录页为红色标记，主界面 DOM 挂载后改为绿色，用于检测陈旧合成帧。
        const probe = document.createElement('div')
        probe.style.cssText = 'position:fixed;left:0;top:0;width:20px;height:20px;z-index:2147483647;background:rgb(200,0,0);pointer-events:none'
        document.body.append(probe)
        new MutationObserver(() => {
            if (document.querySelector('.main-count')) probe.style.background = 'rgb(0,200,0)'
        }).observe(document.querySelector('#app'), { childList: true, subtree: true })
        const inputs = document.querySelectorAll('.login-form input')
        for (const [index, value] of ['fixture', 'fixture-password', '1234'].entries()) {
            inputs[index].value = value
            inputs[index].dispatchEvent(new Event('input', { bubbles: true }))
        }
    }.toString() + ')()')
    const finished = new Promise(resolve => { completed = resolve })
    await main.webContents.executeJavaScript("document.querySelector('.login-form-button button').click()")
    for (let attempt = 0; attempt < 100 && !loading; attempt++) await delay(30)
    assert.ok(loading, '登录成功后应出现加载窗口')
    await waitFor(loading, "!document.querySelector('.continue').hidden")
    assert.equal(visible, false)
    await loading.webContents.executeJavaScript("document.querySelector('.continue').click()")
    await finished
    const show = order.filter(item => item.event === 'show-main')
    assert.equal(show.length, 1, JSON.stringify(order))
    assert.equal(show[0].mainFrame, true, JSON.stringify(order))
    assert.equal(show[0].green, 200, '显示前必须已合成主界面标记，不能是旧登录帧')
    assert.ok(order.findIndex(item => item.event === 'paint-main') < order.findIndex(item => item.event === 'show-main'))
    assert.ok(order.findIndex(item => item.event === 'show-main') < order.findIndex(item => item.event === 'closed-loading'))
    assert.equal(await main.webContents.executeJavaScript("!!document.querySelector('.main-count') && !document.querySelector('.login-count')"), true)
    assert.deepEqual(errors, [])
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'easychat-handoff-'))
    await fs.writeFile(path.join(output, 'first-main-frame.png'), frame.toPNG())
    console.log(JSON.stringify({ result: '真实登录、加载、路由挂载、隐藏合成、显示与关闭顺序通过；首次显示帧不是登录帧', order, output }, null, 2))
    clearTimeout(timeout)
    windows.forEach(window => { if (!window.isDestroyed()) window.destroy() })
    app.exit(0)
}).catch(error => {
    console.error(error)
    console.error({ errors, order })
    clearTimeout(timeout)
    windows.forEach(window => { if (!window.isDestroyed()) window.destroy() })
    app.exit(1)
})
