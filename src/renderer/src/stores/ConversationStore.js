import { defineStore } from 'pinia'

// 会话列表存储模块

export const conversationInfo = defineStore('conversationInfo', {
  state: () => {
    return {
      // 键为单聊会话id
      conversationMap: {},
    }
  },
  persist: {
    // 存储位置：localStorage
    storage: localStorage,
    key: 'conversation-store',
    // 只持久化指定状态
    paths: ['conversationMap']
  },
  actions: {
    // 会话id为键，传入部分数据进行更新
    setConversationMap(conversationId, partialInfo) {
      this.conversationMap[conversationId] = {
        ...this.conversationMap[conversationId],
        ...partialInfo
      }
    },
    getConversationMap(conversationId) {
      console.info('查找结果:', this.conversationMap[conversationId])
      return this.conversationMap[conversationId]
    },
    getAvatar(conversationId) {
      // 单聊会话，返回好友头像
      const conversation = this.conversationMap[conversationId]
      return conversation?.avatar
    },
    getUsername(conversationId) {
      return this.conversationMap[conversationId].username
    },
    getRemark(conversationId) {
      return this.conversationMap[conversationId].remark
    },
    clearUnreadCount(conversationId) {
      // @ts-ignore 单聊会话，清除未读消息数量 
      this.setConversationMap(conversationId, {
        unreadCount: 0
      })
    },
    addUnreadCount(conversationId) {
      // @ts-ignore 单聊会话，未读消息数量增涨
      this.setConversationMap(conversationId, {
        unreadCount: this.conversationMap[conversationId].unreadCount + 1
      })
    }
  }
})
