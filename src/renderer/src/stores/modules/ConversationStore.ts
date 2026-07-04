import { defineStore } from 'pinia'
import { Conversation } from '@/types/conversation'
import { checkCache } from '@/utils/cache'

// 会话列表存储模块

export const conversationInfo = defineStore('conversationMap', {
  state: () => {
    return {
      // 键为单聊会话id
      conversationMap: {} as Record<string, Conversation>,
      // 缓存版本号
      _cacheVersion: '',
      // 缓存时间戳  
      _cacheTimestamp: 0
    }
  },
  persist: {
    // 存储位置：localStorage 
    storage: localStorage,
    key: 'conversationMap',
    // 只持久化指定状态
    pick: ['conversationMap', '_cacheVersion', '_cacheTimestamp']
  },
  actions: {
    // 初始化缓存
    initCache(userId: string) {
      const valid = checkCache(this, userId)
      if (!valid) {
        this.conversationMap = {}
        return false
      }
      console.info('会话信息缓存没有过期')
      return true
    },
    // 会话id为键，传入部分数据进行更新
    setConversationMap(conversationId: string, partialInfo: Partial<Conversation>) {
      const oldInfo = this.conversationMap[conversationId] || {}

      this.conversationMap[conversationId] = {
        ...oldInfo,
        ...partialInfo
      }
    },
    getGroupConversationList() {
      return Object.values(this.conversationMap)
        .filter((conversation) => conversation.type === 1)
    },
    getSortedConversationList() {
      return Object.values(this.conversationMap).sort((a, b) => {
        // Pinned conversations first
        if (a.isTop !== b.isTop) return (b.isTop ?? 0) - (a.isTop ?? 0)
        // Then sort by latest message time (descending)
        return (b.latestMsgTime ?? 0) - (a.latestMsgTime ?? 0)
      })
    },
    getGroupConversationInfo(conversationId: string) {
      return this.conversationMap[conversationId];
    },
    clearUnreadCount(conversationId: string) {
      // 清除未读消息数量 
      this.setConversationMap(conversationId, {
        unreadCount: 0
      })
    },
    addUnreadCount(conversationId: string) {
      // 未读消息数量增涨
      const currentUnreadCount = this.conversationMap[conversationId]?.unreadCount ?? 0;
      this.setConversationMap(conversationId, {
        unreadCount: currentUnreadCount + 1
      })
    },
    removeConversation(conversationId: string) {
      if (this.conversationMap[conversationId]) {
        delete this.conversationMap[conversationId]
      }
    },
    updateConversationAvatar(conversationId: string, avatar: string) {
      if (this.conversationMap[conversationId]) {
        this.conversationMap[conversationId].avatar = avatar
      }
    },
    updateConversationTopStatus(conversationId: string, status: number) {
      if (this.conversationMap[conversationId]) {
        this.conversationMap[conversationId].isTop = status
      }
    },
    updateConversationMuteStatus(conversationId: string, status: number) {
      if (this.conversationMap[conversationId]) {
        this.conversationMap[conversationId].isMute = status
      }
    },
    deleteConversation(conversationId: string) {
      if (this.conversationMap[conversationId]) {
        delete this.conversationMap[conversationId]
      }
    },
    // 获得群聊数量
    getGroupConversationCount() {
      return this.getGroupConversationList().length
    }
  }
})
