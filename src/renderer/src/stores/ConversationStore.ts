import { defineStore } from 'pinia'

// 会话列表存储模块

interface conversation {
  id: string | number
  friendId: string | number
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
      // 键为单聊会话id
      conversationMap: {} as Record<string, conversation>,
      // 键为群聊会话id
      groupConversationMap: {} as Record<string, conversation>
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
    setGroupConversationMap(groupConversationId: string, partialInfo: Partial<conversation>) {
      this.groupConversationMap[groupConversationId] = {
        ...this.groupConversationMap[groupConversationId],
        ...partialInfo
      }
    },
    getAvatar(conversationId: string) {
      if (!conversationId.startsWith('g_')) {
        // 单聊会话，返回好友头像
        return this.conversationMap[conversationId].avatar
      } else {
        // 群聊会话，返回群聊头像
        return this.groupConversationMap[conversationId].avatar
      }
    },
    getUsername(conversationId: string) {
      if (!conversationId.startsWith('g_')) {
        // 单聊会话，返回好友用户名
        return this.conversationMap[conversationId].username
      } else {
        // 群聊会话，返回群聊名称
        return this.groupConversationMap[conversationId].username
      }
    },
    getRemark(conversationId: string) {
      if (!conversationId.startsWith('g_')) {
        // 只有单聊会话才会有remark，群聊会话remark为空字符串
        return this.conversationMap[conversationId].remark
      } else {
        return ''
      }
    },
    clearUnreadCount(conversationId: string) {
      if (conversationId.startsWith('g_')) {
        // 群聊会话，清除未读消息数量
        this.setGroupConversationMap(conversationId, {
          unreadCount: 0
        })
      } else {
        // 单聊会话，清除未读消息数量
        this.setConversationMap(conversationId, {
          unreadCount: 0
        })
      }
    },
    getUnreadCount(conversationId: string) {
      if (conversationId.startsWith('g_')) {
        // 群聊会话，返回未读消息数量
        return this.groupConversationMap[conversationId].unreadCount
      } else {
        // 单聊会话，返回未读消息数量
        return this.conversationMap[conversationId].unreadCount
      }
    }
  }
})
