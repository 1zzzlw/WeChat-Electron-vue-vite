import { defineStore } from 'pinia'

// 用来存储消息列表中的部分好友和聊天记录

interface userNewMessage {
  id: string | number
  username: string
  avatar: string
  remark: string
  // 查询消息列表中的最新消息和时间以后在加
  // message: string
  // time: number
}

export const userNewMessageInfo = defineStore('userNewMessageInfo', {
  state: () => {
    return {
      // 键为会话id
      userNewMessageMap: {} as Record<string, userNewMessage>
    }
  },
  actions: {
    setUserNewMessageMap(conversationId: string, userNewMessage: userNewMessage) {
      this.userNewMessageMap[conversationId] = userNewMessage
    }
  }
})
