import { ipcMain, app, clipboard, nativeImage, BrowserWindow, screen, desktopCapturer } from 'electron'
import { refs } from '../shared.js'
import { createExtraWindow } from '../Util/createNewWindow'
import { setTimeout as delay } from 'node:timers/promises'
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')

// 在异步抓屏开始前占用会话，避免连点/快捷键创建多个截图窗口。
let captureSession = null

function finishCapture(session, result = { canceled: true }) {
    if (captureSession !== session) return
    captureSession = null
    clearTimeout(session.loadTimer)
    session.image = null
    if (session.window && !session.window.isDestroyed()) session.window.destroy()
    const source = session.source
    if (source && !source.isDestroyed()) {
        if (session.wasVisible) {
            source.show()
            source.focus()
        }
        source.webContents.send('capture:result', result)
    }
}

ipcMain.handle('window:capture-open', (event) => {
    return createCaptureWindow(BrowserWindow.fromWebContents(event.sender))
})

ipcMain.on('window:close-capture', (event) => {
    const session = captureSession
    if (session?.window?.webContents === event.sender) finishCapture(session)
})

// 只接收选区坐标，避免大图在渲染进程反复编码、复制和经 IPC 回传。
ipcMain.handle('window:save-capture', async (event, rect) => {
    const session = captureSession
    if (!session || session.window?.webContents !== event.sender || session.saving) {
        return { ok: false, error: '截图会话已结束或正在保存' }
    }
    session.saving = true
    try {
        const { width, height } = session.image.getSize()
        if (!rect || !['x', 'y', 'width', 'height', 'viewportWidth', 'viewportHeight'].every(key => Number.isFinite(rect[key])) ||
            rect.width <= 0 || rect.height <= 0 || rect.viewportWidth <= 0 || rect.viewportHeight <= 0) throw new Error('请选择有效的截图区域')
        // 按实际图像尺寸换算，不能假设系统缩放值等于缩略图比例。
        const x = Math.max(0, Math.min(width - 1, Math.floor(rect.x * width / rect.viewportWidth)))
        const y = Math.max(0, Math.min(height - 1, Math.floor(rect.y * height / rect.viewportHeight)))
        const right = Math.max(x + 1, Math.min(width, Math.ceil((rect.x + rect.width) * width / rect.viewportWidth)))
        const bottom = Math.max(y + 1, Math.min(height, Math.ceil((rect.y + rect.height) * height / rect.viewportHeight)))
        const image = session.image.crop({ x, y, width: right - x, height: bottom - y })
        if (image.isEmpty()) throw new Error('截图图像为空，请重试')
        const buffer = image.toPNG()
        if (!buffer.length) throw new Error('截图编码失败，请重试')
        const fileId = crypto.randomUUID()
        const fileName = `screenshot_${Date.now()}_${fileId.slice(0, 8)}.png`
        const savePath = path.join(app.getPath('pictures'), fileName)
        await fs.promises.writeFile(savePath, buffer)
        // 写盘时仍允许取消；旧任务不能关闭新会话或污染剪贴板。
        if (captureSession !== session) {
            await fs.promises.unlink(savePath).catch(() => {})
            return { canceled: true }
        }
        clipboard.writeImage(image)
        const size = image.getSize()
        const ratio = Math.min(1, 300 / size.width, 300 / size.height)
        const preview = ratio < 1 ? image.resize({ width: Math.max(1, Math.round(size.width * ratio)),
            height: Math.max(1, Math.round(size.height * ratio)) }) : image
        finishCapture(session, { ok: true, fileInfo: {
            fileId, fileName, fileSize: buffer.length, fileType: 'image/png',
            content: '', base64: preview.toDataURL(), localPath: savePath, remotePath: ''
        } })
        return { ok: true }
    } catch (error) {
        console.error('保存截图失败:', error.message)
        finishCapture(session, { error: '保存截图失败，请检查图片目录权限和磁盘空间后重试' })
        return { ok: false }
    }
})

