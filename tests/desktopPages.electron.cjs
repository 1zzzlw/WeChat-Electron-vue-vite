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
const timeout = setTimeout(() => { console.error('Electron 页面验证超时'); app.exit(1) }, 60000)

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
        if (await window.webContents.executeJavaScript("!!document.querySelector('.el-dialog, .local-search-popper')")) await delay(320)
        await delay(50)
        await fs.writeFile(path.join(output, file), (await window.webContents.capturePage()).toPNG())
    }
    let styleMode = 'ai-native'
    ipcMain.on('fixture:style:initial', event => { event.returnValue = styleMode })
    ipcMain.handle('fixture:style:get', () => styleMode)
    ipcMain.handle('fixture:style:set', (_event, value) => {
        styleMode = value
        for (const window of windows) window.webContents.send('fixture:style:changed', value)
        return value
    })
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
    assert.equal(await loading.webContents.executeJavaScript("document.querySelector('.continue').hidden"), false)
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
        if (/moments\/user/.test(request.url)) response = { code: 1, data: { total: 0, data: [] } }
        if (/user\/me/.test(request.url)) response = { code: 1, data: { id: 'fixture-user', account: 'fixture', email: '', birthday: '', avatar: '', phone: '13800000000' } }
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
    assert.equal(theme.accent, '#6840b5')
    assert.equal(theme.blur, 'none')
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
        return { outline: getComputedStyle(input.closest('.el-input__wrapper')).outlineStyle,
            inputOutline: getComputedStyle(input).outlineStyle }
    })()`)
    assert.equal(searchFocus.outline, 'none')
    assert.equal(searchFocus.inputOutline, 'none')
    results.push('主界面搜索框聚焦后保持单层边界')
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
    const backgrounds = []
    for (const [route, height] of [['login', 580], ['register', 640]]) {
        const account = windowFor(400, height)
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
                wrapperOutline: getComputedStyle(wrapper).outlineStyle }
        })()`)
        assert.equal(focusStyle.inputShadow, 'none')
        assert.equal(focusStyle.inputOutline, 'none')
        assert.equal(focusStyle.wrapperOutline, 'none')
        backgrounds.push(await account.webContents.executeJavaScript('getComputedStyle(document.querySelector(".' + route + '-count"), "::before").backgroundImage'))
        await saveWindow(account, route + '.png')
    }
    assert.deepEqual(backgrounds, ['none', 'none'])
    assert.deepEqual(errors.filter(message => /TypeError|ReferenceError/.test(message)), [])
    results.push('构建产物使用新主题，登录与注册无照片背景或旋转边框')
    results.push('登录、注册输入框聚焦后保持单层边界')

    // 四种组合实际渲染：字体、单层输入框、登录入口与默认布局。
    const waitFor = async (window, expression) => {
        for (let attempt = 0; attempt < 100; attempt++) {
            if (await window.webContents.executeJavaScript(expression)) return
            await delay(30)
        }
        throw new Error('页面状态未就绪：' + expression + ' URL=' + window.webContents.getURL() + ' BODY=' + await window.webContents.executeJavaScript('document.body.innerText.slice(0, 1600)'))
    }
    const videoFile = path.join(output, 'preview-sample.webm')
    await require('node:util').promisify(require('node:child_process').execFile)(require('ffmpeg-static'),
        ['-y', '-f', 'lavfi', '-i', 'color=c=0x65558f:s=320x180:r=5', '-t', '1', '-c:v', 'libvpx', '-b:v', '80k', videoFile], { windowsHide: true })
    const sampleImage = 'data:image/png;base64,' + preview.toPNG().toString('base64')
    const selectedFiles = [
        { fileId: 'preview-image', fileName: '设计草图.png', fileType: 2, fileSize: 2097152, previewUrl: sampleImage, localPath: sampleImage, content: '[图片]' },
        { fileId: 'preview-video', fileName: '产品演示.webm', fileType: 3, fileSize: 4194304, previewUrl: sampleImage, localPath: videoFile, content: '[视频]' },
        { fileId: 'preview-document', fileName: '项目需求说明与界面设计验收清单-最终版本.pdf', fileType: 5, fileSize: 15360, localPath: '', content: '[文件]' }
    ]
    let fileCursor = 0
    ipcMain.handle('fixture:select-file', () => selectedFiles[fileCursor++])
    const groupWindow = windowFor(820, 620)
    const searchContact = { friendId: 'fixture-friend', username: '晴空', remark: '设计伙伴', account: 'qingkong01', avatar: sampleImage, relationStatus: 1 }
    const searchConversations = [
        { id: 'fixture-chat', userId: 'fixture-user', targetId: 'fixture-friend', name: '设计讨论', type: 0, status: 1, avatar: sampleImage },
        { id: 'fixture-group', userId: 'fixture-user', targetId: 'fixture-group', name: '项目设计群', type: 1, status: 1, avatar: sampleImage }
    ]
    ipcMain.handle('fixture:search-local', async (_event, request) => {
        if (request.query === 'slow') { await delay(400); return { contacts: [{ ...searchContact, username: '过期结果', remark: '' }], conversations: [], messages: [] } }
        if (request.query === 'fast') return { contacts: [{ ...searchContact, username: '最新结果', remark: '' }], conversations: [], messages: [] }
        const keyword = request.query.trim().toLowerCase()
        const matches = value => String(value || '').toLowerCase().includes(keyword)
        const contacts = [searchContact].filter(item => [item.username, item.remark, item.account].some(matches))
        return { contacts, conversations: request.scope === 'contacts' ? [] : searchConversations.filter(item => matches(item.name)),
            messages: request.scope === 'contacts' || !matches('这是一条本地设计消息') ? [] : [{ id: 'history-020', conversationId: 'fixture-chat', content: '这是一条本地设计消息', sendTime: '2026-11-03T10:00:00', msgType: 1, conversationName: '设计讨论', conversationAvatar: sampleImage, conversationType: 0 }] }
    })
    const fillInput = (window, selector, value) => window.webContents.executeJavaScript('(' + function (selector, value) {
        const input = document.querySelector(selector)
        input.focus()
        input.value = value
        input.dispatchEvent(new Event('input', { bubbles: true }))
    }.toString() + ')(' + JSON.stringify(selector) + ',' + JSON.stringify(value) + ')')
    const auth = windowFor(400, 580)
    const settings = windowFor(1000, 700)
    for (const style of ['ai-native', 'swiss']) {
        for (const mode of ['light', 'dark']) {
            const label = style + '-' + mode
            await workbench.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/messageList' })
            await waitFor(workbench, "!!document.querySelector('.style-option')")
            await workbench.webContents.executeJavaScript("document.querySelectorAll('.style-option')[" + (style === 'swiss' ? 1 : 0) + "].click()")
            await waitFor(workbench, "document.documentElement.dataset.uiStyle === '" + style + "'")
            await workbench.webContents.executeJavaScript("document.querySelectorAll('.theme-options button')[" + (mode === 'dark' ? 1 : 0) + "].click()")
            await waitFor(workbench, "document.documentElement.dataset.theme === '" + mode + "'")
            const metrics = await workbench.webContents.executeJavaScript('(' + function () {
                const el = document.querySelector('.chat-welcome')
                const input = document.querySelector('.message-list-top input')
                input.focus()
                const wrapper = getComputedStyle(input.closest('.el-input__wrapper'))
                return { weight: getComputedStyle(document.body).fontWeight,
                    spacing: getComputedStyle(document.body).letterSpacing,
                    descriptionWeight: getComputedStyle(document.querySelector('.welcome-description')).fontWeight,
                    outline: wrapper.outlineStyle, shadow: wrapper.boxShadow,
                    borderWidth: wrapper.borderTopWidth, inputWeight: getComputedStyle(input).fontWeight,
                    scrollHeight: el.scrollHeight, height: el.clientHeight,
                    scrollbar: getComputedStyle(el).scrollbarWidth }
            }.toString() + ')()')
            assert.equal(metrics.weight, '400', label)
            assert.equal(metrics.spacing, 'normal', label)
            assert.equal(metrics.descriptionWeight, '400', label)
            assert.equal(metrics.inputWeight, '400', label)
            assert.equal(metrics.outline, 'none', label)
            assert.equal(metrics.shadow, 'none', label)
            assert.ok(parseFloat(metrics.borderWidth) > 0 && parseFloat(metrics.borderWidth) <= 1, label)
            assert.equal(metrics.scrollbar, 'none', label)
            assert.ok(await workbench.webContents.executeJavaScript("document.querySelector('.welcome-date').getBoundingClientRect().top > 60"), label + ' 日期应避开窗口控制区')
            assert.ok(metrics.scrollHeight <= metrics.height + 1, label + JSON.stringify(metrics))
            await saveWindow(workbench, label + '-welcome.png')
            assert.equal(await loading.webContents.executeJavaScript('document.documentElement.dataset.uiStyle'), style)
            assert.equal(await loading.webContents.executeJavaScript('document.documentElement.dataset.theme'), mode)
            await saveWindow(loading, label + '-loading.png')
            for (const route of ['login', 'pendingLogin', 'register', 'registerUserInfo', 'uploadAvatar']) {
                auth.setContentSize(400, ['login', 'pendingLogin'].includes(route) ? 580 : 640)
                await auth.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/' + route })
                await waitFor(auth, "!!document.querySelector('.auth-brand')")
                const authMetrics = await auth.webContents.executeJavaScript('(' + function () {
                    const el = document.querySelector('.auth-brand').parentElement
                    return { style: document.documentElement.dataset.uiStyle,
                        theme: document.documentElement.dataset.theme,
                        switchers: document.querySelectorAll('.appearance-switcher').length,
                        scrollHeight: el.scrollHeight, height: el.clientHeight,
                        weight: getComputedStyle(document.body).fontWeight }
                }.toString() + ')()')
                assert.equal(authMetrics.style, style, label + route)
                assert.equal(authMetrics.theme, mode, label + route)
                assert.equal(authMetrics.switchers, 0, label + route)
                assert.equal(authMetrics.weight, '400', label + route)
                assert.ok(authMetrics.scrollHeight <= authMetrics.height + 1, label + route + JSON.stringify(authMetrics))
                await saveWindow(auth, label + '-' + route + '.png')
            }
            await settings.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/account' })
            await waitFor(settings, "document.querySelectorAll('.style-option').length === 2")
            await saveWindow(settings, label + '-settings.png')
            await groupWindow.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/createGroup', query: { appearance: label } })
            await waitFor(groupWindow, "document.querySelectorAll('.contact-row').length === 5")
            assert.equal(await groupWindow.webContents.executeJavaScript("document.querySelector('.create-btn').disabled"), true)
            await groupWindow.webContents.executeJavaScript("document.querySelectorAll('.contact-row input')[1].click(); document.querySelectorAll('.contact-row input')[2].click()")
            assert.equal(await groupWindow.webContents.executeJavaScript("document.querySelectorAll('.selected-row').length"), 2)
            await groupWindow.webContents.executeJavaScript("document.querySelector('.selected-row button').click()")
            assert.equal(await groupWindow.webContents.executeJavaScript("document.querySelectorAll('.selected-row').length"), 1)
            await groupWindow.webContents.executeJavaScript("var input = document.querySelector('.group-name input'); input.value = '产品设计小组'; input.dispatchEvent(new Event('input', { bubbles: true }))")
            assert.equal(await groupWindow.webContents.executeJavaScript("document.querySelector('.create-btn').disabled"), false)
            await saveWindow(groupWindow, label + '-create-group.png')
            await groupWindow.webContents.executeJavaScript("var search = document.querySelector('.contacts-panel input'); search.value = '不存在的联系人'; search.dispatchEvent(new Event('input', { bubbles: true }))")
            await waitFor(groupWindow, "document.querySelectorAll('.contact-row').length === 0")
            assert.equal(await groupWindow.webContents.executeJavaScript("document.querySelectorAll('.selected-row').length"), 1)
            await workbench.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/list' })
            await waitFor(workbench, "!!document.querySelector('.list-top input')")
            await fillInput(workbench, '.list-top input', '设计')
            await waitFor(workbench, "document.querySelectorAll('.contact-result').length === 1")
            assert.equal(await workbench.webContents.executeJavaScript("document.querySelectorAll('.conversation-result, .message-result').length"), 0)
            await saveWindow(workbench, label + '-contact-search.png')
            await workbench.webContents.executeJavaScript("document.querySelector('.contact-result').click()")
            await waitFor(workbench, "!!document.querySelector('.userInfo h1')")
            assert.equal(await workbench.webContents.executeJavaScript("document.querySelector('.userInfo h1').textContent"), '设计伙伴')
            assert.ok(workbench.webContents.getURL().includes('friendId=fixture-friend'))
            await saveWindow(workbench, label + '-friend-details.png')
            await workbench.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/messageList' })
            await waitFor(workbench, "!!document.querySelector('.message-list-top input')")
            await fillInput(workbench, '.message-list-top input', '设计')
            await waitFor(workbench, "document.querySelectorAll('.message-result').length === 1")
            assert.equal(await workbench.webContents.executeJavaScript("document.querySelectorAll('.contact-result').length"), 1)
            assert.equal(await workbench.webContents.executeJavaScript("document.querySelectorAll('.conversation-result').length"), 2)
            await saveWindow(workbench, label + '-local-search.png')
            await workbench.webContents.executeJavaScript("document.querySelector('.message-result').click()")
            await waitFor(workbench, "!!document.querySelector('.chat-count')")
            assert.ok(workbench.webContents.getURL().includes('conversationId=fixture-chat'))
            await waitFor(workbench, "!!document.querySelector('.chat-message.search-match')")
            assert.ok(workbench.webContents.getURL().includes('messageId=history-020'))
            assert.equal(await workbench.webContents.executeJavaScript("document.querySelector('.chat-message.search-match').id"), 'messagehistory-020')
            await saveWindow(workbench, label + '-message-position.png')
            await workbench.webContents.executeJavaScript("document.querySelector('.search-history-banner button').click()")
            await waitFor(workbench, "!document.querySelector('.search-history-banner') && document.querySelectorAll('.chat-message').length === 2")
            if (style === 'ai-native' && mode === 'light') {
                await fillInput(workbench, '.message-list-top input', 'slow')
                await delay(220)
                await fillInput(workbench, '.message-list-top input', 'fast')
                await delay(500)
                assert.ok(await workbench.webContents.executeJavaScript("document.querySelector('.local-search-results').textContent.includes('最新结果') && !document.querySelector('.local-search-results').textContent.includes('过期结果')"))
                await fillInput(workbench, '.message-list-top input', '')
                await waitFor(workbench, "document.querySelectorAll('.contact-result').length === 0")
            }
            results.push(label + '：联系人模糊搜索与详情路由、本地会话/群聊/消息动态搜索通过')
            await workbench.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/collectList' })
            await waitFor(workbench, "!!document.querySelector('.collect-bottom')")
            assert.equal(await workbench.webContents.executeJavaScript("document.querySelectorAll('.collect-bottom .left-list').length"), 0)
            assert.equal(await workbench.webContents.executeJavaScript("document.querySelector('.tags-empty').textContent"), '暂无标签')
            await workbench.webContents.executeJavaScript("document.querySelector('.el-collapse-item__header').click()")
            await saveWindow(workbench, label + '-favorites.png')
            await workbench.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/messageList' })
            await waitFor(workbench, "!!document.querySelector('.message-list-bottom .left-list')")
            await workbench.webContents.executeJavaScript("document.querySelector('.message-list-bottom .left-list').click()")
            await waitFor(workbench, "!!document.querySelector('.chat-count')")
            fileCursor = 0
            for (let file = 0; file < 3; file++) {
                await workbench.webContents.executeJavaScript("document.querySelector('button[aria-label=添加附件]').click()")
                await waitFor(workbench, "document.querySelectorAll('.attachment-card').length === " + (file + 1))
            }
            assert.ok(await workbench.webContents.executeJavaScript("document.querySelector('.attachment-list').textContent.includes('2.0 MB') && document.querySelector('.attachment-list').textContent.includes('15.0 KB')"))
            await saveWindow(workbench, label + '-attachments.png')
            for (const [index, kind] of ['image', 'video', 'document'].entries()) {
                await workbench.webContents.executeJavaScript("document.querySelectorAll('.attachment-preview')[" + index + "].click()")
                await waitFor(workbench, "!!document.querySelector('.preview-stage')")
                if (kind === 'image') await waitFor(workbench, "document.querySelector('.full-image')?.naturalWidth > 0")
                if (kind === 'video') await waitFor(workbench, "document.querySelector('.full-video')?.readyState >= 1")
                await saveWindow(workbench, label + '-preview-' + kind + '.png')
                await workbench.webContents.executeJavaScript("document.querySelector('.el-dialog__footer button').click()")
                await waitFor(workbench, "!document.querySelector('.preview-stage')")
            }
            await workbench.webContents.executeJavaScript("document.querySelector('.remove-file').click()")
            await waitFor(workbench, "document.querySelectorAll('.attachment-card').length === 2")
            results.push(label + '：群聊选择、搜索与移除、附件预览与移除、收藏空标签通过')
            await workbench.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/aiWorkspace' })
            await waitFor(workbench, "!!document.querySelector('.agent-workbench')")
            if (style === 'swiss') assert.equal(await workbench.webContents.executeJavaScript("getComputedStyle(document.querySelector('.agent-workbench')).backgroundImage"), 'none')
            await saveWindow(workbench, label + '-agent.png')
            results.push(label + '：主界面、设置、登录注册全流程、加载页与工作台渲染通过')
        }
    }
    assert.deepEqual(errors.filter(message => /TypeError|ReferenceError/.test(message)), [])

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
