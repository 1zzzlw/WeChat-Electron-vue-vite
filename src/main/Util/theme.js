import { ipcMain, BrowserWindow, nativeTheme } from 'electron'
import { store } from '../shared.js'

let theme = store.get('appearanceTheme') === 'dark' ? 'dark' : 'light'
let uiStyle = store.get('appearanceStyle') === 'swiss' ? 'swiss' : 'ai-native'

export function initializeTheme() {
    nativeTheme.themeSource = theme
}

export function applyWindowTheme(window) {
    const backgrounds = uiStyle === 'swiss'
        ? { light: '#f5f5f3', dark: '#141414' }
        : { light: '#f7f7fb', dark: '#14141c' }
    window.setBackgroundColor(backgrounds[theme])
}

function assertAppearanceRoute(event) {
    const route = event.sender.getURL().split('#')[1]?.split('?')[0]
    if (!['/messageList', '/list', '/collectList', '/account'].includes(route)) {
        throw new Error('请在外观设置或介绍界面切换外观')
    }
}

function broadcast(channel, value) {
    for (const window of BrowserWindow.getAllWindows()) {
        if (window.isDestroyed()) continue
        applyWindowTheme(window)
        window.webContents.send(channel, value)
    }
}

ipcMain.on('theme:initial', event => { event.returnValue = theme })
ipcMain.on('style:initial', event => { event.returnValue = uiStyle })
ipcMain.handle('theme:get', () => theme)
ipcMain.handle('theme:set', (event, value) => {
    if (value !== 'light' && value !== 'dark') throw new Error('无效的主题')
    assertAppearanceRoute(event)
    store.set('appearanceTheme', value)
    theme = value
    nativeTheme.themeSource = value
    broadcast('theme:changed', value)
    return theme
})

ipcMain.handle('style:get', () => uiStyle)
ipcMain.handle('style:set', (event, value) => {
    if (value !== 'ai-native' && value !== 'swiss') throw new Error('无效的界面风格')
    assertAppearanceRoute(event)
    store.set('appearanceStyle', value)
    uiStyle = value
    broadcast('style:changed', value)
    return uiStyle
})
