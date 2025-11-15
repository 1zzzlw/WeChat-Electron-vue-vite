import { defineStore } from 'pinia'

interface userInfo {
  id: string | number
  username: string
  avatar: string
  remark: string
}

export const userListInfo = defineStore('userListInfo', {
  state: () => {
    return {
      // Record<键类型, 值类型>：键是string/number，值是userInfo
      userMap: {} as Record<string | number, userInfo>
    }
  },
  actions: {
    setUserMap(userId: string | number, userInfo: userInfo) {
      if (this.userMap[userId]) {
        // 已有数据，可做合并更新（保留原有 remark，只更新其他字段）
        this.userMap[userId] = { ...this.userMap[userId], ...userInfo }
      } else {
        // 新数据，直接赋值
        this.userMap[userId] = userInfo
      }
    },
    // userInfo | undefined 表示函数调用后可能返回 UserInfo 类型的对象，也可能返回 undefined
    getUserMap(userId: string | number): userInfo | undefined {
      return this.userMap[userId]
    },
    // Partial<UserInfo> 是 TypeScript 的工具类型，作用是把 userInfo 接口的所有字段都变成 “可选的”
    // 比如原本 UserInfo 要求必须有 id、name、avatar，用 Partial 后，传其中一个或几个字段都合法
    updateUserMap(userId: string | number, partialInfo: Partial<userInfo>) {
      // 获得未修改前的用户信息
      const existingUser = this.userMap[userId]
      // 只有修改前的用户信息不为空才能进行更新
      if (existingUser) {
        // 合并新旧数据并更新
        // ...existingUser：把现有用户的所有字段 “展开”；
        // ...partialInfo：把要更新的字段 “展开”，并且新字段会覆盖旧字段（如果有重名的话）；
        this.userMap[userId] = { ...existingUser, ...partialInfo }
      }
    },
    deleteUserMap(userId: string | number) {
      delete this.userMap[userId]
    }
  }
})
