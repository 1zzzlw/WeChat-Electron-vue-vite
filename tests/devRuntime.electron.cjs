// 通过开发启动器运行：node build/run-electron.cjs preview --skipBuild --entry tests/devRuntime.electron.cjs
const { app, BrowserWindow, nativeImage } = require('electron')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'easychat-runtime-')))
app
  .whenReady()
  .then(async () => {
    if (process.platform === 'win32') {
      assert.equal(path.basename(process.execPath), 'electron.exe')
      assert.equal(path.basename(path.dirname(process.execPath)), '.lumina-development')
      assert.equal(app.isPackaged, false, '开发运行时不能误判成已打包程序')
      const iconPath = path.join(__dirname, '../out/main/../../resources/icon.ico')
      assert.equal(nativeImage.createFromPath(iconPath).isEmpty(), false, '开发图标路径必须可加载')
      const exe = fs.readFileSync(process.execPath)
      const ico = fs.readFileSync(path.join(__dirname, '../resources/icon.ico'))
      for (let index = 0; index < ico.readUInt16LE(4); index++) {
        const entry = 6 + index * 16
        const start = ico.readUInt32LE(entry + 12)
        assert.ok(exe.includes(ico.subarray(start, start + ico.readUInt32LE(entry + 8))))
      }
    }
    const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
    await win.loadURL('data:text/html,<p>runtime probe</p>')
    assert.ok(win.webContents.getOSProcessId() > 0)
    console.log(
      '开发启动链路通过：' +
        process.execPath +
        '，isPackaged=' +
        app.isPackaged +
        '，包含新图标，渲染进程正常创建'
    )
    win.destroy()
    app.exit(0)
  })
  .catch((error) => {
    console.error(error)
    app.exit(1)
  })
