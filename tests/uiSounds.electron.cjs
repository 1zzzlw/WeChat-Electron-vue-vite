// 使用真实 preload 和 Chromium 音频播放；假按钮不触发登录或资金请求。
const { app, BrowserWindow, ipcMain, nativeImage } = require('electron')
const assert = require('node:assert/strict')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const root = path.join(__dirname, '..')
const windows = []
const errors = []
const results = []
const disposals = []
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const evaluate = (window, callback) => window.webContents.executeJavaScript('(' + callback.toString() + ')()')
const isolated = (window, callback) => window.webContents.executeJavaScriptInIsolatedWorld(999, [{ code: '(' + callback.toString() + ')()' }])
const timeout = setTimeout(() => { console.error('音效验证超时'); app.exit(1) }, 30000)

function instrumentPlayback() {
    window.soundEvents = []
    window.soundRejections = []
    window.addEventListener('unhandledrejection', event => window.soundRejections.push(String(event.reason)))
    const nativePlay = HTMLMediaElement.prototype.play
    const observed = new Set()
    window.addEventListener('pagehide', () => {
        console.info('SFX_DISPOSED:' + JSON.stringify([...observed].every(player => player.paused && !player.getAttribute('src'))))
    })
    HTMLMediaElement.prototype.play = function () {
        observed.add(this)
        const event = { file: this.src.split('/').pop(), volume: this.volume, status: 'pending' }
        window.soundEvents.push(event)
        const promise = nativePlay.call(this)
        promise.then(() => { event.status = 'playing'; event.duration = this.duration }, error => {
            event.status = error.name
        })
        return promise
    }
}

function insertControls() {
    const panel = document.createElement('div')
    panel.id = 'sound-test'
    panel.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-wrap:wrap;align-content:start;gap:12px;padding:24px;background:#a4c8e0;-webkit-app-region:no-drag'
    panel.innerHTML = [
        '<button id="plain" style="width:100px;height:50px">点击<span>内部文字</span></button>',
        '<button id="disabled" disabled>禁用按钮</button>',
        '<div aria-disabled="true"><button id="aria-disabled">禁用容器</button></div>',
        '<div id="custom" style="cursor:var(--cursor-pointer,pointer);padding:12px"><span>自定义操作</span></div>',
        '<div class="theme-options"><button id="select">选择</button></div>',
        '<button id="delete" class="el-button--danger">删除</button>',
        '<button id="capture" data-ui-sound="capture">截图</button>',
        '<button id="hover">悬停</button>',
        '<label id="toggle"><input type="checkbox">开关</label>'
    ].join('')
    document.body.append(panel)
    document.querySelector('#plain').onclick = event => {
        const button = event.currentTarget
        button.dataset.clicks = String(Number(button.dataset.clicks || 0) + 1)
    }
}

async function point(window, selector) {
    return window.webContents.executeJavaScript('(() => { const box = document.querySelector(' + JSON.stringify(selector) + ').getBoundingClientRect(); return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }; })()')
}

async function press(window, selector, wait = 100) {
    const position = await point(window, selector)
    window.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...position })
    window.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...position })
    await delay(wait)
}

const events = window => isolated(window, () => window.soundEvents)

