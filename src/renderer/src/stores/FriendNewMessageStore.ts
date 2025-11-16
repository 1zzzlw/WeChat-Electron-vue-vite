import { defineStore } from 'pinia'

// 用来存储消息列表中的部分好友和聊天记录

interface friendNewMessage {
  id: string | number
  username: string
  avatar: string
  remark: string
  // 查询消息列表中的最新消息和时间以后在加
  // message: string
  // time: number
}

export const friendNewMessageInfo = defineStore('friendNewMessageInfo', {
  state: () => {
    return {
      // 键为会话id
      friendNewMessageMap: {} as Record<string, friendNewMessage>
    }
  },
  actions: {
    setFriendNewMessageMap(conversationId: string, friendNewMessage: friendNewMessage) {
      this.friendNewMessageMap[conversationId] = friendNewMessage
    },
    getAvatar(conversationId: string) {
      return this.friendNewMessageMap[conversationId].avatar
    },
    getUsername(conversationId: string) {
      return this.friendNewMessageMap[conversationId].username
    },
    getRemark(conversationId: string) {
      return this.friendNewMessageMap[conversationId].remark
    }
  }
})
