import { ipcMain } from "electron";
import { store, mainWindow } from '../index'
import { isExistUserRecord } from '../DB/select'
import { createExtraWindow } from '../Util/createNewWindow'
import { multipleInsert } from '../DB/insert'
import { initAndUpdateUserLoginRecord } from '../DB/mainDB'

let loadingWindow = null

const loading_width = 800
const loading_height = 700

ipcMain.handle('loading-isNeedInit', (e) => {
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

        return true
    } else {
        // 不需要，登录直接进入main界面
        return false
    }
})

// 数据库加载完成，可以进入main界面
ipcMain.on('close-loading-window', (e) => {
    if (loadingWindow) {
        // 销毁加载窗口
        loadingWindow.destroy();
        loadingWindow = null;
    }
    // 通知渲染进程可以进入main界面
    mainWindow.webContents.send('data-init-complete')
})

// 从服务端拉取数据完成，开始存入数据库中
ipcMain.on('data-initialization-complete', (e, data) => {
    console.log('数据初始化完成')

    const keys = Object.keys(data);
    console.log(keys)
    // 将数据加载到本地数据库中
    for (const tableName of keys) {
        multipleInsert('insert or ignore', tableName, data[`${tableName}`])
    }

    const userId = store.get('userId');
    console.log('------', userId)
    initAndUpdateUserLoginRecord(userId);

    // 向加载窗口发送可以跳过动画的请求，直接进入聊天软件
    loadingWindow.webContents.send('skip')
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
})