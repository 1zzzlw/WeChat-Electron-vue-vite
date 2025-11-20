import { messageInfo } from '../stores/MessageStore'
import { userApplyListInfo } from '../stores/UserApplyListStore'

interface socket {
  // 用来存储websocket实例
  websocket: WebSocket | null
  // 用来存储websocket实例的状态
  status: number
}

class WebSocketManager {
  private ws: socket = {
    websocket: null,
    status: WebSocket.CLOSED
  }

  private heartTimer: any = null
  private reconnectTimer: any = null
  private isConnect = false
  private reconnectCount = 0
  private readonly reconnectMax = 200
  private lockReconnect = false
  private static instance: WebSocketManager

  static getInstance() {
    if (!this.instance) {
      this.instance = new WebSocketManager()
    }
    return this.instance
  }

  private constructor() {}

  /** 公共方法：外部用于建立连接 */
  async connect() {
    if (this.isConnect) return

    const token = await (window as any).api.storeGetToken()
    if (!token) {
      console.warn('没有 token，无法连接 WebSocket')
      return
    }

    this.isConnect = true
    this.createWebSocket(token)
  }

  /** 创建 WebSocket 实例 */
  private createWebSocket(token: string) {
    this.ws.websocket = new WebSocket(`ws://localhost:8000/ws?token=${token}`)
    this.ws.status = WebSocket.CONNECTING

    // 设置为二进制发送
    this.ws.websocket.binaryType = 'arraybuffer'
    // 这里的bind保证回调方法里的 this 永远指向 WebSocketManager，而不是 WebSocket 本身。
    this.ws.websocket.onopen = this.onOpen.bind(this)
    this.ws.websocket.onmessage = this.onMessage.bind(this)
    this.ws.websocket.onerror = this.onError.bind(this)
    this.ws.websocket.onclose = this.onClose.bind(this)
  }

  /** 公共方法：外部用于发送消息，需要严格按照和后端一致的二进制协议 */
  public sendMessage(messageType: number, sequenceId: number, jsonObject: Record<string, any>) {
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

    // 8.发送
    this.send(buffer)
  }

  private send(buffer: ArrayBuffer) {
    if (this.ws.websocket?.readyState === WebSocket.OPEN) {
      console.info('发送消息:', buffer)
      this.ws.websocket.send(buffer)
    }
  }

  /** open */
  private onOpen() {
    console.info('WebSocket 连接成功')

    this.clearReconnectTimer()

    this.startHeartbeat()

    this.lockReconnect = false

    this.reconnectCount = 0

    this.ws.status = WebSocket.OPEN
  }

  /** 接收后端消息，接收的是二进制协议，需要解析后存储到状态管理中 */
  private onMessage(event: MessageEvent) {
    try {
      const buffer = event.data as ArrayBuffer
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

      switch (messageType) {
        case 2:
          // 私信类型，将消息存储到状态管理中
          console.info('收到消息:', data)
          messageInfo().addMessageMap(data.conversationId, data)
          break
        case 6:
          // 好友申请类型，将消息存储到状态管理中
          console.info('收到好友申请:', data)
          userApplyListInfo().setUserApplyMap(data.applyId, data)
          break
      }
    } catch (e) {
      console.warn('消息解析失败', e)
    }
  }

  /** error */
  private onError() {
    console.warn('WebSocket 出错')

    this.tryReconnect()
  }

  /** close */
  private onClose() {
    console.warn('WebSocket 关闭')
    this.isConnect = false

    this.stopHeartbeat()

    this.tryReconnect()
  }

  /** 开始心跳，每 5 秒发送 */
  private startHeartbeat() {
    this.stopHeartbeat() // 避免重复定时器
    this.heartTimer = setInterval(() => {
      if (this.ws.websocket?.readyState === WebSocket.OPEN) {
        const heartbeatContent = { action: 'heartbeat' }
        this.sendMessage(0, 0, heartbeatContent)
      }
    }, 60000)
  }

  /** 停止心跳 */
  private stopHeartbeat() {
    if (this.heartTimer) {
      clearInterval(this.heartTimer)
      this.heartTimer = null
    }
  }

  /** 清理重连定时器 */
  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /** 重连逻辑 */
  private async tryReconnect() {
    if (this.lockReconnect) return

    const token = await (window as any).api.storeGetToken()
    if (!token) return

    this.lockReconnect = true
    this.isConnect = false

    if (this.reconnectCount >= this.reconnectMax) {
      console.warn('达到最大重连次数，停止重连')
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

  /** 手动断开连接 */
  disconnect() {
    this.stopHeartbeat()
    this.clearReconnectTimer()
    this.lockReconnect = true

    if (this.ws.websocket) {
      this.ws.websocket.close()
      this.ws.websocket = null
    }

    this.isConnect = false
  }
}

export const WSManager = WebSocketManager.getInstance()
