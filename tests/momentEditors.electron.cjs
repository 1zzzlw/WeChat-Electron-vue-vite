// 离线检查动态正文的实际可编辑范围，不发布内容、不连接用户账号。
const { app, BrowserWindow, ipcMain } = require('electron')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
let style = 'ai-native', theme = 'light', win
const errors = [], results = []
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const timeout = setTimeout(() => { console.error('编辑器验证超时'); app.exit(1) }, 30000)
app.whenReady().then(async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'lumina-editors-'))
  ipcMain.on('fixture:style:initial', event => { event.returnValue = style })
  ipcMain.on('fixture:theme:initial', event => { event.returnValue = theme })
  win = new BrowserWindow({ width: 1100, height: 700, useContentSize: true, show: false, frame: false, webPreferences: { preload: path.join(__dirname, 'fixtures/desktopPreload.cjs'), offscreen: true, backgroundThrottling: false, partition: 'lumina-editors-fixture', webSecurity: false } })
  win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message) })
  await win.webContents.session.protocol.handle('http', () => new Response(JSON.stringify({ code: 1, data: [] }), { headers: { 'Content-Type': 'application/json' } }))
  const evaluate = code => win.webContents.executeJavaScript(code)
  for (const nextStyle of ['ai-native', 'swiss']) for (const nextTheme of ['light', 'dark']) {
    style = nextStyle; theme = nextTheme
    for (const route of ['createMomentView', 'updateMomentView']) {
      win.setContentSize(1100, 700)
      await win.loadFile(path.join(__dirname, '../out/renderer/index.html'), { hash: '/' + route, query: { fixture: style + theme + route } })
      for (let attempt = 0; attempt < 60; attempt++) { if (await evaluate("!!document.querySelector('.ProseMirror')")) break; await wait(30) }
      await wait(100)
      const checkBounds = async () => {
        const bounds = await evaluate("(() => { const editor = document.querySelector('.ProseMirror'); const wrap = document.querySelector('.editor-content-wrapper').getBoundingClientRect(); const rect = editor.getBoundingClientRect(); const main = document.querySelector('.editor-main').getBoundingClientRect(); return { width: rect.width, available: wrap.width, height: rect.height, viewport: main.height, scrollWidth: editor.scrollWidth, clientWidth: editor.clientWidth, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } })()")
        assert.ok(Math.abs(bounds.width - bounds.available) < 2, JSON.stringify(bounds))
        assert.ok(bounds.height >= bounds.viewport - 2, JSON.stringify(bounds))
        assert.ok(bounds.scrollWidth <= bounds.clientWidth + 2, JSON.stringify(bounds))
        return bounds
      }
      const bounds = await checkBounds()
      const x = Math.floor(bounds.right - 16), y = Math.floor(Math.min(bounds.bottom - 24, 600))
      win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 })
      win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 })
      await wait(30)
      assert.ok(await evaluate("document.activeElement?.classList.contains('ProseMirror')"), '右侧空白区域也应能激活编辑器')
      await win.webContents.insertText('微光动态内容 ' + 'Lumina'.repeat(200))
      await checkBounds()
      await evaluate("document.querySelector('.toggle-btn').click()")
      await wait(350)
      const expanded = await checkBounds()
      assert.ok(expanded.width > bounds.width + 100, JSON.stringify({ bounds, expanded }))
      win.setContentSize(740, 700)
      await wait(350)
      await checkBounds()
      assert.ok(await evaluate("document.querySelector('.ProseMirror').textContent.includes('微光动态内容')"))
      await fs.writeFile(path.join(output, style + '-' + theme + '-' + route + '.png'), (await win.webContents.capturePage()).toPNG())
      results.push(style + '-' + theme + ' ' + route + '：正文铺满宽高，右侧点击可输入，长英文换行，目录收起与缩放保留内容')
    }
  }
  assert.deepEqual(errors.filter(message => /TypeError|ReferenceError/.test(message)), [])
  console.log(JSON.stringify({ results, output }, null, 2))
  clearTimeout(timeout); win.destroy(); app.exit(0)
}).catch(error => { console.error(error, errors); clearTimeout(timeout); win?.destroy(); app.exit(1) })
