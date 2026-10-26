import { ipcMain } from "electron";
import { store, refs } from '../shared.js'
import { isExistUserRecord } from '../DB/select'
import { createExtraWindow } from '../Util/createNewWindow'
import { multipleInsert } from '../DB/mainDB'
import { initAndUpdateUserLoginRecord } from '../DB/mainDB'
import { initConversationList, initFriendList, initMessageList } from "../API/initData";

let loadingWindow = null

const loading_width = 640
const loading_height = 520

ipcMain.handle('loading-isNeedInit', (e) => {
    // 登录进入主界面，查询该用户是否有登录记录
    const userId = store.get('userId')
    // 根据id查询表中是否有该用户的登录记录
    if (!isExistUserRecord(userId)) {
        if (loadingWindow && !loadingWindow.isDestroyed()) return true
        // 如果没有，隐藏主窗口
        refs.mainWindow.hide()
        // 展示加载动画界面
        const options = {
            width: loading_width,
            height: loading_height,
            backgroundColor: '#dcedf8',
        }
        loadingWindow = createExtraWindow('loading', options, 'standalone', null)

        // 等待加载窗口准备就绪后，通知开始数据初始化
        const window = loadingWindow
        window.once('closed', () => {
            // 只有意外关闭时恢复来源窗口；正常交接由 enterMain 显示已绘制的主界面。
            if (loadingWindow !== window) return
            loadingWindow = null
            if (refs.mainWindow && !refs.mainWindow.isDestroyed()) refs.mainWindow.show()
        })
        window.webContents.once('did-finish-load', () => {
            console.log('加载窗口已准备就绪，开始数据初始化')
            initializationData(window)
        })

        return true
    } else {
        // 不需要，登录直接进入main界面
        return false
    }
})

// 数据库加载完成，可以进入main界面
ipcMain.on('close-loading-window', (e) => {
    if (!loadingWindow || loadingWindow.isDestroyed() || loadingWindow.webContents !== e.sender) return
    // 保留加载窗口，隐藏的主窗口完成路由和首次绘制后再关闭。
    refs.mainWindow.webContents.send('data-init-complete')
})

export function finishLoadingWindow() {
    const window = loadingWindow
    loadingWindow = null
    if (window && !window.isDestroyed()) window.destroy()
}

// 初始化数据到数据库
const initializationData = async (window) => {
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
        if (!window.isDestroyed()) {
            window.webContents.send('skip', { ok: true })
        }
    } catch (err) {
        console.error('数据初始化失败:', err.message)
        if (!window.isDestroyed()) {
            window.webContents.send('skip', { ok: false })
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
