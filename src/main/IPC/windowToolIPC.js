import { store, mainWindow } from '../index'
import { dialog, ipcMain } from 'electron'
import { isExistUserRecord } from '../DB/select'
import { createExtraWindow } from '../Util/createNewWindow'
import { initInsert } from '../DB/insert'
import { initAndUpdateUserLoginRecord } from '../DB/mainDB'

const login_width = 300
const login_height = 370
const main_width = 1100
const main_height = 700
const register_height = 490

// 控制窗口相关操作
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
  mainWindow.show()
}

export {
  enterMain
}