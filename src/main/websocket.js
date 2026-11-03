import { store, refs, getTrayIcon, getEmptyTrayIcon } from './shared.js'
import { nativeImage, BrowserWindow } from 'electron'
import { saveSentMessage, addConversation, addFriendRelation } from './DB/insert'
import { deleteMessage } from './DB/delete'
import { updateConversation } from './DB/update'
import { getConversationInfoById } from './DB/select'
import { queryAll } from './DB/mainDB'
import { broadcastConversationUpdate, isConversationVisible } from './Util/conversationState'
import { encodeMessage, decodeMessage, bufferToHexString } from './protocol.js'

// ===== 托盘闪动相关 =====
let flashInterval = null
let flashTimeout = null
let isTrayVisible = true

/**
 * 托盘图标闪动5秒
 * 如果已有闪动在进行中，只重置5秒结束计时器，不重复创建闪动定时器
 */
function flashTrayIcon() {
    if (!refs.tray) return

    // 已有闪动在进行，只重置结束计时器
    if (flashInterval) {
        if (flashTimeout) {
            clearTimeout(flashTimeout)
            flashTimeout = setTimeout(stopTrayFlash, 5000)
        }
        return
    }

    // 开始新的闪动
    isTrayVisible = true
    flashInterval = setInterval(() => {
        isTrayVisible = !isTrayVisible
        try {
            refs.tray.setImage(isTrayVisible ? getTrayIcon() : getEmptyTrayIcon())
        } catch (e) {
            // tray 可能已被销毁
            stopTrayFlash()
        }
    }, 500)

    // 5秒后停止闪动
    flashTimeout = setTimeout(stopTrayFlash, 5000)
}

/**
 * 停止托盘闪动，恢复正常图标
 */
function stopTrayFlash() {
    if (flashInterval) {
        clearInterval(flashInterval)
        flashInterval = null
    }
    if (flashTimeout) {
        clearTimeout(flashTimeout)
        flashTimeout = null
    }
    isTrayVisible = true
    if (refs.tray) {
        try {
            refs.tray.setImage(getTrayIcon())
        } catch (e) {
            // tray 可能已被销毁
        }
    }
}

class WebSocketManager {
    constructor() {
        this.ws = {
            websocket: null,
            status: WebSocket.CLOSED
        }
        // 心跳计时器
        this.heartTimer = null
        // 重连计时器
        this.reconnectTimer = null
        this.connectTimer = null
        this.lastMessageAt = 0
        this.presenceReady = false
        this.presencePending = false
        // 当前是否正在连接
        this.isConnect = false
        // 当前的重连次数
        this.reconnectCount = 0
        // 重连锁
        this.lockReconnect = false
        // 防止 onOpen 被多次调用时重复注册 focus 监听器
        this._focusListenerRegistered = false
    }

    connect() {
        // 当前已经有连接，禁止连接
        if (this.isConnect) return

        // 获得短期token
        const token = store.get('accessToken')

        if (!token) {
            console.warn('token不存在')
            return
        }

        // 连接成功标志
        this.isConnect = true
        // 创建ws通信
        this.createWebSocket(token)
    }

    // 创建连接请求
    createWebSocket(token) {
        const previous = this.ws.websocket
        if (previous) {
            previous.onopen = previous.onmessage = previous.onerror = previous.onclose = null
            previous.close()
        }
        clearTimeout(this.connectTimer)
        const socket = new WebSocket(`ws://127.0.0.1:80/ws?token=${token}`)
        this.ws.websocket = socket
        this.isConnect = true

        // ws的状态为正在连接
        this.setStatus(WebSocket.CONNECTING)

        // 设置为二进制发送
        socket.binaryType = 'arraybuffer'
        // 只处理当前连接的回调，避免旧连接干扰重连。
        socket.onopen = () => { if (socket === this.ws.websocket) this.onOpen() }
        socket.onmessage = event => { if (socket === this.ws.websocket) this.onMessage(event) }
        socket.onerror = () => { if (socket === this.ws.websocket) this.onError() }
        socket.onclose = () => { if (socket === this.ws.websocket) this.onClose() }
        this.connectTimer = setTimeout(() => {
            if (socket === this.ws.websocket && socket.readyState === WebSocket.CONNECTING) {
                console.warn('WebSocket 握手超时，重新连接')
                this.onClose()
            }
        }, 30000)
    }

