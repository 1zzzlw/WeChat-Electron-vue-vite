import { ipcMain, globalShortcut, app, clipboard, nativeImage, BrowserWindow } from "electron"
import { refs } from '../shared.js'
import { createExtraWindow, windowPool } from "../Util/createNewWindow"
const crypto = require('crypto')
const path = require('path')
const fs = require('fs');

let captureWindow = null
// 记录触发截屏的窗口，用于截屏结束后恢复显示和回传图片
let captureSourceWindow = null

/**
 * 安全关闭截屏窗口（防止重复关闭导致崩溃）
 */
const closeCaptureWindow = () => {
    if (captureWindow && !captureWindow.isDestroyed()) {
        windowPool.delete('capture')
        captureWindow.close()
    }
    captureWindow = null
    // 恢复触发截屏的窗口显示
    if (captureSourceWindow && !captureSourceWindow.isDestroyed()) {
        captureSourceWindow.show()
    }
    captureSourceWindow = null
}

ipcMain.on('window:capture-open', async (e) => {
    // 找到触发截屏的窗口并隐藏
    const senderWindow = BrowserWindow.fromWebContents(e.sender)
    if (senderWindow) {
        captureSourceWindow = senderWindow
        senderWindow.hide()
    } else {
        // fallback：隐藏主窗口
        refs.mainWindow.hide()
        captureSourceWindow = refs.mainWindow
    }

    await createCaptureWindow()
})

ipcMain.on('window:close-capture', () => {
    closeCaptureWindow()
})

ipcMain.on('window:save-capture', (e, uint8Array) => {
    console.info(uint8Array)
    const buffer = Buffer.from(uint8Array);
    const image = nativeImage.createFromBuffer(buffer)
    // 复制图片到剪贴板
    clipboard.writeImage(image)
    // 保存图片到指定路径
    const fileName = `screenshot_${Date.now()}.png`
    const savePath = path.join(app.getPath('pictures'), fileName)
    fs.writeFileSync(savePath, buffer);

    // 获取文件信息
    const stats = fs.statSync(savePath);
    const fileId = crypto.randomUUID(); // 生成唯一文件ID

    // 生成base64预览（可以适当缩小尺寸以减少数据量）
    let base64Preview = '';
    try {
        // 创建缩略图用于预览（原图可能太大）
        const previewImage = nativeImage.createFromBuffer(buffer);
        // 缩放到合适大小，例如最大宽度300px
        const { width, height } = previewImage.getSize();
        const maxWidth = 300;
        let resizeWidth = width;
        let resizeHeight = height;

        if (width > maxWidth) {
            resizeWidth = maxWidth;
            resizeHeight = Math.round((height * maxWidth) / width);
            const resizedImage = previewImage.resize({ width: resizeWidth, height: resizeHeight });
            base64Preview = resizedImage.toDataURL();
        } else {
            base64Preview = previewImage.toDataURL();
        }
    } catch (error) {
        console.error('生成base64预览失败:', error);
        // 如果生成失败，使用一个占位符
        base64Preview = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }

    // 先保存目标窗口引用，再关闭截屏窗口（closeCaptureWindow 会清除 captureSourceWindow）
    const targetWindow = captureSourceWindow || refs.mainWindow

    // 关闭截屏窗口（统一入口，不再重复调用）
    closeCaptureWindow()

    // 将截屏图片发送回触发截屏的窗口
    if (targetWindow && !targetWindow.isDestroyed()) {
        // 发送完整的文件信息对象
        targetWindow.webContents.send('capture:image', {
            fileId,           // 唯一文件ID
            fileName,         // 文件名，如 "screenshot_1700000000000.png"
            fileSize: stats.size, // 文件大小（字节）
            fileType: 'image/png', // 文件类型
            content: '',      // 文本内容为空
            base64: base64Preview, // base64预览图
            localPath: savePath, // 本地保存路径
            remotePath: '',   // 远程路径（上传后填充）
        })
    }
})

export async function createCaptureWindow() {
    const { screen, desktopCapturer } = require('electron')
    // 获取主屏幕的宽度和高度和缩放因子
    const {
        bounds: { width, height },
        scaleFactor
    } = screen.getPrimaryDisplay()
    console.info(width, height, scaleFactor)

    const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
            width: Math.round(width * scaleFactor),
            height: Math.round(height * scaleFactor)
        }
    })

    //选择第一个屏幕，转为base64的缩略图
    const pngBuffer = sources[0].thumbnail.toPNG()

    const options = {
        // 全屏窗口
        fullscreen: true,
        // 窗口无标题栏
        frame: false,
        // 窗口透明
        transparent: true,
        // 窗口不在任务栏显示
        skipTaskbar: true,
        // 窗口无菜单栏
        autoHideMenuBar: true,
        // 窗口不可移动
        movable: false,
        // 窗口不可调整大小
        resizable: false,
        // 窗口可超出屏幕边界
        enableLargerThanScreen: true,
        // 窗口无阴影
        hasShadow: false,
        show: false
    }

    //截屏窗口
    captureWindow = createExtraWindow('capture', options, 'standalone', null)

    // 等待页面加载完成后再发送数据
    captureWindow.webContents.on('did-finish-load', () => {
        captureWindow.webContents.send('window:get-capture-pngBuffer', {
            pngBuffer,
            scaleFactor
        });
    });

    captureWindow.on('show', () => {
        // 注册全局快捷键
        globalShortcut.register('Esc', () => {
            captureWindow.close()
        })
    })

    captureWindow.on('close', () => {
        // 注销全局快捷键
        globalShortcut.unregister('Esc')
        captureWindow = null
    })
}

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