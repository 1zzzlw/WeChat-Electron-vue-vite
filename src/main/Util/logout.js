import { BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { store, refs } from '../shared.js'
import websocket from '../websocket.js'
import { finishLoadingWindow } from '../IPC/initDataIPC.js'

let loggingOut = false

export async function logout() {
    const window = refs.mainWindow
    if (loggingOut || !window || window.isDestroyed()) return
    loggingOut = true
    try {
        for (const key of ['token', 'accessToken', 'userId']) store.delete(key)
        websocket.disconnect()
        finishLoadingWindow()
        const { cancelAllUploads } = await import('../File/fileUpload.js')
        cancelAllUploads()
        for (const child of BrowserWindow.getAllWindows()) {
            if (child !== window && !child.isDestroyed()) child.destroy()
        }
        window.hide()
        await window.webContents.executeJavaScript("localStorage.removeItem('token')")
        // 先结束旧页面的请求与 IPC，再删除凭证，防止迟到的刷新请求恢复登录。
        await window.loadURL('about:blank')
        for (const key of ['token', 'accessToken', 'userId', 'username', 'avatar', 'phone', 'account', 'email', 'birthday', 'gender', 'address']) store.delete(key)
        websocket.disconnect()
        window.setMinimumSize(0, 0)
        if (window.isMaximized()) window.unmaximize()
        window.setResizable(true)
        window.setSize(400, 580)
        window.center()
        window.setResizable(false)
        if (is.dev && process.env.ELECTRON_RENDERER_URL) {
            await window.loadURL(process.env.ELECTRON_RENDERER_URL + '#/login')
        } else {
            await window.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/login' })
        }
        await window.webContents.executeJavaScript("localStorage.removeItem('token')")
        window.show()
        window.focus()
    } finally {
        loggingOut = false
        if (!window.isDestroyed()) window.show()
    }
}
