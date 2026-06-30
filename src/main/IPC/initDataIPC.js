import { ipcMain } from "electron";
import { store, refs } from '../shared.js'
import { isExistUserRecord } from '../DB/select'
import { createExtraWindow } from '../Util/createNewWindow'
import { multipleInsert } from '../DB/mainDB'
import { initAndUpdateUserLoginRecord } from '../DB/mainDB'
import { initConversationList, initFriendList, initMessageList } from "../API/initData";

let loadingWindow = null

const loading_width = 800
const loading_height = 700

ipcMain.handle('loading-isNeedInit', (e) => {
    // 登录进入主界面，查询该用户是否有登录记录
    const userId = store.get('userId')
    // 根据id查询表中是否有该用户的登录记录
    if (!isExistUserRecord(userId)) {
        // 如果没有，隐藏主窗口
        refs.mainWindow.hide()
        // 展示加载动画界面
        const options = {
            width: loading_width,
            height: loading_height,
            transparent: true,
        }
        loadingWindow = createExtraWindow('loading', options, 'standalone', null)

        // 等待加载窗口准备就绪后，通知开始数据初始化
        loadingWindow.webContents.once('ready-to-show', () => {
            console.log('加载窗口已准备就绪，开始数据初始化')
            initializationData()
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
    refs.mainWindow.webContents.send('data-init-complete')
})

// 初始化数据到数据库
const initializationData = async () => {
    try {
        const data = await fetchMySQLData()

        const keys = Object.keys(data);
        // 将数据加载到本地数据库中
        for (const tableName of keys) {
            if (data[tableName].length !== 0) {
                multipleInsert('insert or ignore', tableName, data[`${tableName}`])
            }
        }

        const userId = store.get('userId');
        initAndUpdateUserLoginRecord(userId);

        // 向加载窗口发送可以跳过动画的请求，直接进入聊天软件
        if (loadingWindow && !loadingWindow.isDestroyed()) {
            loadingWindow.webContents.send('skip')
        }
    } catch (err) {
        console.error('数据初始化失败:', err.message)
        if (loadingWindow && !loadingWindow.isDestroyed()) {
            loadingWindow.webContents.send('skip')
        }
    }
}

// 拉取数据从服务端
const fetchMySQLData = async () => {
    // 发送 HTTP 请求获取会话列表
    const conversationResponse = await initConversationList(true)

    const conversation = conversationResponse.data || []

    const conversationIds = conversation.map(c => c.id)

    // 发送 HTTP 请求获取好友列表
    const friendRelationResponse = await initFriendList(true)

    const friend_relation = friendRelationResponse.data || []

    let message = []

    if (conversationIds.length > 0) {
        // 发送 HTTP 请求获取消息列表
        const messageResponse = await initMessageList(conversationIds, true)

        message = messageResponse.data === null ? [] : messageResponse.data
    }

    return {
        conversation,
        friend_relation,
        message
    }
}