app.whenReady().then(async () => {
    ipcMain.on('theme:initial', event => { event.returnValue = 'light' })
    ipcMain.handle('window:getUserInfo', (_event, key) => key === 'wallpaperPath'
        ? pathToFileURL(path.join(root, 'public/wallpaper/1.jpg')).href : '')
    ipcMain.handle('window:setUserInfo', () => {})
    for (const page of ['vue', 'standalone']) {
        const window = new BrowserWindow({ width: 1100, height: 700, show: false, frame: false,
            webPreferences: { preload: path.join(root, 'out/preload/index.js'), contextIsolation: true,
                sandbox: false, offscreen: true, backgroundThrottling: false, webSecurity: false,
                partition: 'ui-sounds-test' }
        })
        windows.push(window)
        window.webContents.on('console-message', event => {
            if (event.message.startsWith('SFX_DISPOSED:')) disposals.push(JSON.parse(event.message.slice('SFX_DISPOSED:'.length)))
            if (/Uncaught|FATAL|Unable to load preload/.test(event.message)) errors.push({ page, url: window.webContents.getURL(), message: event.message, source: event.sourceId, line: event.lineNumber })
        })
        if (page === 'vue') {
            const image = nativeImage.createFromBuffer(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'))
            await window.webContents.session.protocol.handle('http', () => new Response(image.toPNG(), { headers: { 'Content-Type': 'image/png' } }))
            await window.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/login' })
        } else {
            await window.loadFile(path.join(root, 'public/capture.html'))
        }
        await evaluate(window, insertControls)
        await isolated(window, instrumentPlayback)
        await delay(150)
        await press(window, '#plain')
        assert.equal((await events(window)).length, 1)
        assert.equal((await events(window))[0].file, 'menu_click.mp3')
        await press(window, '#disabled')
        await press(window, '#aria-disabled')
        assert.equal((await events(window)).length, 1)
        await press(window, '#custom span')
        assert.equal((await events(window)).length, 2)
        await press(window, '#select')
        assert.equal((await events(window)).at(-1).file, 'item_pick.mp3')
        await press(window, '#delete')
        assert.equal((await events(window)).at(-1).file, 'item_delete.mp3')
        await press(window, '#capture')
        assert.equal((await events(window)).at(-1).file, 'snapshot_capture.mp3')
        await press(window, '#toggle')
        const beforeKeyboard = (await events(window)).length
        assert.equal(beforeKeyboard, 6, '原生 label 不应与关联 input 重复发声')
        await evaluate(window, () => document.querySelector('#plain').focus())
        window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Space' })
        window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space' })
        await delay(100)
        assert.equal((await events(window)).length, beforeKeyboard + 1)
        const beforeSynthetic = (await events(window)).length
        await evaluate(window, () => document.querySelector('#plain').click())
        await delay(80)
        assert.equal((await events(window)).length, beforeSynthetic, '脚本触发不应自行发声')
        const count = await evaluate(window, () => Number(document.querySelector('#plain').dataset.clicks))
        const rapid = await point(window, '#plain')
        for (let i = 0; i < 5; i++) {
            window.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...rapid })
            window.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...rapid })
        }
        await delay(100)
        assert.equal((await events(window)).length, beforeSynthetic + 1, '连点只限制音效，不应叠音')
        assert.equal(await evaluate(window, () => Number(document.querySelector('#plain').dataset.clicks)), count + 5)
        await delay(230)
        const hover = await point(window, '#hover')
        window.webContents.sendInputEvent({ type: 'mouseMove', ...hover })
        await delay(120)
        assert.equal((await events(window)).at(-1).file, 'menu_hover.mp3')
        for (const event of await events(window)) {
            assert.equal(event.status, 'playing', JSON.stringify(event))
            assert.ok(event.duration > 0 && event.duration < 1)
            assert.ok(event.volume <= 0.18)
        }
        await isolated(window, () => {
            HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'))
        })
        await press(window, '#plain')
        assert.equal((await isolated(window, () => window.soundRejections)).length, 0)
        const beforeDispose = disposals.length
        await window.loadFile(path.join(root, 'public/loading.html'))
        await delay(80)
        assert.equal(disposals.length, beforeDispose + 1)
        assert.equal(disposals.at(-1), true)
        await evaluate(window, insertControls)
        await isolated(window, instrumentPlayback)
        await press(window, '#plain')
        assert.equal((await events(window)).length, 1, '页面重载后不应累积旧监听器')
        results.push(page + '：资源解码、按下/键盘、自定义按钮、禁用、限频、悬停、播放失败与卸载清理通过')
    }
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
