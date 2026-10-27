import { refs } from '../shared.js'
import { ipcMain, app, globalShortcut } from 'electron'
import { windowPool } from '../Util/createNewWindow'
import websocket from '../websocket'
import { createCaptureWindow } from './chatToolIPC';
import { finishLoadingWindow } from './initDataIPC';
import os from 'os'

let shortcutsRegistered = false

const login_width = 300
const login_height = 370
const main_width = 1100
const main_height = 700
const register_height = 490

// 控制窗口相关操作
ipcMain.on('window:controls', (e, windowType, controlType, value) => {
  let window = windowPool.get(windowType)
  if (windowType === 'mainWindow' || window === undefined) {
    window = refs.mainWindow
  }
  switch (controlType) {
    case 'setTop':
      if (value) {
        window.setAlwaysOnTop(true)
      } else {
        window.setAlwaysOnTop(false)
      }
      break
    case 'miniWindow':
      window.minimize()
      break
    case 'changeScreen':
      if (value) {
        window.maximize()
      } else {
        window.unmaximize()
      }
      break
    case 'closeWindow':
      if (window === refs.mainWindow) {
        refs.mainWindow.destroy()
        app.quit()
      } else {
        // 子窗口：从池中移除并关闭
        windowPool.delete(windowType)
        window.close()
      }
      break
  }
})

// 窗口类型切换
ipcMain.on('window:type', async (e, windowType) => {
  if (windowType === 'login') {
    // 取消窗口最小限制
    refs.mainWindow.setMinimumSize(0, 0)
    // 开启窗口尺寸改变
    refs.mainWindow.setResizable(true)
    refs.mainWindow.setSize(login_width, login_height)
    refs.mainWindow.center()
    // 关闭窗口尺寸改变
    refs.mainWindow.setResizable(false)
  } else if (windowType === 'main') {
    await enterMain()
  } else if (windowType === 'register') {
    refs.mainWindow.setSize(login_width, register_height)
    refs.mainWindow.center()
  }
})

// 进入main窗口
const enterMain = async () => {
  const window = refs.mainWindow
  if (!window || window.isDestroyed()) return
  // 进入Main窗口
  window.setSize(main_width, main_height)
  window.center()
  // 开启窗口尺寸改变
  window.setResizable(true)
  window.setMinimumSize(main_width, main_height)
  // 隐藏窗口的合成可能不返回，不能让截图成为进入主界面的无限等待条件。
  const backgroundThrottling = window.webContents.getBackgroundThrottling()
  let paintTimer
  try {
    window.webContents.setBackgroundThrottling(false)
    await Promise.race([
      window.webContents.capturePage(undefined, { stayHidden: true }),
      new Promise(resolve => {
        paintTimer = setTimeout(() => {
          console.warn('主界面绘制确认超时，继续进入聊天')
          resolve()
        }, 500)
      })
    ])
  } catch (error) {
    console.warn('主界面首次绘制确认失败:', error)
  } finally {
    clearTimeout(paintTimer)
    if (!window.isDestroyed()) window.webContents.setBackgroundThrottling(backgroundThrottling)
  }
  if (window.isDestroyed()) return
  // 先交接可用界面，连接或同步不应阻止窗口显示。
  window.show()
  finishLoadingWindow()
  websocket.connect()
}

// 更新窗口壁纸
ipcMain.on('send:wallpaper', (e, imagePath) => {
  refs.mainWindow.webContents.send('on:wallpaper', imagePath)
})

// 注册快捷键统一放在这个方法里面
function registerShortcuts() {
  if (shortcutsRegistered) {
    console.log('快捷键已注册，跳过')
    return
  }

  globalShortcut.register('Alt+Shift+A', () => {
    createCaptureWindow()
  })

  shortcutsRegistered = true
  console.log('快捷键注册成功')
}

ipcMain.on('register-shortcuts', () => {
  console.log('开始注册快捷键')
  registerShortcuts()
})

ipcMain.handle('window:info', () => {
  const osInfo = {
    // Windows_NT (Windows) / Linux (macOS/Linux)
    osType: os.type(),
    // win32 / darwin (macOS) / linux
    platform: os.platform(),
    // OS version number
    osVersion: os.release(),
    // x64 / arm64 etc.
    cpuArchitecture: os.arch(),
  }

  const cpuInfo = {
    cpuCores: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    cpuSpeed: os.cpus()[0]?.speed != null ? `${os.cpus()[0].speed} MHz` : 'Unknown',
  }

  const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2)
  const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2)
  const memInfo = {
    totalMemory: `${totalMem} GB`,
    freeMemory: `${freeMem} GB`,
    memoryUsage: `${((1 - freeMem / totalMem) * 100).toFixed(2)}%`,
  }

  const hostInfo = {
    hostname: os.hostname(),
    userHomeDir: os.homedir(),
    systemUptime: new Date(os.uptime() * 1000).toISOString().substring(11, 19) + ' hours',
  }

  return {
    operatingSystemInfo: osInfo,
    cpuInformation: cpuInfo,
    memoryInformation: memInfo,
    hostInformation: hostInfo,
  }
})

export {
  enterMain
}
