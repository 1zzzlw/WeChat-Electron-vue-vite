// 手动运行：electron tests/desktopPages.electron.cjs
// 离屏渲染独立 HTML，使用合成图，不读写用户聊天和截图。
const { app, BrowserWindow, ipcMain, nativeImage, desktopCapturer, nativeTheme } = require('electron')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')

const root = path.join(__dirname, '..')
const errors = []
const results = []
const windows = []
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const timeout = setTimeout(() => { console.error('Electron 页面验证超时'); app.exit(1) }, 30000)

function windowFor(width, height) {
    const win = new BrowserWindow({
        width, height, useContentSize: true, show: false, frame: false, enableLargerThanScreen: true,
        webPreferences: {
            preload: path.join(__dirname, 'fixtures/desktopPreload.cjs'),
            offscreen: true, backgroundThrottling: false, contextIsolation: true,
            partition: 'easychat-desktop-fixture', webSecurity: false
        }
    })
    windows.push(win)
    win.webContents.on('console-message', event => {
        if (event.level === 'error') errors.push(event.message)
    })
    return win
}

app.whenReady().then(async () => {
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'easychat-desktop-'))
    const saveWindow = async (window, file) => {
        // 路由 DOM 就绪后再等两帧，避免离屏截图拿到上一页的合成帧。
        await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        await delay(50)
        await fs.writeFile(path.join(output, file), (await window.webContents.capturePage()).toPNG())
    }
    let themeMode = 'light'
    ipcMain.on('fixture:theme:initial', event => { event.returnValue = themeMode })
    ipcMain.handle('fixture:theme:get', () => themeMode)
    ipcMain.handle('fixture:theme:set', (_event, value) => {
        themeMode = value
        nativeTheme.themeSource = value
        for (const window of windows) window.webContents.send('fixture:theme:changed', value)
        return value
    })
    let saves = 0
    let savedRect
    ipcMain.handle('fixture:save', async (_event, rect) => {
        saves++
        savedRect = rect
        await delay(50)
        return { ok: true }
    })
    const win = windowFor(1920, 1080)
    await win.loadFile(path.join(root, 'public/capture.html'))
    const mouse = (type, x, y) => win.webContents.sendInputEvent({ type, x, y, button: 'left', clickCount: 1 })
    mouse('mouseDown', 10, 10)
    mouse('mouseUp', 900, 600)
    await delay(30)
    assert.equal(await win.webContents.executeJavaScript("document.querySelector('.selection').hidden"), true)
    results.push('预览未解码前的快速操作安全忽略')

    const ready = new Promise(resolve => ipcMain.once('fixture:ready', resolve))
    // 原始 8K 图用于 NativeImage 裁剪，传给页面的预览限制为 1920。
    const original = nativeImage.createFromBitmap(Buffer.alloc(7680 * 4320 * 4, 255), { width: 7680, height: 4320 })
    const preview = original.resize({ width: 1920, height: 1080 })
    win.webContents.send('fixture:capture', { pngBuffer: preview.toPNG(), imageSize: original.getSize() })
    await ready
    const viewport = await win.webContents.executeJavaScript('({ width: innerWidth, height: innerHeight })')
    mouse('mouseDown', viewport.width - 10, viewport.height - 20)
    // 无 mousemove 的极速反向拖动也要以 mouseup 的最终坐标为准。
    mouse('mouseUp', 10, 20)
    await delay(50)
    const rect = await win.webContents.executeJavaScript(`(() => {
        const el = document.querySelector('.selection')
        const tool = document.querySelector('.tool').getBoundingClientRect()
        return { width: el.style.width, height: el.style.height, hidden: el.hidden,
            toolInside: tool.left >= 0 && tool.top >= 0 && tool.right <= innerWidth && tool.bottom <= innerHeight }
    })()`)
    assert.equal(rect.width, (viewport.width - 20) + 'px')
    assert.equal(rect.height, (viewport.height - 40) + 'px')
    assert.equal(rect.hidden, false)
    assert.equal(rect.toolInside, true)
    results.push('极速反向大选区正确，工具条保持在屏幕内')
    await saveWindow(win, 'capture.png')
    await win.webContents.executeJavaScript("document.querySelector('.confirm-btn').click(); document.querySelector('.confirm-btn').click()")
    await delay(80)
    assert.equal(saves, 1)
    assert.equal(savedRect.width, viewport.width - 20)
    const cropWidth = Math.floor(savedRect.width * 7680 / viewport.width)
    const cropHeight = Math.floor(savedRect.height * 4320 / viewport.height)
    const cropped = original.crop({ x: Math.floor(savedRect.x * 7680 / viewport.width),
        y: Math.floor(savedRect.y * 4320 / viewport.height), width: cropWidth, height: cropHeight })
    assert.equal(cropped.getSize().width, cropWidth)
    assert.equal(cropped.getSize().height, cropHeight)
    results.push('重复确认只提交一次，8K 原图裁剪保持分辨率')

    const loading = windowFor(640, 520)
    await loading.loadFile(path.join(root, 'public/loading.html'))
    await delay(150)
    assert.equal(await loading.webContents.executeJavaScript("document.querySelector('.continue').hidden"), true)
    await saveWindow(loading, 'loading.png')
    loading.webContents.send('fixture:loaded', { ok: true })
    await delay(40)
    assert.equal(await loading.webContents.executeJavaScript("document.querySelector('h1').textContent"), '一切就绪，开始对话')
    assert.notEqual(await loading.webContents.executeJavaScript('frame'), 0)
    await delay(7600)
    assert.equal(await loading.webContents.executeJavaScript('frame'), 0)
    let continues = 0
    ipcMain.on('fixture:continue', () => continues++)
    await loading.webContents.executeJavaScript("document.querySelector('.continue').click(); document.querySelector('.continue').click()")
    await delay(40)
    assert.equal(continues, 1)
    results.push('数据提前完成仍完整播放 7.5 秒 IM 动画，随后停止且只进入一次')
    await saveWindow(loading, 'loading-complete.png')
    loading.webContents.send('fixture:loaded', { ok: false })
    await delay(30)
    assert.equal(await loading.webContents.executeJavaScript("document.querySelector('h1').textContent"), '暂时未能完成同步')
    results.push('加载失败状态不冒充成功')
    assert.deepEqual(errors, [])

    // 构建产物中的主题路径和主要 Vue 页面一并离线验证。
    await loading.webContents.session.protocol.handle('http', request => {
        if (/verify/i.test(request.url)) return new Response(preview.toPNG(), { headers: { 'Content-Type': 'image/png' } })
        let response = { code: 1, data: [] }
        if (/ai-message/.test(request.url)) response = []
        if (/wallet\/info/.test(request.url)) response = { code: 1, data: { balance: 1280.5, freezeBalance: 20 } }
        if (/wallet\/records/.test(request.url)) response = { code: 1, data: { total: 2, data: [
            { id: 'fixture-wallet-1', type: 1, typeDesc: '钱包充值', remark: '测试账单', amount: 100, afterBalance: 1280.5, createTime: '2026-10-26T10:30:00' },
            { id: 'fixture-wallet-2', type: 5, typeDesc: '发出红包', remark: '测试账单', amount: -20, afterBalance: 1180.5, createTime: '2026-10-26T09:00:00' }
        ] } }
        return new Response(JSON.stringify(response), { headers: { 'Content-Type': 'application/json' } })
    })
    const workbench = windowFor(1100, 700)
    await workbench.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/aiWorkspace' })
    for (let index = 0; index < 60; index++) {
        if (await workbench.webContents.executeJavaScript("!!document.querySelector('.agent-workbench')")) break
        await delay(50)
    }
    const theme = await workbench.webContents.executeJavaScript(`(() => {
        const sidebar = document.querySelector('.agent-sidebar')
        return { found: !!sidebar, accent: getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim(),
            blur: sidebar && getComputedStyle(sidebar).backdropFilter }
    })()`)
    assert.equal(theme.found, true, JSON.stringify({ errors, url: workbench.webContents.getURL(),
        body: await workbench.webContents.executeJavaScript('document.body.innerText.slice(0, 1200)') }))
    assert.equal(theme.accent, '#287eb5')
    assert.equal(theme.blur, 'blur(20px)')
    await delay(300)
    await saveWindow(workbench, 'workbench.png')
    await workbench.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/messageList' })
    for (let index = 0; index < 60; index++) {
        if (await workbench.webContents.executeJavaScript("!!document.querySelector('.chat-welcome')")) break
        await delay(50)
    }
    assert.equal(await workbench.webContents.executeJavaScript("!!document.querySelector('.chat-welcome')"), true)
    assert.equal(await workbench.webContents.executeJavaScript("getComputedStyle(document.querySelector('.chat-welcome')).webkitAppRegion"), 'drag')
    assert.equal(await workbench.webContents.executeJavaScript("document.querySelectorAll('.chat-welcome a').length"), 0)
    await saveWindow(workbench, 'welcome.png')
    await workbench.webContents.executeJavaScript("document.querySelectorAll('.theme-options button')[1].click()")
    await delay(150)
    assert.equal(await workbench.webContents.executeJavaScript('document.documentElement.dataset.theme'), 'dark')
    assert.equal(await loading.webContents.executeJavaScript('document.documentElement.dataset.theme'), 'dark')
    assert.equal(nativeTheme.themeSource, 'dark')
    await saveWindow(workbench, 'welcome-dark.png')
    for (const route of ['list', 'collectList']) {
        await workbench.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/' + route })
        for (let index = 0; index < 60; index++) {
            if (await workbench.webContents.executeJavaScript("!!document.querySelector('.chat-welcome')")) break
            await delay(50)
        }
        assert.equal(await workbench.webContents.executeJavaScript("!!document.querySelector('.chat-welcome')"), true)
        assert.equal(await workbench.webContents.executeJavaScript('document.documentElement.dataset.theme'), 'dark')
        await saveWindow(workbench, route + '-dark.png')
    }
    await workbench.webContents.executeJavaScript("document.querySelectorAll('.theme-options button')[0].click()")
    await delay(100)
    await workbench.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/messageList' })
    for (let index = 0; index < 60; index++) {
        if (await workbench.webContents.executeJavaScript("!!document.querySelector('.message-list-bottom .left-list')")) break
        await delay(50)
    }
    await workbench.webContents.executeJavaScript("document.querySelector('.message-list-bottom .left-list').click()")
    for (let index = 0; index < 60; index++) {
        if (await workbench.webContents.executeJavaScript("!!document.querySelector('.chat-count')")) break
        await delay(50)
    }
    assert.equal(await workbench.webContents.executeJavaScript("!!document.querySelector('.chat-count') && !document.querySelector('.chat-welcome')"), true)
    await delay(150)
    await saveWindow(workbench, 'chat.png')
    results.push('会话、联系人、收藏复用可拖拽介绍页，已移除跳转按钮，主题同步所有窗口并在页面重载后保留')
    const searchFocus = await workbench.webContents.executeJavaScript(`(() => {
        const input = document.querySelector('.message-list-top input')
        input.focus()
        return { shadow: getComputedStyle(input.closest('.el-input__wrapper')).boxShadow,
            outline: getComputedStyle(input).outlineStyle }
    })()`)
    assert.equal(searchFocus.shadow, 'none')
    assert.equal(searchFocus.outline, 'none')
    results.push('主界面搜索框聚焦也无蓝色边框或光圈')
    await workbench.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/wallet' })
    for (let index = 0; index < 60; index++) {
        if (await workbench.webContents.executeJavaScript("document.querySelectorAll('.bill-item').length === 2")) break
        await delay(50)
    }
    assert.equal(await workbench.webContents.executeJavaScript("document.querySelectorAll('.bill-item').length"), 2)
    await saveWindow(workbench, 'wallet.png')
    await workbench.webContents.executeJavaScript("document.querySelector('.qa-item').click()")
    await delay(100)
    assert.equal(await workbench.webContents.executeJavaScript("!!document.querySelector('.dlg-input')"), true)
    await saveWindow(workbench, 'wallet-dialog.png')
    await workbench.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/collectList' })
    for (let index = 0; index < 60; index++) {
        if (await workbench.webContents.executeJavaScript("!!document.querySelector('.theme-options')")) break
        await delay(50)
    }
    await workbench.webContents.executeJavaScript("document.querySelectorAll('.theme-options button')[1].click()")
    await delay(100)
    await workbench.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/wallet' })
    for (let index = 0; index < 60; index++) {
        if (await workbench.webContents.executeJavaScript("document.querySelectorAll('.bill-item').length === 2")) break
        await delay(50)
    }
    await saveWindow(workbench, 'wallet-dark.png')
    results.push('钱包亮暗主题、余额卡片、账单列表和充值弹窗完成实际渲染验证，未提交交易')
    const borders = []
    for (const [route, height] of [['login', 370], ['register', 490]]) {
        const account = windowFor(300, height)
        await account.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/' + route })
        for (let index = 0; index < 60; index++) {
            if (await account.webContents.executeJavaScript('!!document.querySelector(".' + route + '-count")')) break
            await delay(50)
        }
        await delay(200)
        const focusStyle = await account.webContents.executeJavaScript(`(() => {
            const input = document.querySelector('input[type="password"]') || document.querySelector('input')
            input.focus()
            const wrapper = input.closest('.el-input__wrapper')
            return { inputShadow: getComputedStyle(input).boxShadow, inputOutline: getComputedStyle(input).outlineStyle,
                wrapperShadow: getComputedStyle(wrapper).boxShadow }
        })()`)
        assert.equal(focusStyle.inputShadow, 'none')
        assert.equal(focusStyle.inputOutline, 'none')
        assert.equal(focusStyle.wrapperShadow, 'none')
        borders.push(await account.webContents.executeJavaScript('getComputedStyle(document.querySelector(".' + route + '-count"), "::before").backgroundImage'))
        await saveWindow(account, route + '.png')
    }
    assert.notEqual(borders[0], borders[1])
    assert.ok(borders.every(value => value.includes('conic-gradient')))
    assert.deepEqual(errors.filter(message => /TypeError|ReferenceError/.test(message)), [])
    results.push('构建产物加载天空主题，AI 工作台保留玻璃模糊，登录/注册分别保留青蓝与粉紫动画')
    results.push('登录、注册输入框聚焦后均无蓝色边框、光圈')

    // 仅检查系统抓屏 API 能返回图像，不保存桌面内容。
    try {
        const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 320, height: 180 } })
        results.push('系统抓屏 API：' + sources.filter(item => !item.thumbnail.isEmpty()).length + ' 个可用屏幕')
    } catch (error) {
        results.push('系统抓屏 API 未验证：' + error.message)
    }
    console.log(JSON.stringify({ results, output }, null, 2))
    clearTimeout(timeout)
    windows.forEach(window => window.destroy())
    app.exit(0)
}).catch(error => {
    console.error(error)
    console.error('渲染页错误:', errors)
    clearTimeout(timeout)
    windows.forEach(window => { if (!window.isDestroyed()) window.destroy() })
    app.exit(1)
})
