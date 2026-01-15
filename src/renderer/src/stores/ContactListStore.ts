import { defineStore } from 'pinia'
import { Friend } from '../types/friend'

// 用来临时存储联系人列表

export const friendInfo = defineStore('friendListInfo', {
  state: () => {
    return {
      // Record<键类型, 值类型>：键是string/number，值是userInfo
      friendInfoMap: {} as Record<string | number, Friend>,
      // 缓存版本号
      _cacheVersion: '',
      // 缓存时间戳  
      _cacheTimestamp: 0
    }
  },
  persist: {
    // 存储位置：localStorage 
    storage: localStorage,
    key: 'friendInfo-store',
    // 只持久化指定状态
    pick: ['friendInfoMap', '_cacheVersion', '_cacheTimestamp']
  },
  actions: {
    initCache(userId: string) {
      const currentCacheVersion = `${userId}_${Date.now()}`
      // 缓存有效期
      const cacheAccess = Date.now() - this._cacheTimestamp
      if (!this._cacheVersion.startsWith(userId) || cacheAccess > 5 * 60 * 1000) {
        // 缓存过期，清空数据
        this.friendInfoMap = {}
        this._cacheVersion = currentCacheVersion
        this._cacheTimestamp = Date.now()
        return false
      }
      console.info('好友信息缓存没有过期')
      return true
    },
    setFriendMap(friendId: string | number, partialInfo: Partial<Friend>) {
      this.friendInfoMap[friendId] = {
        ...this.friendInfoMap[friendId],
        ...partialInfo
      }
    },
    getFriendMap(friendId: string | number): Friend | undefined {
      return this.friendInfoMap[friendId]
    },
    // Partial<UserInfo> 是 TypeScript 的工具类型，作用是把 userInfo 接口的所有字段都变成 “可选的”
    // 比如原本 UserInfo 要求必须有 id、name、avatar，用 Partial 后，传其中一个或几个字段都合法
    updateFriendMap(friendId: string | number, partialInfo: Partial<Friend>) {
      // 获得未修改前的用户信息
      const existingUser = this.friendInfoMap[friendId]
      // 只有修改前的用户信息不为空才能进行更新
      if (existingUser) {
        // 合并新旧数据并更新
        // ...existingUser：把现有用户的所有字段 “展开”；
        // ...partialInfo：把要更新的字段 “展开”，并且新字段会覆盖旧字段（如果有重名的话）；
        this.friendInfoMap[friendId] = { ...existingUser, ...partialInfo }
      }
    },
    deleteFriendMap(friendId: string | number) {
      delete this.friendInfoMap[friendId]
    }
  }
})
