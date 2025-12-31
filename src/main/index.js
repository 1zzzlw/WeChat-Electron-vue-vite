import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  dialog,
  globalShortcut,
  screen,
  desktopCapturer,
  nativeImage,
  clipboard
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Store from 'electron-store'
import dayjs from 'dayjs'
import fs from 'fs'

// 初始化store实例，指定存储文件名（会生成user-token.json文件）
const store = new Store({
  name: 'user-token', // 存储文件名称，避免和其他存储冲突
  fileExtension: 'json', // 文件后缀
  cwd: 'E:\\JavaWeb\\zzz-IM-web\\src\\store' // 存储目录（用自定义路径的目录）
})

let mainWindow = null
let addFriendWindow = null
let createGroupWindow = null
let settingViewWindow = null
let captureWindow = null
let tray = null
const login_width = 300
const login_height = 370
const main_width = 1100
const main_height = 700
const register_height = 490
const friendAdd_width = 350
const friendAdd_height = 520
const createGroup_width = 820
const createGroup_height = 620
const settingView_width = 800
const settingView_height = 650

// 注册快捷键统一放在这个方法里面
function registerShortcuts() {
  globalShortcut.register('Alt+Shift+A', () => {
    mainWindow.hide()
    createCaptureWindow()
  })
}

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
    registerShortcuts()
    mainWindow.setTitle('EasyChat')
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
  const trayIconPath = 'src\\renderer\\src\\assets\\image\\weixinOnline.ico'
  tray = new Tray(trayIconPath)
  tray.setToolTip('IM 客户端')
  tray.setContextMenu(menu)

  tray.on('click', () => {
    mainWindow.show()
  })
}

