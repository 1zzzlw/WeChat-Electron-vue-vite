import { defineStore } from 'pinia'
import { Message } from '../../types/message'

// 聊天记录存储模块
interface PendingMessageInfo {
  id: string
  sentAt: number
  status: 0
  conversationId: string  // 如 "user_123" 或 "group_456"
  index: number       // 在messageMap数组中的位置
}

type EnqueueMode = 'append' | 'reuse_if_exists'

export const messageInfo = defineStore('messageInfo', {
  state: () => {
    return {
      // 会话id当键，消息当值
      messageMap: {} as Record<string, Message[]>,
      fileMessgaeMap: {} as Record<string, Message>,
      // 发送中的消息：用于超时检测
      pendingMessages: new Map<string, PendingMessageInfo>(),
      // 全局计时器
      timeoutTimer: null as NodeJS.Timeout | null,
      // 超时时间（毫秒）
      timeoutDuration: 5000,
      // 检查间隔（毫秒）
      checkInterval: 1000
    }
  },
  actions: {
    loadMessageMap(conversationId: string, message: Message) {
      if (!this.messageMap[conversationId]) {
        this.messageMap[conversationId] = []
      }
      // ID 去重：避免 REST 拉取与 WS 推送并发时产生重复消息
      if (message.id && this.messageMap[conversationId].some(m => m.id === message.id)) {
        return
      }
      // 再添加消息，需要在头部拼接消息
      this.messageMap[conversationId].unshift(message)
    },
    // New: batch load for history messages (more efficient than repeated unshift)
    batchLoadMessages(conversationId: string, messages: Message[]) {
      if (!this.messageMap[conversationId]) {
        this.messageMap[conversationId] = []
      }
      // ID 去重：过滤掉已存在的消息（REST 拉取与 WS 推送并发场景）
      const existingIds = new Set(this.messageMap[conversationId].map(m => m.id))
      const newMessages = messages.filter(m => !m.id || !existingIds.has(m.id))
      // Prepend all messages at once instead of repeated unshift
      this.messageMap[conversationId] = [...newMessages, ...this.messageMap[conversationId]]
    },
    addMessageMap(conversationId: string, message: Message) {
      // 如果该会话ID还没有数组，先初始化一个空数组
      if (!this.messageMap[conversationId]) {
        this.messageMap[conversationId] = []
      }
      // ID 去重：避免 WS 推送和 REST 拉取并发时产生重复消息
      if (message.id && this.messageMap[conversationId].some(m => m.id === message.id)) {
        return
      }
      // 再添加消息，需要在尾部拼接消息
      this.messageMap[conversationId].push(message)
    },

    _ensureMessageInMap(conversationId: string, message: Message, mode: EnqueueMode) {
      if (!this.messageMap[conversationId]) this.messageMap[conversationId] = []

      const messages = this.messageMap[conversationId]

      if (mode === 'reuse_if_exists') {
        const existedIndex = messages.findIndex(m => m.id === message.id)
        if (existedIndex !== -1) return existedIndex
      }

      messages.push(message)
      return messages.length - 1
    },

    // ---- 通用“挂起 + 超时检测” ----
    _trackPending(messageId: string, conversationId: string, index: number) {
      this.pendingMessages.set(messageId, {
        id: messageId,
        sentAt: Date.now(),
        status: 0,
        conversationId,
        index
      })
      this.startTimeoutChecker()
    },

    // ---- 通用“发 WS（捕获异常）” ----
    _sendViaWs(wsType: number, payload: any, onError: (err: any) => void) {
      try {
        ; (window as any).wsApi.sendMessage(wsType, 0, payload)
      } catch (err) {
        onError(err)
      }
    },

    // ---- 统一发送内核 ----
    _sendOutgoing(
      message: Message,
      conversationId: string,
      opts: {
        wsType: number
        receiverIds?: string[]
        enqueueMode?: EnqueueMode
      }
    ) {
      const enqueueMode = opts.enqueueMode ?? 'append'

      const payload =
        opts.receiverIds && opts.receiverIds.length > 0
          ? { ...message, receiverIds: opts.receiverIds }
          : message

      const index = this._ensureMessageInMap(conversationId, payload, enqueueMode)
      this._trackPending(payload.id, conversationId, index)

      this._sendViaWs(opts.wsType, payload, () => {
        this.markMessageFailed(payload.id, '发送失败')
      })

      return payload.id
    },

    /**
     * 文本消息
     */
    sendMessage(message: Message, conversationId: string, receiverIds: string[] = []) {
      const isGroup = receiverIds.length > 0 || conversationId?.startsWith('g_')
      const wsType = isGroup ? 3 : 1
      return this._sendOutgoing(message, conversationId, {
        wsType,
        receiverIds,
        enqueueMode: 'append'
      })
    },

    /**
     * 文件消息
     * 和文本的差异：允许“复用已存在的消息”（HTTP 先插入 or UI 先插入的场景）
     */
    sendFileMessage(message: Message, conversationId: string, receiverIds: string[] = []) {
      const isGroup = receiverIds.length > 0 || conversationId?.startsWith('g_')
      const wsType = isGroup ? 3 : 1
      return this._sendOutgoing(message, conversationId, {
        wsType,
        receiverIds,
        enqueueMode: 'reuse_if_exists'
      })
    },

    /**
     * 系统消息
     *
     */
    sendSystemMessage(message: Message, conversationId: string, receiverIds: string[] = []) {
      const wsType = 12
      return this._sendOutgoing(message, conversationId, {
        wsType,
        receiverIds,
        enqueueMode: 'append'
      })
    },
    // 启动1秒轮询检查
    startTimeoutChecker() {
      if (this.timeoutTimer) return

      this.timeoutTimer = setInterval(() => {
        const now = Date.now()

        // 遍历所有发送中的消息
        for (const [messageId, pendingInfo] of this.pendingMessages) {
          // 检查是否超时
          if (now - pendingInfo.sentAt > this.timeoutDuration) {
            // 超时处理
            this.handleMessageTimeout(messageId, pendingInfo)
          }
        }

      }, this.checkInterval) // 1秒检查一次
    },
    /**
    * 处理消息超时
    */
    handleMessageTimeout(messageId: string, pendingInfo: PendingMessageInfo) {
      // 1. 从pendingMessages中移除
      this.pendingMessages.delete(messageId)

      // 2. 更新messageMap中的消息状态
      const messages = this.messageMap[pendingInfo.conversationId]
      if (messages && messages[pendingInfo.index]) {
        messages[pendingInfo.index].sendStatus = 2
      }

      // 3. 触发UI更新（显示感叹号）
      console.log(`消息 ${messageId} 发送超时`)

      // 4. 如果所有消息都处理完了，停止计时器
      if (this.pendingMessages.size === 0) {
        this.stopTimeoutChecker()
      }
    },
    /**
    * 停止超时检测器
    */
    stopTimeoutChecker() {
      if (this.timeoutTimer) {
        clearInterval(this.timeoutTimer)
        this.timeoutTimer = null
      }
    },
    /**
     * 收到服务端ACK
    */
    onReceiveAck(messageId: string) {
      console.log(messageId)

      const pendingInfo = this.pendingMessages.get(messageId)

      if (!pendingInfo) {
        // 可能已经超时或已经处理
        return
      }

      // 从pendingMessages中移除
      this.pendingMessages.delete(messageId)

      // 更新messageMap中的消息状态
      const messages = this.messageMap[pendingInfo.conversationId]
      if (messages && messages[pendingInfo.index]) {
        messages[pendingInfo.index].sendStatus = 1
      }

      // 如果所有消息都处理完了，停止计时器
      if (this.pendingMessages.size === 0) {
        this.stopTimeoutChecker()
      }

      console.log(`消息 ${messageId} 发送成功`)

      return messages[pendingInfo.index]
    },
    /**
     * 收到服务端错误响应
     */
    onReceiveError(messageId: string, error: string) {
      const pendingInfo = this.pendingMessages.get(messageId)

      if (pendingInfo) {
        // 1. 从pendingMessages中移除
        this.pendingMessages.delete(messageId)

        // 2. 更新messageMap中的消息状态
        const messages = this.messageMap[pendingInfo.conversationId]
        if (messages && messages[pendingInfo.index]) {
          messages[pendingInfo.index].sendStatus = 2
          // TODO 可以存储错误信息
        }

        // 3. 如果所有消息都处理完了，停止计时器
        if (this.pendingMessages.size === 0) {
          this.stopTimeoutChecker()
        }
      }
    },
    /**
     * 手动标记消息为失败
     */
    markMessageFailed(messageId: string, error: string) {
      // 查找消息（可能在pendingMessages或messageMap中）
      for (const [sessionKey, messages] of Object.entries(this.messageMap)) {
        const index = messages.findIndex(msg => msg.id === messageId)
        if (index !== -1) {
          messages[index].sendStatus = 2
          break
        }
      }

      // 从pendingMessages中移除（如果存在）
      this.pendingMessages.delete(messageId)
    },
    clearConversationMessages(conversationId: string) {
      if (this.messageMap[conversationId]) {
        delete this.messageMap[conversationId]
        console.info(`已清空会话 ${conversationId} 的消息缓存`)
      }
    },
    // 清空所有消息缓存
    clearAllMessages() {
      this.messageMap = {}
      console.info('已清空所有消息缓存')
    },
    // 删除一条消息
    deleteMessage(conversationId: string, messageId: string) {
      if (this.messageMap[conversationId]) {
        this.messageMap[conversationId] = this.messageMap[conversationId].filter(
          (msg) => msg.id !== messageId
        )
      }
    },
    // 添加文件消息（临时存储，用于上传完成后发送 WS）
    addFileMessage(fileId: string, message: Message) {
      this.fileMessgaeMap[fileId] = message
    },
    // 获取文件消息
    getFileMessage(fileId: string) {
      return this.fileMessgaeMap[fileId]
    },
    // 补充文件信息的路径
    addFileUrl(fileId: string, remoteUrl: string) {
      this.fileMessgaeMap[fileId].remoteUrl = remoteUrl
    }
  }
})