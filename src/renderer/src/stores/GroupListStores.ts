import { defineStore } from 'pinia'

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
      groupListMap: {} as Record<string | number, groupInfo>
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
    }
  }
})
