import { mainWindow } from '../index'
import { store } from '../index'
import { dialog, ipcMain } from 'electron'
import { isExistUserRecord } from '../DB/select'
import { createExtraWindow } from '../Util/createNewWindow'

let loadingWindow = null

const login_width = 300
const login_height = 370
const main_width = 1100
const main_height = 700
const register_height = 490
const loading_width = 800
const loading_height = 600

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
ipcMain.on('window:type', (e, windowType) => {
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
    // 登录进入主界面，查询该用户是否有登录记录
    const userId = store.get('userId')
    // 根据id查询表中是否有该用户的登录记录
    if (!isExistUserRecord(userId)) {
      console.log('没有')
      // 如果没有，隐藏主窗口
      mainWindow.hide()
      // 展示加载动画界面
      const options = {
        width: loading_width,
        height: loading_height
      }
      loadingWindow = createExtraWindow('loading', options, 'standalone')
    } else {
      // 进入Main窗口
      mainWindow.setSize(main_width, main_height)
      mainWindow.center()
      // 开启窗口尺寸改变
      mainWindow.setResizable(true)
      mainWindow.setMinimumSize(main_width, main_height)
    }
  } else if (windowType === 'register') {
    mainWindow.setSize(login_width, register_height)
    mainWindow.center()
  }
})

ipcMain.on('close-loading-window', (e) => {
  if (loadingWindow) {
    // 销毁加载窗口
    loadingWindow.destroy();
    loadingWindow = null;
  }
  // 进入Main窗口
  mainWindow.setSize(main_width, main_height)
  mainWindow.center()
  // 开启窗口尺寸改变
  mainWindow.setResizable(true)
  mainWindow.setMinimumSize(main_width, main_height)
  mainWindow.show()
})