    // 开启连接通道
    onOpen() {
        console.log('WebSocket 连接成功')

        // 清除重连计时器
        this.clearReconnectTimer()
        clearTimeout(this.connectTimer)

        // 初始化
        this.lockReconnect = false
        this.reconnectCount = 0
        this.setStatus(WebSocket.OPEN)
        this.lastMessageAt = Date.now()
        this.startHeartbeat()
        if (this.presenceReady) this.requestPresence()

        // 窗口获得焦点时停止托盘闪动（只注册一次，防止重连时重复累积）
        if (refs.mainWindow && !this._focusListenerRegistered) {
            this._focusListenerRegistered = true
            refs.mainWindow.on('focus', () => {
                stopTrayFlash()
                this.requestPresence()
            })
        }
    }

    // 监听到消息
    onMessage(event) {
        try {
            const { messageType, data } = decodeMessage(event.data)
            this.lastMessageAt = Date.now()
            if (messageType === 0) return
            if (messageType === 10) this.presencePending = false
            console.info(`收到WS消息-类型${messageType}:`, data);

            if (messageType === 2 || messageType === 4) {
                const duplicate = queryAll('select id from message where id = ?', [String(data.id)]).length > 0
                const userId = String(store.get('userId'))
                const conversation = getConversationInfoById(userId, data.conversationId)[0]
                const incoming = String(data.senderId) !== userId
                const visible = isConversationVisible(data.conversationId)
                const previousCount = Math.max(0, Number(conversation?.unreadCount) || 0)
                const unreadCount = visible ? 0 : previousCount + (incoming && !duplicate ? 1 : 0)
                // 保存到数据库里
                saveSentMessage(data)
                // 更新会话列表
                const condition = {
                    id: data.conversationId, userId
                }
                const messageData = {
                    latestMsg: data.content,
                    latestMsgTime: data.sendTime || data.receiveTime,
                    unreadCount,
                    status: 1
                }
                updateConversation(condition, messageData)
                broadcastConversationUpdate(data.conversationId, messageData)

                // 检查会话免打扰状态，决定是否闪动托盘 & 播放提示音
                try {
                    const rawSettings = store.get('notificationSettings')
                    const settings = (typeof rawSettings === 'string' ? JSON.parse(rawSettings) : rawSettings) || {}
                    const now = new Date()
                    const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                    const start = settings.dndStartTime || '23:00'
                    const end = settings.dndEndTime || '08:00'
                    const withinDnd = settings.doNotDisturb === true && (start === end ||
                        (start < end ? clock >= start && clock < end : clock >= start || clock < end))
                    const enabled = settings.enableNotification !== false && !withinDnd &&
                        (messageType === 4 ? settings.notifyGroupChat !== false : settings.notifyPrivateChat !== false)
                    if (incoming && !duplicate && Number(conversation?.isMute) !== 1 && enabled) {
                        if (!visible && settings.flashTaskbar !== false) flashTrayIcon()
                        // 只交给主窗口播放一次；未保存设置时默认开启声音。
                        if (settings.playSound !== false && refs.mainWindow && !refs.mainWindow.isDestroyed()) {
                            refs.mainWindow.webContents.send('play:messageSound')
                        }
                    }
                } catch (e) {
                    console.warn('查询会话免打扰状态失败', e)
                }
            } else if (messageType === 13) {
                // 保存到数据库里
                saveSentMessage(data)
            } else if (messageType === 15) {
                // 好友申请通过，将好友信息存储到数据库中
                const conversationPack = {
                    id: data.conversationId,
                    userId: data.userId,
                    targetId: data.friendId,
                    name: data.username,
                    avatar: data.avatar,
                    type: 0,
                    isTop: 0,
                    isMute: 0,
                    unreadCount: 0
                }
                addConversation(conversationPack)
                const friendPack = {
                    userId: data.userId,
                    username: data.username,
                    account: data.account,
                    friendId: data.friendId,
                    avatar: data.avatar,
                    gender: data.gender,
                    phone: data.phone,
                    relationStatus: data.relationStatus
                }
                addFriendRelation(friendPack)
            }
            // 广播 WS 消息到所有窗口（包括独立窗口），各窗口的 wsHandlers 按 conversationId 自行过滤
            BrowserWindow.getAllWindows().forEach(win => {
              if (win && !win.isDestroyed()) {
                win.webContents.send('ws:receive', messageType, data)
              }
            })
        } catch (e) {
            console.warn('消息解析失败', e)
        }
    }

