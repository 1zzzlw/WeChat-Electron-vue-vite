import { mainWindow } from '../index'
import { store } from '../index'
import { dialog, ipcMain } from 'electron'
import { isExistUserRecord } from '../DB/select'
import { createExtraWindow } from '../Util/createNewWindow'
import { initInsert } from '../DB/insert'
import { initAndUpdateUserLoginRecord } from '../DB/mainDB'

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
    // 登录进入主界面，查询该用户是否有登录记录
    const userId = store.get('userId')
    // 根据id查询表中是否有该用户的登录记录
    if (!isExistUserRecord(userId)) {
      // 如果没有，隐藏主窗口
      mainWindow.hide()
      // 展示加载动画界面
      const options = {
        width: loading_width,
        height: loading_height
      }
      loadingWindow = createExtraWindow('loading', options, 'standalone')

      // 等待加载窗口准备就绪后，通知开始数据初始化
      loadingWindow.webContents.once('ready-to-show', () => {
        console.log('加载窗口已准备就绪，开始数据初始化')
        loadingWindow.webContents.send('start-data-initialization')
      })

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

// 处理数据初始化完成
ipcMain.on('data-initialization-complete', (e, data) => {
  console.log('数据初始化完成')

  const keys = Object.keys(data);

  // 将数据加载到本地数据库中
  for (const tableName of keys) {
    initInsert(tableName, data[`${tableName}`])
  }

  const userId = store.get('userId');
  console.log('------', userId)
  initAndUpdateUserLoginRecord(userId);

  // 关闭加载窗口，进入主界面
  if (loadingWindow) {
    loadingWindow.destroy()
    loadingWindow = null
  }

  // 进入Main窗口
  mainWindow.setSize(main_width, main_height)
  mainWindow.center()
  mainWindow.setResizable(true)
  mainWindow.setMinimumSize(main_width, main_height)
  mainWindow.show()
})

// 处理数据初始化错误
ipcMain.on('data-initialization-error', (e, error) => {
  console.error('数据初始化失败:', error)

  // 可以显示错误提示或重试选项
  // 这里先简单处理：关闭加载窗口，回到登录界面
  if (loadingWindow) {
    loadingWindow.destroy()
    loadingWindow = null
  }

  mainWindow.setSize(login_width, login_height)
  mainWindow.center()
  mainWindow.setResizable(false)
  mainWindow.show()
})