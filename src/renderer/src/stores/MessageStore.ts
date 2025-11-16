import { defineStore } from 'pinia'

// 聊天记录存储模块

interface message {
  conversationId: string
  senderId: string | number
  receiverId: string | number
  msgType: string
  content: string
  sendTime: number
  // TODO 下面写扩展字段，以后再写，因为后端还没写传过来的代码
}

export const messageInfo = defineStore('messageInfo', {
  state: () => {
    return {
      // 会话id当键，消息当值
      messageMap: {} as Record<string, message[]>
    }
  },
  actions: {
    addMessageMap(conversationId: string, message: message) {
      // 如果该会话ID还没有数组，先初始化一个空数组
      if (!this.messageMap[conversationId]) {
        this.messageMap[conversationId] = []
      }
      // 再添加消息
      this.messageMap[conversationId].push(message)
    },
    initMessageMap(conversationId: string) {
      this.messageMap[conversationId] = []
    }
  }
})
