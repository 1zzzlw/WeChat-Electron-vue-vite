import { ipcMain, BrowserWindow, nativeTheme } from 'electron'
import { store } from '../shared.js'

let theme = store.get('appearanceTheme') === 'dark' ? 'dark' : 'light'

export function initializeTheme() {
    nativeTheme.themeSource = theme
}

export function applyWindowTheme(window) {
    window.setBackgroundColor(theme === 'dark' ? '#162d40' : '#9bbdd5')
}

ipcMain.on('theme:initial', event => { event.returnValue = theme })
ipcMain.handle('theme:get', () => theme)
ipcMain.handle('theme:set', (event, value) => {
    if (value !== 'light' && value !== 'dark') throw new Error('无效的主题')
    const route = event.sender.getURL().split('#')[1]?.split('?')[0]
    if (!['/messageList', '/list', '/collectList'].includes(route)) {
        throw new Error('请在介绍界面切换主题')
    }
    store.set('appearanceTheme', value)
    theme = value
    nativeTheme.themeSource = value
    for (const window of BrowserWindow.getAllWindows()) {
        if (window.isDestroyed()) continue
        applyWindowTheme(window)
        window.webContents.send('theme:changed', value)
    }
    return theme
})