    // 连接通道出错
    onError() {
        console.warn('websocket 出错')
        this.onClose()
    }

    // 连接通道关闭
    onClose() {
        console.warn('websocker 关闭')
        this.isConnect = false
        this.setStatus(WebSocket.CLOSED)
        this.presencePending = false
        clearTimeout(this.connectTimer)
        const socket = this.ws.websocket
        this.ws.websocket = null
        if (socket) {
            socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null
            socket.close()
        }

        // 停止心跳
        this.stopHeartbeat()
        // 开启重连计时器
        this.tryRecoonectTimer()
    }

    // 主动退出不进入重连分支，下一次登录仍可重新 connect。
    disconnect() {
        this.clearReconnectTimer()
        clearTimeout(this.connectTimer)
        this.stopHeartbeat()
        this.lockReconnect = false
        this.reconnectCount = 0
        this.presenceReady = false
        this.presencePending = false
        this.isConnect = false
        this.setStatus(WebSocket.CLOSED)
        const socket = this.ws.websocket
        this.ws.websocket = null
        if (socket) {
            socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null
            socket.close()
        }
        stopTrayFlash()
    }

    setStatus(status) {
        this.ws.status = status
        for (const window of BrowserWindow.getAllWindows()) {
            if (!window.isDestroyed()) window.webContents.send('ws:status', status)
        }
    }

    // 页面就绪后按需获取在线列表，合并尚未完成的请求。
    requestPresence() {
        this.presenceReady = true
        if (this.ws.status !== WebSocket.OPEN || this.presencePending) return
        this.presencePending = true
        this.sendMessage(19, 0, {})
    }

    // 发送消息
    sendMessage(messageType, sequenceId, jsonObject) {
        if (this.ws.status !== WebSocket.OPEN) {
            console.warn('WebSocket 未连接，无法发送消息')
            return
        }

        const buffer = encodeMessage(messageType, sequenceId, jsonObject)
        if (messageType !== 0) {
            console.log(buffer)
            console.log(bufferToHexString(buffer))
        }
        // 发送
        this.send(buffer)
    }

    send(buffer) {
        if (this.ws.websocket?.readyState === WebSocket.OPEN) {
            this.ws.websocket.send(buffer)
        }
    }


    // 开启重连计时器，尝试重连
    tryRecoonectTimer() {
        if (this.lockReconnect) return
        const token = store.get('accessToken')
        // 没有 token 时，不尝试重连
        if (!token) return

        this.lockReconnect = true
        this.isConnect = false

        this.clearReconnectTimer()

        const delay = [2000, 4000, 8000, 15000, 30000][Math.min(this.reconnectCount, 4)]
        this.reconnectTimer = setTimeout(() => {
            console.log('尝试重连...')
            this.reconnectCount++
            this.lockReconnect = false
            // 重连时重新读取 token，避免沿用计时开始时的过期凭证。
            this.connect()
        }, delay)
    }

    // 清除重连计时器
    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }
    }

    // 开启心跳计时器
    startHeartbeat() {
        // 先停止之前的心跳，防止重复
        this.stopHeartbeat()
        this.sendMessage(0, 0, {})
        this.heartTimer = setInterval(() => {
            if (Date.now() - this.lastMessageAt >= 90000) {
                console.warn('WebSocket 90秒未收到回包，重新连接')
                this.onClose()
                return
            }
            if (this.ws.websocket?.readyState === WebSocket.OPEN) {
                this.sendMessage(0, 0, {})
            }
        }, 30000)
    }

    // 关闭心跳计时器
    stopHeartbeat() {
        if (this.heartTimer) {
            clearInterval(this.heartTimer)
            this.heartTimer = null
        }
    }
}
export default new WebSocketManager()
