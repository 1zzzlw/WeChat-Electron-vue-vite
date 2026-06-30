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
import { refs, getTrayIcon } from './shared.js'

// 向后兼容：重导出供未迁移的模块使用
export { store, refs, getIconPath, getTrayIcon, getEmptyTrayIcon } from './shared.js'

const login_width = 300
const login_height = 370

app.setAppUserModelId('com.easychat.im')

function createMainWindow() {
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../resources/icon.png')

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
    backgroundColor: '#1a1a2e',
    opacity: 0.98,
    ...(process.platform === 'linux' ? { icon: iconPath } : {}),
    webPreferences: {
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
    win.setTitle('EasyChat')

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
    { label: '退出登录' },
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
  trayInstance.setToolTip('IM 客户端')
  trayInstance.setContextMenu(menu)
  trayInstance.on('click', () => {
    refs.mainWindow?.show()
  })

  refs.tray = trayInstance
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.easychat.im')

  app.on('browser-window-created', (_, window) => {
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
