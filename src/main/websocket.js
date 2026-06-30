import { store, refs, getTrayIcon, getEmptyTrayIcon } from './shared.js'
import { app, Notification, nativeImage, BrowserWindow } from 'electron'
import { saveSentMessage, addConversation, addFriendRelation } from './DB/insert'
import { deleteMessage } from './DB/delete'
import { updateConversation } from './DB/update'
import { getConversationInfoById } from './DB/select'
import { join } from 'path'
import { pathToFileURL } from 'url'
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
        // 当前是否正在连接
        this.isConnect = false
        // 当前的重连次数
        this.reconnectCount = 0
        // 最大重连次数
        this.reconnectCountMax = 3
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
        this.ws.websocket = new WebSocket(`ws://127.0.0.1:80/ws?token=${token}`)

        // ws的状态为正在连接
        this.ws.status = WebSocket.CONNECTING

        // 设置为二进制发送
        this.ws.websocket.binaryType = 'arraybuffer'
        // 这里的bind保证回调方法里的 this 永远指向 WebSocketManager，而不是 WebSocket 本身。
        this.ws.websocket.onopen = this.onOpen.bind(this)
        this.ws.websocket.onmessage = this.onMessage.bind(this)
        this.ws.websocket.onerror = this.onError.bind(this)
        this.ws.websocket.onclose = this.onClose.bind(this)
    }

    // 开启连接通道
    onOpen() {
        console.log('WebSocket 连接成功')

        // 清除重连计时器
        this.clearReconnectTimer()

        // 开启心跳计时器
        this.startHeartbeat()

        // 初始化
        this.lockReconnect = false
        this.reconnectCount = 0
        this.ws.status = WebSocket.OPEN

        // 窗口获得焦点时停止托盘闪动（只注册一次，防止重连时重复累积）
        if (refs.mainWindow && !this._focusListenerRegistered) {
            this._focusListenerRegistered = true
            refs.mainWindow.on('focus', () => {
                stopTrayFlash()
            })
        }
    }

    // 监听到消息
    onMessage(event) {
        try {
            const { messageType, data } = decodeMessage(event.data)
            console.info(`收到WS消息-类型${messageType}:`, data);

            if (messageType === 2 || messageType === 4) {
                // 保存到数据库里
                saveSentMessage(data)
                // 更新会话列表
                const condition = {
                    id: data.conversationId
                }
                const messageData = {
                    latestMsg: data.content,
                    latestMsgTime: data.receiveTime
                }
                updateConversation(condition, messageData)

                // 检查会话免打扰状态，决定是否闪动托盘 & 播放提示音
                try {
                    const userId = store.get('userId')
                    const convInfo = getConversationInfoById(userId, data.conversationId)
                    const isMute = convInfo && convInfo.length > 0 && convInfo[0].isMute === 1
                    if (!isMute) {
                        flashTrayIcon()
                        // 检查通知设置，决定是否播放消息提示音
                        try {
                            const notifSettings = store.get('notificationSettings')
                            if (notifSettings && notifSettings.playSound !== false) {
                                const soundPath = app.isPackaged
                                    ? join(process.resourcesPath, 'message-sound.mp3')
                                    : join(__dirname, '../../resources/message-sound.mp3')
                                const soundUrl = pathToFileURL(soundPath).href
                                BrowserWindow.getAllWindows().forEach(win => {
                                    if (win && !win.isDestroyed()) {
                                        win.webContents.send('play:messageSound', soundUrl)
                                    }
                                })
                            }
                        } catch (e) {
                            // 提示音播放失败不影响主流程
                        }
                    }
                } catch (e) {
                    console.warn('查询会话免打扰状态失败', e)
                    // 查询失败时默认闪动
                    flashTrayIcon()
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
        // 重置连接状态
        this.isConnect = false

        // 开启重连计时器，尝试重连
        this.tryRecoonectTimer()
    }

    // 连接通道关闭
    onClose() {
        console.warn('websocker 关闭')
        this.isConnect = false

        // 停止心跳
        this.stopHeartbeat()
        // 开启重连计时器
        this.tryRecoonectTimer()
    }

    // 发送消息
    sendMessage(messageType, sequenceId, jsonObject) {
        if (this.ws.status !== WebSocket.OPEN) {
            console.warn('WebSocket 未连接，无法发送消息')
            return
        }

        const buffer = encodeMessage(messageType, sequenceId, jsonObject)
        console.log(buffer)
        console.log(bufferToHexString(buffer))
        // 发送
        this.send(buffer)
    }

    send(buffer) {
        if (this.ws.websocket?.readyState === WebSocket.OPEN) {
            console.info('发送消息:', buffer)
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

        if (this.reconnectCount >= this.reconnectCountMax) {
            console.warn('达到最大重连次数，停止重连')

            this.clearReconnectTimer()
            this.stopHeartbeat()
            if (this.ws.websocket) {
                this.ws.websocket.close()
                this.ws.websocket = null
            }

            // 动态获取 icon 路径
            const iconPath = app.isPackaged
                ? join(process.resourcesPath, 'icon.png')
                : join(__dirname, '../../resources/icon.png')

            const notification = new Notification({
                icon: iconPath,
                title: '连接已断开',
                body: '无法连接服务器，应用将自动关闭',
                silent: false
            })

            // 显示通知
            notification.show()

            setTimeout(() => {
                // 直接退出程序
                refs.mainWindow.destroy()
                app.quit()
            }, 2000)

            return
        }

        this.clearReconnectTimer()

        this.reconnectTimer = setTimeout(() => {
            console.log('尝试重连...')
            this.reconnectCount++
            this.lockReconnect = false
            this.createWebSocket(token)
        }, 5000)
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
        this.heartTimer = setInterval(() => {
            if (this.ws.websocket?.readyState === WebSocket.OPEN) {
                const heartbeatContent = { action: 'heartbeat' }
                this.sendMessage(0, 0, heartbeatContent)
            }
        }, 60000)
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