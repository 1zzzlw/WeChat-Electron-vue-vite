// 使用真实 Chromium 自定义指针事件验证图像、热区和主题。
const { app, BrowserWindow, ipcMain, nativeImage } = require('electron')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const root = path.join(__dirname, '..')
const roles = {
    default: [5, 5], pointer: [16, 5], text: [16, 16],
    'not-allowed': [5, 5], crosshair: [16, 16], help: [5, 5], move: [16, 16],
    'ew-resize': [16, 16], 'ns-resize': [16, 16],
    'nwse-resize': [16, 16], 'nesw-resize': [16, 16], wait: [16, 16], progress: [5, 5]
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const windows = []
const errors = []
const timeout = setTimeout(() => { console.error('指针验证超时'); app.exit(1) }, 30000)

app.whenReady().then(async () => {
    let theme = 'light'
    ipcMain.on('theme:initial', event => { event.returnValue = 'light' })
    ipcMain.handle('window:getUserInfo', (_event, key) => key === 'wallpaperPath'
        ? pathToFileURL(path.join(root, 'public/wallpaper/1.jpg')).href : key === 'token' ? 'cursor-test-token' : '')
    ipcMain.handle('query:conversation', () => [])
    ipcMain.handle('query:friend', () => [])
    ipcMain.handle('query:favoritesAll', () => [])
    ipcMain.handle('theme:get', () => theme)
    ipcMain.handle('theme:set', (_event, value) => {
        theme = value
        windows.forEach(window => window.webContents.send('theme:changed', theme))
        return theme
    })
    const results = []
    for (const kind of ['vue', 'standalone']) {
        const window = new BrowserWindow({ width: kind === 'vue' ? 300 : 1100,
            height: kind === 'vue' ? 370 : 700, resizable: kind !== 'vue', frame: false, show: false,
            webPreferences: { preload: path.join(root, 'out/preload/index.js'), contextIsolation: true,
                sandbox: false, offscreen: true, backgroundThrottling: false, webSecurity: false,
                partition: 'cursor-test' }
        })
        windows.push(window)
        let current = null
        window.webContents.on('cursor-changed', (_event, type, image, scale, size, hotspot) => {
            current = { type, scale, size, hotspot, empty: image?.isEmpty() }
        })
        window.webContents.on('console-message', event => {
            if (/Uncaught|FATAL|Unable to load preload/.test(event.message)) errors.push(event.message)
        })
        if (kind === 'vue') {
            await window.webContents.session.protocol.handle('http', request => /verify/i.test(request.url)
                ? new Response(Buffer.alloc(0), { headers: { 'Content-Type': 'image/png' } })
                : new Response(JSON.stringify({ code: 1, data: [] }), { headers: { 'Content-Type': 'application/json' } }))
            await window.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/login' })
            for (let index = 0; index < 60; index++) {
                if (await window.webContents.executeJavaScript("!!document.querySelector('.login-form-button button')")) break
                await delay(50)
            }
            const componentCursor = await window.webContents.executeJavaScript("getComputedStyle(document.querySelector('.login-form-button button')).cursor")
            assert.match(componentCursor, /black\/pointer\.png/)
            const mouse = (type, box, down = false) => window.webContents.sendInputEvent({ type,
                x: box.x, y: box.y, button: 'left', clickCount: 1, modifiers: down ? ['leftButtonDown'] : [] })
            const checkRegion = async (selector, role, mode) => {
                window.webContents.send('theme:changed', mode === 'black' ? 'light' : 'dark')
                await delay(20)
                const box = await window.webContents.executeJavaScript('(' + function (selector) {
                    const element = document.querySelector(selector)
                    const rect = element.getBoundingClientRect()
                    const style = getComputedStyle(element)
                    let nativeDrag = false
                    for (let parent = element; parent; parent = parent.parentElement) {
                        const region = getComputedStyle(parent).webkitAppRegion
                        if (region === 'no-drag') break
                        if (region === 'drag') { nativeDrag = true; break }
                    }
                    return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2),
                        cursor: style.cursor, nativeDrag }
                }.toString() + ')(' + JSON.stringify(selector) + ')')
                assert.match(box.cursor, new RegExp(mode + '/' + role + '\\.png'))
                // 原生拖拽区这里只核对 CSS 地址，不作为实际指针显示已修复的证据。
                if (box.nativeDrag) return box
                await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                mouse('mouseMove', { x: 2, y: 2 })
                mouse('mouseMove', box)
                await delay(100)
                assert.equal(current?.type, 'custom', JSON.stringify({ selector, box, current,
                    hit: await window.webContents.executeJavaScript(`(() => {
                        const el = document.elementFromPoint(${box.x}, ${box.y})
                        return { tag: el?.tagName, className: el?.className, cursor: el && getComputedStyle(el).cursor,
                            pointer: getComputedStyle(document.documentElement).getPropertyValue('--cursor-pointer'),
                            themes: [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.href) }
                    })()`) }))
                return box
            }
            const checkClicks = async box => {
                const bounds = window.getBounds()
                for (let index = 0; index < 20; index++) {
                    mouse('mouseDown', box)
                    mouse('mouseUp', box)
                }
                for (const type of ['mouseDown', 'mouseUp']) window.webContents.sendInputEvent({ type,
                    x: box.x, y: box.y, button: 'left', clickCount: 2 })
                await delay(60)
                assert.deepEqual(window.getBounds(), bounds, '普通内容区单击、连点或双击不能改变窗口位置和尺寸')
            }
            for (const mode of ['black', 'white']) {
                const heading = await checkRegion('.login-top h1', 'default', mode)
                await checkClicks(heading)
                const input = await checkRegion('.el-input__inner', 'text', mode)
                mouse('mouseDown', input)
                mouse('mouseUp', input)
                await delay(30)
                assert.equal(await window.webContents.executeJavaScript("document.activeElement.matches('input')"), true)
                await checkRegion('.login-form-button button', 'pointer', mode)
            }
            assert.equal(await window.webContents.executeJavaScript("getComputedStyle(document.querySelector('.login-count')).webkitAppRegion"), 'drag')
            results.push('实际登录页：黑白指针地址、输入聚焦、按钮手形和连续点击尺寸不变通过')
            window.setResizable(true)
            window.setSize(1100, 700)
            for (const route of ['/messageList', '/list', '/collectList']) {
                await window.loadFile(path.join(root, 'out/renderer/index.html'), { hash: route })
                for (let index = 0; index < 60; index++) {
                    if (await window.webContents.executeJavaScript("!!document.querySelector('.welcome-copy h1')")) break
                    await delay(50)
                }
                for (const mode of ['black', 'white']) {
                    const heading = await checkRegion('.welcome-copy h1', 'default', mode)
                    await checkClicks(heading)
                    await checkRegion('.theme-options button', 'pointer', mode)
                }
                assert.equal(await window.webContents.executeJavaScript("getComputedStyle(document.querySelector('.chat-welcome')).webkitAppRegion"), 'drag')
            }
            // 操作区能点击切换主题，不能启动窗口拖拽。
            const themeButton = await checkRegion('.theme-options button', 'pointer', 'white')
            mouse('mouseDown', themeButton)
            mouse('mouseUp', themeButton)
            await delay(80)
            assert.equal(await window.webContents.executeJavaScript('document.documentElement.dataset.theme'), 'light')
            results.push('会话/联系人/收藏欢迎区：指针地址、主题点击、原生拖拽声明和连续点击尺寸不变通过')
        } else {
            await window.loadFile(path.join(root, 'public/capture.html'))
            assert.match(await window.webContents.executeJavaScript('getComputedStyle(document.body).cursor'), /black\/crosshair\.png/)
        }
        await window.webContents.executeJavaScript('(' + function () {
            const panel = document.createElement('div')
            panel.id = 'cursor-test'
            panel.style.cssText = 'position:fixed;inset:80px 0 0;display:grid;grid-template-columns:repeat(5,1fr);align-content:start;gap:12px;padding:20px;z-index:99999;background:#729cb9;-webkit-app-region:no-drag'
            document.body.append(panel)
        }.toString() + ')()')
        for (const mode of ['black', 'white']) {
            window.webContents.send('theme:changed', mode === 'black' ? 'light' : 'dark')
            await delay(20)
            for (const [role, hotspot] of Object.entries(roles)) {
                const file = path.join(root, 'public/cursors/minimalistic-v5', mode, role + '.png')
                const image = nativeImage.createFromBuffer(await fs.readFile(file))
                assert.equal(image.isEmpty(), false)
                assert.deepEqual(image.getSize(), { width: 32, height: 32 })
                const box = await window.webContents.executeJavaScript('(' + function (role) {
                    const panel = document.querySelector('#cursor-test')
                    panel.innerHTML = ''
                    const sample = document.createElement('div')
                    sample.style.cssText = 'height:80px;cursor:var(--cursor-' + role + ',default)'
                    panel.append(sample)
                    const rect = sample.getBoundingClientRect()
                    return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2), cursor: getComputedStyle(sample).cursor }
                }.toString() + ')(' + JSON.stringify(role) + ')')
                assert.ok(box.cursor.includes('/' + mode + '/' + role + '.png'), box.cursor)
                await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                window.webContents.sendInputEvent({ type: 'mouseMove', x: 10, y: 10 })
                window.webContents.sendInputEvent({ type: 'mouseMove', x: box.x, y: box.y })
                await delay(100)
                assert.equal(current?.type, 'custom', JSON.stringify({ kind, mode, role, current }))
                assert.equal(current.empty, false)
                assert.ok(Math.abs(current.hotspot.x / current.size.width - hotspot[0] / 32) < .04, JSON.stringify(current))
                assert.ok(Math.abs(current.hotspot.y / current.size.height - hotspot[1] / 32) < .04, JSON.stringify(current))
            }
        }
        results.push(kind + '：13 种指针、黑白切换、32px 资源和真实自定义指针热区通过')
    }
    const loading = new BrowserWindow({ width: 640, height: 520, frame: false, show: false,
        webPreferences: { preload: path.join(root, 'out/preload/index.js'), contextIsolation: true,
            sandbox: false, offscreen: true, backgroundThrottling: false }
    })
    windows.push(loading)
    await loading.loadFile(path.join(root, 'public/loading.html'))
    for (const mode of ['light', 'dark']) {
        loading.webContents.send('theme:changed', mode)
        await delay(30)
        const header = await loading.webContents.executeJavaScript(`(() => {
            const header = document.querySelector('header')
            return { region: getComputedStyle(header).webkitAppRegion, cursor: getComputedStyle(header).cursor }
        })()`)
        assert.equal(header.region, 'drag')
        assert.ok(header.cursor.includes('/' + (mode === 'light' ? 'black' : 'white') + '/default.png'))
    }
    results.push('独立加载页保留顶部原生拖拽区，通过主题资源检查')
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ results }, null, 2))
    clearTimeout(timeout)
    windows.forEach(window => window.destroy())
    app.exit(0)
}).catch(error => {
    console.error(error)
    console.error(errors)
    clearTimeout(timeout)
    windows.forEach(window => { if (!window.isDestroyed()) window.destroy() })
    app.exit(1)
})
