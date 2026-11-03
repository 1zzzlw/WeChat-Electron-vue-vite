import { refs, getTrayIcon, getIconPath } from './shared.js'
import {
  app,
  shell,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { loadDeferredIPC } from './IPC/index.js'
import { initTable, initTableColumnsMap, close as closeDB } from './DB/mainDB.js'
import websocket from './websocket.js'
import { initializeTheme, applyWindowTheme } from './Util/theme.js'
import { logout } from './Util/logout.js'

// 向后兼容：重导出供未迁移的模块使用
export { store, refs, getIconPath, getTrayIcon, getEmptyTrayIcon } from './shared.js'

const login_width = 400
const login_height = 580

app.setAppUserModelId('com.lumina.agent')

function createMainWindow() {
  const iconPath = getIconPath()

  const win = new BrowserWindow({
    icon: iconPath,
    width: login_width,
    height: login_height,
    minWidth: login_width,
    minHeight: login_height,
    show: false,
    resizable: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#d6eaf8',
    ...(process.platform === 'linux' ? { icon: iconPath } : {}),
    webPreferences: {
      autoplayPolicy: 'no-user-gesture-required',
      webSecurity: false,
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 设置共享引用
  refs.mainWindow = win

  win.on('ready-to-show', () => {
    win.show()
    win.setTitle('Lumina · 微光')

    const { session } = win.webContents
    session.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['Origin'] = 'http://localhost:5173'
      details.requestHeaders['Referer'] = 'http://localhost:5173/'
      callback({ requestHeaders: details.requestHeaders })
    })
  })

  win.on('system-context-menu', (event) => {
    event.preventDefault()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray() {
  const template = [
    { label: '退出登录', click: () => { void logout().catch(error => console.error('退出登录失败', error)) } },
    {
      label: '退出应用',
      click: () => {
        refs.mainWindow?.destroy()
        app.quit()
      }
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  const trayInstance = new Tray(getTrayIcon())
  trayInstance.setToolTip('Lumina · 微光')
  trayInstance.setContextMenu(menu)
  trayInstance.on('click', () => {
    refs.mainWindow?.show()
  })

  refs.tray = trayInstance
}

app.whenReady().then(() => {
  initializeTheme()
  electronApp.setAppUserModelId('com.lumina.agent')

  app.on('browser-window-created', (_, window) => {
    applyWindowTheme(window)
    window.setIcon(getIconPath())
    if (process.platform === 'win32') window.setAppDetails({ appId: 'com.lumina.agent', appIconPath: getIconPath(), appIconIndex: 0 })
    optimizer.watchWindowShortcuts(window)
  })

  Menu.setApplicationMenu(null)

  createMainWindow()
  createTray()

  setImmediate(() => {
    initTable()
    initTableColumnsMap()
    loadDeferredIPC()
  })

  if (is.dev) {
    globalShortcut.register('F12', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      if (focusedWindow) {
        focusedWindow.webContents.toggleDevTools()
      }
    })

    globalShortcut.register('CommandOrControl+Shift+I', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      if (focusedWindow) {
        focusedWindow.webContents.toggleDevTools()
      }
    })
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (websocket && websocket.ws && websocket.ws.websocket) {
    try {
      websocket.ws.websocket.close()
      websocket.stopHeartbeat()
    } catch (e) { /* ignore */ }
  }
  closeDB()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