function createExtraWindow(pagePath, options = {}, isCapture = false) {
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

  if (isCapture) {
    let capturePath
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      capturePath = 'out/renderer/capture.html'
      console.log(`Capture: ${capturePath}`)
    } else {
      capturePath = 'out/renderer/capture.html'
      console.log(`Capture: ${capturePath}`)
    }
    win.loadFile(capturePath)
  } else {
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
  }

  win.on('ready-to-show', () => {
    win.show()
    win.setTitle('EasyChat')
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

ipcMain.on('window:type', (e, windowType) => {
  if (windowType === 'login') {
    console.log('LOGIN')
    // 取消窗口最小限制
    mainWindow.setMinimumSize(0, 0)
    mainWindow.setResizable(true)
    mainWindow.setSize(login_width, login_height)
    mainWindow.center()
    mainWindow.setResizable(false)
    // mainWindow.setMinimumSize(login_width, login_height)
  } else if (windowType === 'main') {
    console.log('MAIN')
    mainWindow.setSize(main_width, main_height)
    mainWindow.center()
    mainWindow.setResizable(true)
    mainWindow.setMinimumSize(main_width, main_height)
  } else if (windowType === 'register') {
    console.log('REGISTER')
    mainWindow.setSize(login_width, register_height)
    mainWindow.center()
    // mainWindow.setMinimumSize(login_width, register_height)
  }
})

ipcMain.on('window:controls', (e, controlType, value) => {
  switch (controlType) {
    case 'setTop':
      if (value) {
        mainWindow.setAlwaysOnTop(true)
      } else {
        mainWindow.setAlwaysOnTop(false)
      }
      break
    case 'miniWindow':
      mainWindow.hide()
      break
    case 'changeScreen':
      if (value) {
        mainWindow.maximize()
      } else {
        mainWindow.unmaximize()
      }
      break
    case 'closeWindow':
      mainWindow.close()
      break
  }
})

// 从本地选择文件或目录
ipcMain.handle('select-file', async (e, file) => {
  let dialogConfig = {}
  switch (file) {
    case 'avatar':
      dialogConfig = {
        properties: ['openFile'],
        // 限制仅能选择图片文件，避免选到其他类型
        filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
      }
      break
    case 'storeLocation':
      dialogConfig = {
        properties: ['openDirectory']
      }
      break
  }
  const { canceled, filePaths } = await dialog.showOpenDialog(dialogConfig)
  return canceled ? null : filePaths[0]
})

ipcMain.handle('window:setUserInfo', (e, userInfoType, userInfo) => {
  console.log(userInfoType)
  console.info('设置用户信息', userInfoType, userInfo)
  switch (userInfoType) {
    case 'token':
      store.set('token', userInfo)
      break
    case 'avatar':
      store.set('avatar', userInfo)
      break
    case 'userId':
      store.set('userId', userInfo)
      break
    case 'storeLocation':
      store.set('storeLocation', userInfo)
      break
  }
  return true
})

ipcMain.handle('window:getUserInfo', (e, userInfoType) => {
  switch (userInfoType) {
    case 'token':
      return store.get('token')
    case 'avatar':
      return store.get('avatar')
    case 'userId':
      return store.get('userId')
    case 'storeLocation':
      return store.get('storeLocation')
  }
})

function createNewWindow(windowType) {
  switch (windowType) {
    case 'addFriend': {
      const options = {
        width: friendAdd_width,
        height: friendAdd_height
      }
      addFriendWindow = createExtraWindow('/friendAdd', options)
      break
    }
    case 'createGroup': {
      const options = {
        width: createGroup_width,
        height: createGroup_height
      }
      createGroupWindow = createExtraWindow('/createGroup', options)
      break
    }
    case 'settingView': {
      const options = {
        width: settingView_width,
        height: settingView_height
      }
      settingViewWindow = createExtraWindow('/setting', options)
      break
    }
  }
}

// 关闭新窗口
function destroyNewWindow(windowType) {
  if (windowType === 'addFriend') {
    if (addFriendWindow) {
      addFriendWindow.close()
      addFriendWindow = null
    }
  } else if (windowType === 'createGroup') {
    if (createGroupWindow) {
      createGroupWindow.close()
      createGroupWindow = null
    }
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

async function createCaptureWindow() {
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
  captureWindow = createExtraWindow(null, options, true)

  captureWindow.on('show', () => {
    // 窗口显示后，把图片的base64字符串发送给渲染进程
    captureWindow.webContents.send('window:get-capture-pngBuffer', {
      pngBuffer,
      scaleFactor
    })

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

ipcMain.on('window:capture-open', (e) => {
  mainWindow.hide()
  createCaptureWindow()
})

function writeToFile(savePath, data) {
  const fs = require('fs')
  // 判断传入的是Base64字符串还是Buffer
  if (typeof data === 'string' && data.startsWith('data:image/')) {
    // 1. 剔除Base64头部，提取纯编码数据
    const base64Data = data.replace(/^data:image\/\w+;base64,/, '')
    // 2. 转换为二进制Buffer
    const buffer = Buffer.from(base64Data, 'base64')
    // 3. 写入Buffer
    fs.writeFile(savePath, buffer, (err) => {
      if (err) throw err
      console.info('图片已保存到', savePath)
    })
  } else if (data instanceof Buffer) {
    // 若传入的是Buffer，直接写入
    fs.writeFile(savePath, data, (err) => {
      if (err) throw err
      console.info('图片已保存到', savePath)
    })
  } else {
    console.error('传入的数据不是Base64字符串或Buffer')
  }
}

ipcMain.on('window:save-capture', (e, data) => {
  const { nativeImage, clipboard } = require('electron')
  console.info(data)
  const image = nativeImage.createFromDataURL(data)
  // 复制图片到剪贴板
  clipboard.writeImage(image)
  // 保存图片到指定路径
  const fileName = `screenshot_${Date.now()}.png`
  const savePath = 'E:\\JavaWeb\\zzz-IM-web\\imageScreen\\' + fileName
  writeToFile(savePath, data)

  captureWindow.close()

  if (mainWindow) {
    mainWindow.webContents.send('capture:image', savePath)
  }
})

ipcMain.on('window:close-capture', () => {
  if (captureWindow) {
    captureWindow.close()
    captureWindow = null
  }
  mainWindow.show()
})

ipcMain.handle('window:create-file', async (e, arrayBuffer, fileName) => {
  const fs = require('fs').promises
  // 获得当前时间
  const currentTime = dayjs().format('YYYY-MM-DD')
  // 获得存储文件路径
  const savePath = store.get('storeLocation') + '\\' + currentTime
  // 根据当前日期创建文件夹
  await fs.mkdir(savePath, { recursive: true })
  console.info('文件夹创建成功:', savePath)
  // 获得文件名
  const buffer = Buffer.from(arrayBuffer)
  // 文件路径
  const filePath = savePath + '\\' + fileName
  // 根据文件信息复制文件
  await fs.writeFile(filePath, buffer)
  console.info('文件创建成功:', filePath)
  return filePath
})
