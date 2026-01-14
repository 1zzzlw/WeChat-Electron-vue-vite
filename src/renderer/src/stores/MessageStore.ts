import { defineStore } from 'pinia'
import { Message } from '../types/message'

// 聊天记录存储模块

export const messageInfo = defineStore('messageInfo', {
  state: () => {
    return {
      // 会话id当键，消息当值
      messageMap: {} as Record<string, Message[]>
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
      console.info(this.messageMap[conversationId])
    },
    addMessageMap(conversationId: string, message: Message) {
      // 如果该会话ID还没有数组，先初始化一个空数组
      if (!this.messageMap[conversationId]) {
        this.messageMap[conversationId] = []
      }
      // 再添加消息，需要在头部拼接消息
      this.messageMap[conversationId].push(message)
      console.info(this.messageMap[conversationId])
    }
  }
})
