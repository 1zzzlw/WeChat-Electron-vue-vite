import {
  app,
  shell,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  Notification
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Store from 'electron-store'
import './IPC/userInfoStoreIPC.js'
import './IPC/windowToolIPC.js'
import './IPC/newWindowIPC.js'
import './IPC/DBIPC.js'
import './IPC/initDataIPC.js'
import './IPC/updateNewDataIPC.js'
import './IPC/uploadFileIPC.js'
import './IPC/websocketIPC.js'
import './IPC/mediaHandleIPC.js'
import './IPC/piniaStoreIPC.js'
import { initTable, initTableColumnsMap } from './DB/mainDB.js'

// 初始化store实例，指定存储文件名（会生成user-token.json文件）
export const store = new Store({
  name: 'user-token', // 存储文件名称，避免和其他存储冲突
  fileExtension: 'json', // 文件后缀
  // cwd: join(__dirname, '../store/user-token.json') // 存储目录（用自定义路径的目录）
  cwd: join(app.getPath('userData'), 'store') // 使用用户数据目录
})

export let mainWindow = null
let tray = null
const login_width = 300
const login_height = 370

app.setAppUserModelId('com.easychat.im')

function createMainWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    icon: icon,
    width: login_width,
    height: login_height,
    minWidth: login_width,
    minHeight: login_height,
    // 窗口创建后默认不显示
    show: false,
    // 固定窗口大小
    resizable: false,
    // 隐藏窗口默认的标题栏和边框
    frame: false,
    // 自动隐藏菜单栏
    autoHideMenuBar: true,
    //始终置顶
    // alwaysOnTop: true,
    // 使窗口背景透明（窗口区域会显示桌面或下层窗口的内容）
    // transparent: true,
    backgroundColor: '#00000000',
    opacity: 0.98,
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
    mainWindow.setTitle('EasyChat')
  })

  // 禁用右键事件
  mainWindow.on('system-context-menu', (event) => {
    event.preventDefault()
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

}

function createTray() {
  const template = [
    {
      label: '退出登录'
    },
    {
      label: '退出应用',
      click: () => {
        // 先销毁主窗口才能完全退出
        mainWindow.destroy()
        app.quit()
      }
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  // 创建托盘并设置图标
  tray = new Tray(icon)
  tray.setToolTip('IM 客户端')
  tray.setContextMenu(menu)

  tray.on('click', () => {
    mainWindow.show()
  })
}

// 当 Electron 完成初始化并准备好创建浏览器窗口时，此方法将被调用。一些 API 仅能在此事件发生后使用。
app.whenReady().then(() => {
  // 用于在Windows系统上为Electron应用设置唯一标识符，确保任务栏、开始菜单等功能能正确识别和显示应用。
  electronApp.setAppUserModelId('com.easychat.im')

  // 用于在Electron应用创建新窗口时，让优化器模块监听该窗口的快捷键事件。
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 禁用一些快捷键 比如强制刷新，F11全屏
  Menu.setApplicationMenu(null)

  initTable()

  initTableColumnsMap()

  createMainWindow()

  createTray()

  app.on('activate', function () {
    // 在 macOS 系统上，当点击程序坞图标且没有其他窗口打开时，在应用中重新创建一个窗口是很常见的做法。
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

// 退出时注销全局快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// 当所有窗口都关闭时退出，但 macOS 除外。在 macOS 上，应用程序及其菜单栏通常会保持活跃状态，直到用户通过 Cmd + Q 明确退出。
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})