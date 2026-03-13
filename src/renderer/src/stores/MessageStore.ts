import { defineStore } from 'pinia'
import { Message } from '../types/message'

// 聊天记录存储模块

export const messageInfo = defineStore('messageInfo', {
  state: () => {
    return {
      // 会话id当键，消息当值
      messageMap: {} as Record<string, Message[]>,
      fileMessgaeMap: {} as Record<string, Message>
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
      console.info(this.messageMap[conversationId])
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
