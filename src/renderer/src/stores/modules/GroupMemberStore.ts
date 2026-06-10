import { defineStore } from 'pinia'

interface groupMember {
  conversationId: string | number
  userId: string | number
  username: string
  role: number
  avatar: string
  isMute?: number
}

export const groupMemberInfo = defineStore('groupMemberInfo', {
  state: () => {
    return {
      // 键为会话id
      groupMemberMap: {} as Record<string, groupMember[]>,
      groupMemberAvatarMap: {} as Record<string, string>
    }
  },
  actions: {
    // 会话id为键，传入部分数据进行更新
    initGroupMemberMap(conversationId: string) {
      if (!this.groupMemberMap[conversationId]) {
        this.groupMemberMap[conversationId] = []
      }
    },
    addGroupMember(conversationId: string, groupMember: groupMember) {
      if (!this.groupMemberMap[conversationId]) {
        this.groupMemberMap[conversationId] = []
      }
      this.groupMemberMap[conversationId].push(groupMember)
    },
    addGroupMemberAvatar(userId: string, avatar: string) {
      this.groupMemberAvatarMap[userId] = avatar
    },
    getGroupMemberAvatar(userId: string | number) {
      return this.groupMemberAvatarMap[userId]
    },
    getGroupMemberList(conversationId: string) {
      return this.groupMemberMap[conversationId]
    }
  }
})
