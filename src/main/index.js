import { app, shell, BrowserWindow, ipcMain, Tray, Menu, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Store from 'electron-store'

// 初始化store实例，指定存储文件名（会生成user-token.json文件）
const store = new Store({
  name: 'user-token', // 存储文件名称，避免和其他存储冲突
  fileExtension: 'json', // 文件后缀
  cwd: 'E:\\JavaWeb\\zzz-IM-web\\src\\store' // 存储目录（用自定义路径的目录）
})

let mainWindow = null
let addFriendWindow = null
const login_width = 300
const login_height = 370
const main_width = 1100
const main_height = 700
const register_height = 490
const friendAdd_width = 350
const friendAdd_height = 520

function createMainWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: login_width,
    height: login_height,
    minWidth: login_width,
    minHeight: login_height,
    // 窗口创建后默认不显示
    show: false,
    // 固定窗口大小
    // resizable: false,
    // 隐藏窗口默认的标题栏和边框
    frame: false,
    // 自动隐藏菜单栏
    // autoHideMenuBar: true,
    //始终置顶
    alwaysOnTop: true,
    // 使窗口背景透明（窗口区域会显示桌面或下层窗口的内容）
    // transparent: true,

    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      // 关闭网页安全限制（允许加载本地文件）
      webSecurity: false,
      nodeIntegration: true,
      // 默认上下文隔离开启
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      // 禁用渲染进程的沙箱模式，当设置为false时，渲染进程可以访问完整的Node.js API和系统功能
      // 这在需要在渲染进程中执行系统级操作时很有用，但会降低安全性，默认情况下，Electron 5.0+中sandbox为true以提高安全性
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 控制窗口内 “链接打开行为” 的核心逻辑，作用是：禁止在当前应用内打开新窗口，强制所有外部链接通过系统默认的浏览器打开。
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 基于 electron-vite 命令行界面的渲染器热模块替换（HMR）。开发时加载远程 URL，生产时加载本地 HTML 文件。
  // 开发环境（is.dev 为 true）：加载 process.env['ELECTRON_RENDERER_URL']（通常是本地开发服务器的 URL，如 http://localhost:5173）
  // 配合 Vite 的热模块替换（HMR），修改代码后界面能实时刷新，提升开发效率
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    // 加载打包后的本地 HTML 文件（../renderer/index.html），这是应用打包后实际运行的静态资源，无需依赖开发服务器。
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 窗口加载完成后，发送WS连接指令
  mainWindow.webContents.on('did-finish-load', () => {
    // 向渲染进程发送WS连接指令
    mainWindow.webContents.send('ws:connect')
  })

  ipcMain.on('ws:status', (_, status) => {
    console.log('renderer receive ws status:', status)
  })
}

function createExtraWindow(pagePath, options = {}) {
  const defaultOptions = {
    // 窗口创建后默认不显示
    show: false,
    // 固定窗口大小
    resizable: false,
    // 隐藏窗口默认的标题栏和边框
    frame: false,
    //始终置顶
    alwaysOnTop: true,
    // 使窗口背景透明（窗口区域会显示桌面或下层窗口的内容）
    transparent: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      // 关闭网页安全限制（允许加载本地文件）
      webSecurity: false,
      nodeIntegration: true,
      // 默认上下文隔离开启
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  }
  // 合并，后面的相同的属性会覆盖掉前面的属性
  options = Object.assign(defaultOptions, options)
  const win = new BrowserWindow(options)

  let loadUrl

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    loadUrl = `${process.env['ELECTRON_RENDERER_URL']}#${pagePath}`
    win.loadURL(loadUrl)
  } else {
    // 生产环境打包后只有一个 index.html，通过路由路径定位页面（依赖 Vue Router 的 history 模式或 hash 模式）
    loadUrl = join(__dirname, '../renderer/index.html')
    // 如果用 hash 模式，直接在文件路径后加 # + 页面路径
    loadUrl = `file://${loadUrl}#${pagePath}`
    win.loadURL(loadUrl)
  }

  win.on('ready-to-show', () => {
    win.show()
  })

  // 控制窗口内 “链接打开行为” 的核心逻辑，作用是：禁止在当前应用内打开新窗口，强制所有外部链接通过系统默认的浏览器打开。
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  return win
}

// 当 Electron 完成初始化并准备好创建浏览器窗口时，此方法将被调用。一些 API 仅能在此事件发生后使用。
app.whenReady().then(() => {
  // 用于在Windows系统上为Electron应用设置唯一标识符，确保任务栏、开始菜单等功能能正确识别和显示应用。
  electronApp.setAppUserModelId('com.electron')

  // 用于在Electron应用创建新窗口时，让优化器模块监听该窗口的快捷键事件。
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createMainWindow()

  app.on('activate', function () {
    // 在 macOS 系统上，当点击程序坞图标且没有其他窗口打开时，在应用中重新创建一个窗口是很常见的做法。
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

// 当所有窗口都关闭时退出，但 macOS 除外。在 macOS 上，应用程序及其菜单栏通常会保持活跃状态，直到用户通过 Cmd + Q 明确退出。
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('window:type', (e, windowType) => {
  if (windowType === 'login') {
    mainWindow.setSize(login_width, login_height)
    mainWindow.center()
    mainWindow.setMinimumSize(login_width, login_height)
  } else if (windowType === 'main') {
    mainWindow.setSize(main_width, main_height)
    mainWindow.center()
    mainWindow.setResizable(true)
    mainWindow.setMinimumSize(main_width, main_height)
  } else if (windowType === 'register') {
    mainWindow.setSize(login_width, register_height)
    mainWindow.center()
    mainWindow.setMinimumSize(login_width, register_height)
  }
})

async function handleFileOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    // openFile 允许用户选择单个文件
    properties: ['openFile']
  })
  if (!canceled) {
    return filePaths[0]
  } else {
    return null
  }
}

// 从本地选择头像
ipcMain.handle('select-avatar', handleFileOpen)

ipcMain.handle('store-set-token', (e, token) => {
  store.set('token', token)
  return true
})

ipcMain.handle('store-get-token', (e) => {
  return store.get('token')
})

ipcMain.handle('store-set-avatar', (e, avatar) => {
  store.set('avatar', avatar)
  return true
})

ipcMain.handle('store-get-avatar', (e) => {
  return store.get('avatar')
})

ipcMain.handle('store-set-userId', (e, userId) => {
  store.set('userId', userId)
  return true
})

ipcMain.handle('store-get-user-id', (e, userId) => {
  return store.get('userId')
})

function createNewWindow(windowType) {
  if (windowType === 'addFriend') {
    const options = {
      width: friendAdd_width,
      height: friendAdd_height
    }
    addFriendWindow = createExtraWindow('/friendAdd', options)
  }
}

ipcMain.on('create-new-window', (e, windowType) => {
  createNewWindow(windowType)
})

ipcMain.on('ws:send', (event, { messageType, sequenceId, data }) => {
  // 把消息广播给主窗口
  if (mainWindow) {
    mainWindow.webContents.send('ws:forward', { messageType, sequenceId, data })
  }
})
