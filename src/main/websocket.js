import { store, mainWindow, tray, getTrayIcon, getEmptyTrayIcon } from './index'
import { app, Notification, nativeImage, BrowserWindow } from 'electron'
import { saveSentMessage, addConversation, addFriendRelation } from './DB/insert'
import { deleteMessage } from './DB/delete'
import { updateConversation } from './DB/update'
import { getConversationInfoById } from './DB/select'
import { join } from 'path'
import { pathToFileURL } from 'url'

// ===== 托盘闪动相关 =====
let flashInterval = null
let flashTimeout = null
let isTrayVisible = true

/**
 * 托盘图标闪动5秒
 * 如果已有闪动在进行中，只重置5秒结束计时器，不重复创建闪动定时器
 */
function flashTrayIcon() {
    if (!tray) return

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
            tray.setImage(isTrayVisible ? getTrayIcon() : getEmptyTrayIcon())
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
    if (tray) {
        try {
            tray.setImage(getTrayIcon())
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

        // 窗口获得焦点时停止托盘闪动
        if (mainWindow) {
            mainWindow.on('focus', () => {
                stopTrayFlash()
            })
        }
    }

    // 监听到消息
    onMessage(event) {
        try {
            const buffer = event.data
            const view = new DataView(buffer)
            let offset = 0

            // 1.接收魔数4个字节，并检验，注意要和后端写入的魔数对应
            const magic = [
                view.getUint8(offset++),
                view.getUint8(offset++),
                view.getUint8(offset++),
                view.getUint8(offset++)
            ]

            if (magic.join(',') !== '1,2,3,4') {
                console.warn('非法消息，魔数错误')
                return
            }

            // 2.版本号1个字节
            const version = view.getUint8(offset++)

            // 3.序列化方式1个字节
            const serializeType = view.getUint8(offset++)

            // 4.消息类型1个字节
            const messageType = view.getUint8(offset++)
            console.info('收到消息，类型:', messageType)

            // 5.序列号4个字节
            const sequenceId = view.getUint32(offset)
            offset += 4

            // 6.填充字节1个字节
            const padding = view.getUint8(offset++)

            // 7.正文长度4个字节
            const bodyLength = view.getUint32(offset)
            offset += 4

            // 8.正文
            const body = new Uint8Array(buffer, offset, bodyLength)

            // 9.解析正文为 JSON 字符串
            const jsonString = new TextDecoder().decode(body)
            // 10.解析 JSON 字符串为对象
            const data = JSON.parse(jsonString)

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

        // 将要发送的 JSON 转 UTF-8 bytes，和后端的二进制协议保持一致
        const encoder = new TextEncoder()
        // 编码 JSON 字符串为 UTF-8 字节数组
        const jsonBytes = encoder.encode(JSON.stringify(jsonObject))

        // 创建总长度的 ArrayBuffer
        // 魔数4字节 + 版本号1字节 + 序列化方式1字节 + 消息类型1字节 + 序列号4字节 + 填充1字节 + 正文长度4字节 + 正文
        const totalLength = 4 + 1 + 1 + 1 + 4 + 1 + 4 + jsonBytes.length
        // 创建一个固定大小的二进制缓冲区（ArrayBuffer），容量为 totalLength 字节。
        const buffer = new ArrayBuffer(totalLength)
        // 创建一个DataView视图，用于读写ArrayBuffer中的二进制数据。
        const view = new DataView(buffer)
        // 定义偏移量，记录当前写入数据的位置（从缓冲区的第几个字节开始写）
        let offset = 0
        // 1.写魔数 1,2,3,4，注意要和后端写入的魔数对应
        view.setUint8(offset++, 1)
        view.setUint8(offset++, 2)
        view.setUint8(offset++, 3)
        view.setUint8(offset++, 4)

        // 2.版本号
        view.setUint8(offset++, 1)

        // 3.序列化方式，0 = JSON
        view.setUint8(offset++, 0)

        // 3.消息类型
        view.setUint8(offset++, messageType)

        // 4.序列号
        view.setUint32(offset, sequenceId)
        offset += 4

        // 5.填充字节
        view.setUint8(offset++, 0xff)

        // 6.正文长度
        view.setUint32(offset, jsonBytes.length)
        offset += 4

        // 7.写正文
        new Uint8Array(buffer, offset).set(jsonBytes)

        console.log(buffer)
        console.log(bufferToHexString(buffer))
        // 8.发送
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
                mainWindow.destroy()
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

function bufferToHexString(buffer) {
    return Array.from(new Uint8Array(buffer))
        // 转十六进制 + 补零（确保单个数字是01而不是1） + 拼接成连续字符串
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

export default new WebSocketManager()