export async function createCaptureWindow(source = BrowserWindow.getFocusedWindow() || refs.mainWindow) {
    if (captureSession) return { ok: false, busy: true }
    const session = { source, wasVisible: !!source && !source.isDestroyed() && source.isVisible() }
    captureSession = session
    // 只保护准备阶段，选区期间不强制超时。
    session.loadTimer = setTimeout(() => finishCapture(session, { error: '截图准备超时，请重试' }), 15000)
    try {
        session.display = source && !source.isDestroyed()
            ? screen.getDisplayMatching(source.getBounds()) : screen.getPrimaryDisplay()
        if (session.wasVisible) source.hide()
        // 给桌面合成器一次完成隐藏窗口的机会。
        await delay(120)
        if (captureSession !== session) return { canceled: true }
        const { bounds, scaleFactor } = session.display
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: Math.round(bounds.width * scaleFactor), height: Math.round(bounds.height * scaleFactor) }
        })
        if (captureSession !== session) return { canceled: true }
        const desktop = sources.find(item => item.display_id === String(session.display.id)) ||
            (sources.length === 1 ? sources[0] : null)
        if (!desktop || desktop.thumbnail.isEmpty()) throw new Error('无法获取当前屏幕')
        // 保留原始图像，避免对整屏 PNG 再编码、解码一次。
        session.image = desktop.thumbnail
        session.window = createExtraWindow('capture', {
            ...bounds, frame: false, skipTaskbar: true, autoHideMenuBar: true,
            movable: false, resizable: false, enableLargerThanScreen: true,
            hasShadow: false, alwaysOnTop: true, backgroundColor: '#101820'
        }, 'standalone', null)
        const win = session.window
        if (!win) throw new Error('截图窗口未能创建')
        win.once('closed', () => finishCapture(session))
        win.webContents.once('render-process-gone', () => finishCapture(session, { error: '截图窗口异常退出，请重试' }))
        win.webContents.once('did-fail-load', () => finishCapture(session, { error: '截图页面加载失败，请重试' }))
        win.webContents.once('did-finish-load', () => {
            if (captureSession !== session) return
            // 预览最长边限制在 1920，原图只在主进程保留，保存不降质。
            const { width, height } = session.image.getSize()
            const ratio = Math.min(1, 1920 / Math.max(width, height))
            const preview = ratio < 1 ? session.image.resize({ width: Math.round(width * ratio), height: Math.round(height * ratio) }) : session.image
            win.webContents.send('window:get-capture-pngBuffer', { pngBuffer: preview.toPNG(), imageSize: { width, height } })
        })
        return { ok: true }
    } catch (error) {
        console.error('创建截图失败:', error.message)
        finishCapture(session, { error: '无法打开截图，请检查屏幕录制权限后重试' })
        return { ok: false }
    }
}

ipcMain.on('window:capture-ready', (event) => {
    if (captureSession?.window?.webContents === event.sender) clearTimeout(captureSession.loadTimer)
})

ipcMain.on('window:capture-error', (event) => {
    const session = captureSession
    if (session?.window?.webContents === event.sender) finishCapture(session, { error: '截图预览加载失败，请重试' })
})

ipcMain.on('copy:file', async (e, content, remoteUrl, msgType, fileName) => {
    switch (msgType) {
        case 1: {
            // 文本
            clipboard.writeText(content)
            break
        }
        case 2: {
            // 图片
            const response = await fetch(remoteUrl)
            const buffer = await response.arrayBuffer()
            const uint8Buffer = new Uint8Array(buffer)
            const image = nativeImage.createFromBuffer(uint8Buffer)
            // 复制图片到剪贴板
            clipboard.writeImage(image)
            break
        }
        default: {
            // 其他文件(视频，音频，文件)
            const response = await fetch(remoteUrl)
            const buffer = await response.arrayBuffer()
            const uint8Buffer = new Uint8Array(buffer)
            const savePath = path.join(app.getPath('temp'), fileName)

            fs.writeFileSync(savePath, uint8Buffer)

            console.log(savePath)

            const { exec } = require('child_process')
            const psCommand = `Set-Clipboard -Path "${savePath}"`

            exec(`powershell -command "${psCommand}"`, (error) => {
                if (error) {
                    console.error('复制失败:', error)
                } else {
                    console.log('复制成功，可以粘贴到桌面')
                }
            })

            // windows下不能复制
            // clipboard.write({
            //     text: savePath,
            //     files: [savePath]
            // })

            setTimeout(() => {
                try {
                    // 删除临时文件
                    fs.unlinkSync(savePath);
                    console.log('临时文件已清理：', savePath)
                } catch (err) {
                    console.warn('清理临时文件失败：', err)
                }
            }, 5 * 60 * 1000) // 5分钟后删除
        }
    }
})
