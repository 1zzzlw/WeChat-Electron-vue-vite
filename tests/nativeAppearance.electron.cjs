const { app, BrowserWindow, nativeImage, Tray, Menu, ipcMain } = require('electron')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const vm = require('node:vm')
const root = path.join(__dirname, '..')
const windows = []
let tray
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const timeout = setTimeout(() => { console.error('原生外观验证超时'); app.exit(1) }, 20000)
app.whenReady().then(async () => {
    const icoPath = path.join(root, 'resources/icon.ico')
    const image = nativeImage.createFromPath(icoPath)
    assert.equal(image.isEmpty(), false)
    const png = nativeImage.createFromPath(path.join(root, 'resources/icon.png'))
    assert.equal(png.getSize().width, 512)
    const ico = await fs.readFile(icoPath)
    assert.equal(ico.readUInt16LE(4), 9)
    assert.deepEqual(await fs.readFile(path.join(root, 'build/favicon.ico')), ico)
    const exe = path.join(root, 'dist/lumina/win-unpacked/Lumina.exe')
    // 从 PE 的 RT_ICON 资源读取图标，避免 Windows Shell 图标缓存造成误判。
    const bytes = await fs.readFile(exe)
    const pe = bytes.readUInt32LE(0x3c)
    const optional = pe + 24
    const sectionStart = optional + bytes.readUInt16LE(pe + 20)
    const sections = Array.from({ length: bytes.readUInt16LE(pe + 6) }, (_, index) => {
        const offset = sectionStart + index * 40
        return { va: bytes.readUInt32LE(offset + 12), size: Math.max(bytes.readUInt32LE(offset + 8), bytes.readUInt32LE(offset + 16)), raw: bytes.readUInt32LE(offset + 20) }
    })
    const toOffset = rva => {
        const section = sections.find(item => rva >= item.va && rva < item.va + item.size)
        assert.ok(section)
        return rva - section.va + section.raw
    }
    const directories = optional + (bytes.readUInt16LE(optional) === 0x20b ? 112 : 96)
    const resourceBase = toOffset(bytes.readUInt32LE(directories + 16))
    const icons = []
    const visit = (relative, ids) => {
        const offset = resourceBase + relative
        const count = bytes.readUInt16LE(offset + 12) + bytes.readUInt16LE(offset + 14)
        for (let index = 0; index < count; index++) {
            const entry = offset + 16 + index * 8
            const id = bytes.readUInt32LE(entry)
            const target = bytes.readUInt32LE(entry + 4)
            if (target >>> 31) visit(target & 0x7fffffff, [...ids, id])
            else if (ids[0] === 3) {
                const data = resourceBase + target
                const begin = toOffset(bytes.readUInt32LE(data))
                icons.push(bytes.subarray(begin, begin + bytes.readUInt32LE(data + 4)))
            }
        }
    }
    visit(0, [])
    assert.equal(icons.length, ico.readUInt16LE(4))
    for (let index = 0; index < icons.length; index++) {
        const entry = 6 + index * 16
        const start = ico.readUInt32LE(entry + 12)
        const expected = ico.subarray(start, start + ico.readUInt32LE(entry + 8))
        assert.ok(icons.some(icon => icon.equals(expected)), 'EXE 图标必须逐字节匹配新 ICO')
    }
    const output = path.join(root, 'dist/lumina/embedded-icon.png')
    await fs.writeFile(output, icons.at(-1))
    for (const file of ['icon.svg', 'icon.png', 'icon.ico']) assert.ok((await fs.stat(path.join(root, 'dist/lumina/win-unpacked/resources', file))).size > 0)
    ipcMain.on('fixture:theme:initial', event => { event.returnValue = 'dark' })
    ipcMain.on('fixture:style:initial', event => { event.returnValue = 'swiss' })
    const main = new BrowserWindow({ show: false, width: 1100, height: 700, icon: icoPath,
        webPreferences: { preload: path.join(__dirname, 'fixtures/desktopPreload.cjs'), offscreen: true,
            backgroundThrottling: false, contextIsolation: true, partition: 'native-appearance-test', webSecurity: false } })
    windows.push(main)
    main.show = () => {} // 验证始终在后台进行。
    main.focus = () => {}
    main.setAppDetails({ appId: 'com.lumina.agent', appIconPath: icoPath, appIconIndex: 0 })
    await main.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/pendingLogin' })
    await main.webContents.executeJavaScript("localStorage.setItem('token', 'fixture-old-token')")
    const child = new BrowserWindow({ show: false, icon: icoPath })
    windows.push(child)
    const stored = { token: 'fixture-refresh', accessToken: 'fixture-access', userId: 'fixture-user', appearanceTheme: 'dark', appearanceStyle: 'swiss', storeLocation: 'keep-history' }
    let disconnects = 0
    let canceledUploads = 0
    const refs = { mainWindow: main, tray: null }
    const logoutSource = (await fs.readFile(path.join(root, 'src/main/Util/logout.js'), 'utf8'))
        .replace(/^import .*\r?\n/gm, '').replace('export async function', 'async function')
        .replace("import('../File/fileUpload.js')", 'Promise.resolve({ cancelAllUploads: cancelUploadsMock })')
    const logout = vm.runInNewContext(logoutSource + '\nlogout', { BrowserWindow, store: { delete: key => { delete stored[key] } }, refs,
        websocket: { disconnect: () => disconnects++ }, finishLoadingWindow() {}, cancelUploadsMock: () => canceledUploads++,
        is: { dev: false }, process: { env: {} }, join: path.join, __dirname: path.join(root, 'out/main') })
    let menu
    const mainSource = await fs.readFile(path.join(root, 'src/main/index.js'), 'utf8')
    const traySource = mainSource.slice(mainSource.indexOf('function createTray()'), mainSource.indexOf('app.whenReady()'))
    const createTray = vm.runInNewContext(traySource + '\ncreateTray', { refs, Tray, Menu: { buildFromTemplate: template => { menu = Menu.buildFromTemplate(template); return menu } },
        getTrayIcon: () => png.resize({ width: 20, height: 20 }), logout, app, console })
    createTray()
    tray = refs.tray
    const item = menu.items.find(item => item.label === '退出登录')
    assert.ok(item)
    item.click()
    for (let attempt = 0; attempt < 160; attempt++) {
        if (!stored.token && main.webContents.getURL().endsWith('#/login') && await main.webContents.executeJavaScript("!!document.querySelector('.login-count')")) break
        await delay(50)
    }
    assert.ok(main.webContents.getURL().endsWith('#/login'))
    assert.equal(await main.webContents.executeJavaScript("!!document.querySelector('.login-count') && !document.querySelector('.appearance-switcher')"), true)
    assert.equal(await main.webContents.executeJavaScript("localStorage.getItem('token')"), null)
    assert.equal(stored.token, undefined)
    assert.equal(stored.accessToken, undefined)
    assert.equal(stored.userId, undefined)
    assert.equal(stored.appearanceStyle, 'swiss')
    assert.equal(stored.storeLocation, 'keep-history')
    assert.equal(child.isDestroyed(), true)
    assert.ok(disconnects >= 1)
    assert.equal(canceledUploads, 1)
    console.log(JSON.stringify({ result: 'SVG 派生图标、EXE 嵌入图标、原生窗口任务栏图标配置、真实托盘退出菜单、关闭子窗口与返回登录通过', icon: output }))
    clearTimeout(timeout)
    tray.destroy()
    windows.forEach(window => { if (!window.isDestroyed()) window.destroy() })
    app.exit(0)
}).catch(error => {
    console.error(error)
    clearTimeout(timeout)
    tray?.destroy()
    windows.forEach(window => { if (!window.isDestroyed()) window.destroy() })
    app.exit(1)
})
