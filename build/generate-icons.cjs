// SVG 是图标源；PNG/ICO 为 Electron 原生窗口、托盘和 Windows EXE 提供兼容资源。
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const root = path.join(__dirname, '..')
app.whenReady().then(async () => {
    const svg = await fs.readFile(path.join(root, 'resources/icon.svg'), 'utf8')
    const win = new BrowserWindow({ width: 512, height: 512, show: false,
        webPreferences: { offscreen: true, contextIsolation: true, sandbox: true } })
    await win.loadURL('data:text/html,<html><body></body></html>')
    const images = []
    for (const size of [16, 20, 24, 32, 40, 48, 64, 128, 256, 512]) {
        const data = await win.webContents.executeJavaScript('(' + async function (svg, size) {
            const img = new Image()
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
            await img.decode()
            const canvas = document.createElement('canvas')
            canvas.width = canvas.height = size
            canvas.getContext('2d').drawImage(img, 0, 0, size, size)
            return canvas.toDataURL('image/png').split(',')[1]
        }.toString() + ')(' + JSON.stringify(svg) + ',' + size + ')')
        images.push({ size, data: Buffer.from(data, 'base64') })
    }
    await fs.writeFile(path.join(root, 'resources/icon.png'), images.at(-1).data)
    const entries = images.filter(image => image.size <= 256)
    const header = Buffer.alloc(6 + entries.length * 16)
    header.writeUInt16LE(1, 2)
    header.writeUInt16LE(entries.length, 4)
    let offset = header.length
    entries.forEach((image, index) => {
        const start = 6 + index * 16
        header[start] = header[start + 1] = image.size === 256 ? 0 : image.size
        header.writeUInt16LE(1, start + 4)
        header.writeUInt16LE(32, start + 6)
        header.writeUInt32LE(image.data.length, start + 8)
        header.writeUInt32LE(offset, start + 12)
        offset += image.data.length
    })
    const ico = Buffer.concat([header, ...entries.map(image => image.data)])
    await fs.writeFile(path.join(root, 'resources/icon.ico'), ico)
    await fs.writeFile(path.join(root, 'build/favicon.ico'), ico)
    win.destroy()
    console.log('图标已从 SVG 生成：512px PNG、16–256px 多尺寸 ICO')
    app.exit(0)
}).catch(error => { console.error(error); app.exit(1) })
