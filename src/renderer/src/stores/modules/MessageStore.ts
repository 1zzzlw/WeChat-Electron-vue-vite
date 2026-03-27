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
      // 如果该会话ID还没有数组，先初始化一个空数组
      if (!this.messageMap[conversationId]) {
        this.messageMap[conversationId] = []
      }
      // 再添加消息，需要在头部拼接消息
      this.messageMap[conversationId].unshift(message)
    },
    addMessageMap(conversationId: string, message: Message) {
      // 如果该会话ID还没有数组，先初始化一个空数组
      if (!this.messageMap[conversationId]) {
        this.messageMap[conversationId] = []
      }
      // 再添加消息，需要在尾部拼接消息
      this.messageMap[conversationId].push(message)
    },
    sendMessage(message: Message, conversationId: string, isGroup = false) {
      // 添加到messageMap（立即显示在UI）
      if (!this.messageMap[conversationId]) {
        this.messageMap[conversationId] = []
      }
      const messageIndex = this.messageMap[conversationId].length
      this.messageMap[conversationId].push(message)

      // 添加到pendingMessages（用于超时检测）
      this.pendingMessages.set(message.id, {
        id: message.id,
        sentAt: Date.now(),
        status: 0,
        conversationId,
        index: messageIndex
      })

      console.log(this.pendingMessages)

      // 启动超时检测器
      this.startTimeoutChecker()

      // 通过WebSocket发送消息
      try {
        (window as any).wsApi.sendMessage(1, 0, message)
      } catch (error) {
        // 发送失败，立即标记为失败
        this.markMessageFailed(message.id, '发送失败')
      }

      return message.id
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
    // 添加文件消息
    addFileMessage(fileId: string, message: Message) {
      this.fileMessgaeMap[fileId] = message
    },
    // 获取文件信息
    getFileMessage(fileId: string) {
      return this.fileMessgaeMap[fileId]
    },
    // 补充文件信息的路径
    addFileUrl(fileId: string, remoteUrl: string) {
      this.fileMessgaeMap[fileId].remoteUrl = remoteUrl
    }
  }
})
