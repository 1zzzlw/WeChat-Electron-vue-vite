import { defineStore } from 'pinia'

interface userApplyInfo {
  applyId: string | number
  fromUserId: string | number
  username: string
  avatar: string
  applyMsg: string
  isDealt: 0 | 1
  dealResult: 0 | 1
}

export const userApplyListInfo = defineStore('userApplyListInfo', {
  state: () => {
    return {
      // Record<键类型, 值类型>：键是string/number，值是userInfo
      userApplyMap: {} as Record<string | number, userApplyInfo>
    }
  },
  actions: {
    setUserApplyMap(userId: string | number, userInfo: userApplyInfo) {
      this.userApplyMap[userId] = userInfo
    },
    // userInfo | undefined 表示函数调用后可能返回 UserInfo 类型的对象，也可能返回 undefined
    getUserApplyMap(userId: string | number): userApplyInfo | undefined {
      return this.userApplyMap[userId]
    },
    getAllUserApplyMap(): userApplyInfo[] {
      return Object.values(this.userApplyMap)
    },
    // Partial<UserInfo> 是 TypeScript 的工具类型，作用是把 userInfo 接口的所有字段都变成 “可选的”
    // 比如原本 UserInfo 要求必须有 id、name、avatar，用 Partial 后，传其中一个或几个字段都合法
    updateUserApplyMap(userId: string | number, partialInfo: Partial<userApplyInfo>) {
      // 获得未修改前的用户信息
      const existingUserApply = this.userApplyMap[userId]
      // 只有修改前的用户信息不为空才能进行更新
      if (existingUserApply) {
        // 合并新旧数据并更新
        // ...existingUserApply：把现有用户的所有字段 “展开”；
        // ...partialInfo：把要更新的字段 “展开”，并且新字段会覆盖旧字段（如果有重名的话）；
        this.userApplyMap[userId] = { ...existingUserApply, ...partialInfo }
      }
    },
    deleteUserApplyMap(userId: string | number) {
      delete this.userApplyMap[userId]
    }
  }
})
