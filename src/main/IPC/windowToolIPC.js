import { mainWindow } from '../index'
import { ipcMain, app, globalShortcut } from 'electron'
import { windowPool } from '../Util/createNewWindow'
import websocket from '../websocket'
import { createCaptureWindow } from './chatToolIPC';

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
    window = mainWindow
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
      if (window === mainWindow) {
        mainWindow.destroy()
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
    mainWindow.setMinimumSize(0, 0)
    // 开启窗口尺寸改变
    mainWindow.setResizable(true)
    mainWindow.setSize(login_width, login_height)
    mainWindow.center()
    // 关闭窗口尺寸改变
    mainWindow.setResizable(false)
  } else if (windowType === 'main') {
    enterMain()
  } else if (windowType === 'register') {
    mainWindow.setSize(login_width, register_height)
    mainWindow.center()
  }
})

// 进入main窗口
const enterMain = () => {
  // 进入Main窗口
  mainWindow.setSize(main_width, main_height)
  mainWindow.center()
  // 开启窗口尺寸改变
  mainWindow.setResizable(true)
  mainWindow.setMinimumSize(main_width, main_height)
  // 建立ws连接
  websocket.connect()
  mainWindow.show()
}

// 更新窗口壁纸
ipcMain.on('send:wallpaper', (e, imagePath) => {
  mainWindow.webContents.send('on:wallpaper', imagePath)
})

// 注册快捷键统一放在这个方法里面
function registerShortcuts() {
  if (shortcutsRegistered) {
    console.log('快捷键已注册，跳过')
    return
  }

  globalShortcut.register('Alt+Shift+A', () => {
    mainWindow.hide()
    createCaptureWindow()
  })

  shortcutsRegistered = true
  console.log('快捷键注册成功')
}

ipcMain.on('register-shortcuts', () => {
  console.log('开始注册快捷键')
  registerShortcuts()
})

export {
  enterMain
}