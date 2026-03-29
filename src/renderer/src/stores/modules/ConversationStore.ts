import { defineStore } from 'pinia'
import { Conversation } from '../../types/conversation'

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
      // 本次登录生成的唯一版本号
      const currentCacheVersion = `${userId}_${Date.now()}`
      // 缓存的有效期
      const cacheAccess = Date.now() - this._cacheTimestamp
      // 设置缓存的有效期为 5 分钟，所以如果在五分钟内连续登录和退出，缓存并不会更新
      if (!this._cacheVersion.startsWith(userId) || cacheAccess > 5 * 60 * 1000) {
        // 缓存过期，清空数据
        this.conversationMap = {}
        this._cacheVersion = currentCacheVersion
        this._cacheTimestamp = Date.now()
        return false
      }
      console.info('会话信息缓存没有过期,')
      // 缓存没有过期
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
      return Object.entries(this.conversationMap)
        .filter(([conversationId]) => conversationId.startsWith('g'))
        .map(([, conversation]) => conversation)
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
  }
})
