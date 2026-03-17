import { defineStore } from 'pinia'

// 群聊会话缓存，用于首次加载群聊列表时，缓存群聊信息，后续更新使用conversationStore中的群聊会话缓存

interface groupInfo {
  id: string | number
  groupName: string
  groupAvatar: string
  ownerId: string | number
  isTop: number
  latestMsg: string
  latestMsgTime: string
  status: number
}

export const groupListInfo = defineStore('groupListInfo', {
  state: () => {
    return {
      // Record<键类型, 值类型>：键是string/number，值是groupInfo
      groupListMap: {} as Record<string, groupInfo>
    }
  },
  actions: {
    setGroupListMap(groupId: string | number, groupInfo: groupInfo) {
      if (this.groupListMap[groupId]) {
        // 已有数据，可做合并更新（保留原有 remark，只更新其他字段）
        this.groupListMap[groupId] = { ...this.groupListMap[groupId], ...groupInfo }
      } else {
        // 新数据，直接赋值
        this.groupListMap[groupId] = groupInfo
      }
    },
    isOwner(groupId: string, userId: string | number) {
      console.log(this.groupListMap)
      console.log(this.groupListMap[groupId])
      if (this.groupListMap[groupId]) {
        console.log(this.groupListMap[groupId])
        return this.groupListMap[groupId].ownerId === userId
      }
    }
  }
})
