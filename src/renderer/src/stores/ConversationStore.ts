import { defineStore } from 'pinia'

// 会话列表存储模块

interface conversation {
  id: string | number
  username: string
  avatar: string
  remark: string
  latestMsg: string
  latestMsgTime: string
  unreadCount: number
  isTop: number
  status: number
}

export const conversationInfo = defineStore('conversationInfo', {
  state: () => {
    return {
      // 键为会话id
      conversationMap: {} as Record<string, conversation>
    }
  },
  actions: {
    // 会话id为键，传入部分数据进行更新
    setConversationMap(conversationId: string, partialInfo: Partial<conversation>) {
      this.conversationMap[conversationId] = {
        ...this.conversationMap[conversationId],
        ...partialInfo
      }
    },
    getAvatar(conversationId: string) {
      return this.conversationMap[conversationId].avatar
    },
    getUsername(conversationId: string) {
      return this.conversationMap[conversationId].username
    },
    getRemark(conversationId: string) {
      return this.conversationMap[conversationId].remark
    }
  }
})
