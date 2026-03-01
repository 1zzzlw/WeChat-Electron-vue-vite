import { ipcMain, globalShortcut, app } from "electron";
import { mainWindow } from '../index'
import { createExtraWindow, windowPool } from "../Util/createNewWindow";
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
    const { nativeImage, clipboard } = require('electron')
    console.info(uint8Array)
    const buffer = Buffer.from(uint8Array);
    const image = nativeImage.createFromBuffer(buffer)
    // 复制图片到剪贴板
    clipboard.writeImage(image)
    // // 保存图片到指定路径
    const fileName = `screenshot_${Date.now()}.png`
    const savePath = app.getPath('pictures') + '\\' + fileName
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