import { defineStore } from 'pinia'
import { Friend } from '../types/friend'

// 用来临时存储联系人列表

export const friendInfo = defineStore('friendListInfo', {
  state: () => {
    return {
      // Record<键类型, 值类型>：键是string/number，值是userInfo
      friendInfoMap: {} as Record<string | number, Friend>,
      onlineUserIds: new Set<string>(),
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
    serializer: {
      serialize: (state) => {
        return JSON.stringify({
          friendInfoMap: state.friendInfoMap,
          onlineUserIds: Array.from(state.onlineUserIds),  // Set 转 Array
          _cacheVersion: state._cacheVersion,
          _cacheTimestamp: state._cacheTimestamp
        })
      },
      deserialize: (value) => {
        const data = JSON.parse(value)
        return {
          friendInfoMap: data.friendInfoMap || {},
          onlineUserIds: new Set(data.onlineUserIds || []),  // Array 转 Set
          _cacheVersion: data._cacheVersion || '',
          _cacheTimestamp: data._cacheTimestamp || 0
        }
      }
    }
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
    addUserOnline(friendId: string) {
      this.onlineUserIds.add(friendId)
      this.friendInfoMap[friendId].isOnline = true
    },
    addUserListOnline(friendIds: Array<string>) {
      for (const friendId of friendIds) {
        this.onlineUserIds.add(friendId)
        this.friendInfoMap[friendId].isOnline = true
      }
    },
    isUserOnline(friendId: string) {
      if (this.friendInfoMap[friendId].isOnline === undefined) {
        this.friendInfoMap[friendId].isOnline = false
      }
      if (this.onlineUserIds.has(friendId)) {
        this.friendInfoMap[friendId].isOnline = true
      }
      return this.friendInfoMap[friendId].isOnline
    },
    removeUserOnline(friendId: string) {
      this.onlineUserIds.delete(friendId)
      this.friendInfoMap[friendId].isOnline = false
    },
    getFriendMap(friendId: string | number): Friend | undefined {
      return this.friendInfoMap[friendId]
    },
    restoreOnlineStatus() {
      this.onlineUserIds.forEach(friendId => {
        if (this.friendInfoMap[friendId]) {
          this.friendInfoMap[friendId].isOnline = true
        }
      })
    },
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
