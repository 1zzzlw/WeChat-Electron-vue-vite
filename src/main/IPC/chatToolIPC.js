import { ipcMain, globalShortcut, app, clipboard, nativeImage } from "electron"
import { mainWindow } from '../index'
import { createExtraWindow, windowPool } from "../Util/createNewWindow"
const path = require('path')
const fs = require('fs');

let captureWindow = null

ipcMain.on('window:capture-open', async (e) => {
    // 隐藏主窗口
    mainWindow.hide()

    await createCaptureWindow()
})

ipcMain.on('window:close-capture', () => {
    if (captureWindow) {
        windowPool.delete('capture')
        captureWindow.close()
        captureWindow = null
    }
    mainWindow.show()
})

ipcMain.on('window:save-capture', (e, uint8Array) => {
    console.info(uint8Array)
    const buffer = Buffer.from(uint8Array);
    const image = nativeImage.createFromBuffer(buffer)
    // 复制图片到剪贴板
    clipboard.writeImage(image)
    // // 保存图片到指定路径
    const fileName = `screenshot_${Date.now()}.png`
    const savePath = path.join(app.getPath('pictures'), fileName)
    fs.writeFileSync(savePath, buffer);

    windowPool.delete('capture')
    captureWindow.close()

    if (mainWindow) {
        mainWindow.webContents.send('capture:image', savePath)
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
        mainWindow.show()

        // 注销全局快捷键
        globalShortcut.unregister('Esc')
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