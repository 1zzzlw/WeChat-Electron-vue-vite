import { ipcMain } from "electron";
import { store, refs } from '../shared.js'
import { isExistUserRecord } from '../DB/select'
import { createExtraWindow } from '../Util/createNewWindow'
import { multipleInsert } from '../DB/mainDB'
import { initAndUpdateUserLoginRecord } from '../DB/mainDB'
import { initConversationList, initFriendList, initMessageList } from "../API/initData";

let loadingWindow = null
let autoEnterTimer = null
let entryRequested = false

const clearAutoEnterTimer = () => {
    if (autoEnterTimer !== null) clearTimeout(autoEnterTimer)
    autoEnterTimer = null
}

// 手动跳过和自动进入共用一次交接，避免重复跳转或重复连接 WS。
const requestEnterChat = (window) => {
    if (window !== loadingWindow || !window || window.isDestroyed() || entryRequested) return
    const mainWindow = refs.mainWindow
    if (!mainWindow || mainWindow.isDestroyed()) return
    entryRequested = true
    clearAutoEnterTimer()
    mainWindow.webContents.send('data-init-complete')
}

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
        entryRequested = false

        // 等待加载窗口准备就绪后，通知开始数据初始化
        const window = loadingWindow
        // 从加载窗口真正出现时开始计时，不依赖网络同步或渲染进程的计时器。
        window.once('show', () => {
            autoEnterTimer = setTimeout(() => requestEnterChat(window), 10000)
        })
        window.once('closed', () => {
            // 只有意外关闭时恢复来源窗口；正常交接由 enterMain 显示已绘制的主界面。
            if (loadingWindow !== window) return
            clearAutoEnterTimer()
            loadingWindow = null
            if (refs.mainWindow && !refs.mainWindow.isDestroyed()) refs.mainWindow.show()
        })
        window.webContents.once('did-finish-load', () => {
            console.log('加载窗口已准备就绪，开始数据初始化')
            initializationData(window, userId)
        })

        return true
    } else {
        // 不需要，登录直接进入main界面
        return false
    }
})

// 跳过等待：数据可以继续同步，主窗口完成路由挂载后再关闭加载页。
ipcMain.on('close-loading-window', (e) => {
    if (!loadingWindow || loadingWindow.isDestroyed() || loadingWindow.webContents !== e.sender) return
    requestEnterChat(loadingWindow)
})

export function finishLoadingWindow() {
    clearAutoEnterTimer()
    const window = loadingWindow
    loadingWindow = null
    if (window && !window.isDestroyed()) window.destroy()
}

// 初始化数据到数据库
const initializationData = async (window, userId) => {
    try {
        const data = await fetchMySQLData()
        // 跳过加载后用户可能已切换账号，不能将旧账号的同步结果写入新会话。
        if (String(store.get('userId')) !== String(userId)) return

        const keys = Object.keys(data);
        // 将数据加载到本地数据库中
        for (const tableName of keys) {
            if (data[tableName].length !== 0) {
                multipleInsert('insert or ignore', tableName, data[`${tableName}`])
            }
        }

        initAndUpdateUserLoginRecord(userId);

        const mainWindow = refs.mainWindow
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('data-init-synced', { userId: String(userId) })
        }

        // 更新仍在显示的加载页状态，不改变用户的跳过/倒计时选择。
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
