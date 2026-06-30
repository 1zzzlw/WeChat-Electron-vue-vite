import { ipcMain } from 'electron'
import { store } from '../shared.js'
import { queryConversation, queryFriend, loadMessage, getFriendInfoById, getConversationInfoById, getImageUrlList, getVideoUrlList, getFavorites, getFavoritesAll, getNodeCount } from '../DB/select'
import { saveSentMessage, saveLoadMessage, addConversation, addFriendRelation, uploadNoteContent, addFavorites } from '../DB/insert'
import { updateConversation, updateMessage, updateOldNoteContent, updateFriendRelation } from '../DB/update'
import { clearHistoryMessage, deleteMessage, deleteFriend, deleteConversation, deleteFavorite } from '../DB/delete'

// ─── 统一的 IPC 错误处理包装器 ───────────────────────────────────────

/**
 * 包装 ipcMain.handle 处理器 — 捕获异常，返回统一错误对象。
 * 渲染进程应检查 result?.error，若有则说明操作失败。
 */
const safeHandle = (channel, fn) => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await fn(event, ...args)
    } catch (err) {
      console.error(`IPC [${channel}] 出错:`, err)
      return { success: false, error: err.message || String(err) }
    }
  })
}

/**
 * 包装 ipcMain.on 处理器 — 捕获异常，防止主进程崩溃（fire-and-forget 无返回值）。
 */
const safeOn = (channel, fn) => {
  ipcMain.on(channel, (event, ...args) => {
    try {
      fn(event, ...args)
    } catch (err) {
      console.error(`IPC [${channel}] 出错:`, err)
    }
  })
}

// ─── 查询类 handle（返回数据） ───────────────────────────────────────

safeHandle('query:conversation', () => {
  const userId = store.get('userId')
  console.log('用户', userId, '查询会话')
  return queryConversation(userId)
})

safeHandle('query:friend', () => {
  const userId = store.get('userId')
  console.log('用户', userId, '查询好友')
  return queryFriend(userId)
})

safeHandle('load:message', (_event, conversationId, messagePageInfo) => {
  console.log(`查询会话${conversationId}的分页信息`, messagePageInfo)
  return loadMessage(conversationId, messagePageInfo)
})

safeHandle('query:friendInfo', (_event, friendId) => {
  console.log(`查询好友${friendId}的信息`)
  const userId = store.get('userId')
  return getFriendInfoById(userId, friendId)
})

safeHandle('query:conversationInfo', (_event, conversationId) => {
  console.log(`查询会话${conversationId}的信息`)
  const userId = store.get('userId')
  return getConversationInfoById(userId, conversationId)
})

safeHandle('query:imageUrlList', () => {
  console.log('查询所有的照片路径')
  return getImageUrlList()
})

safeHandle('query:videoUrlList', () => {
  console.log('查询所有的视频路径')
  return getVideoUrlList()
})

safeHandle('query:favoritesList', () => {
  const userId = String(store.get('userId'))
  return getFavorites(userId)
})

safeHandle('query:nodeCount', () => {
  const userId = String(store.get('userId'))
  return getNodeCount(userId)
})

safeHandle('query:favoritesAll', () => {
  const userId = String(store.get('userId'))
  return getFavoritesAll(userId)
})

safeHandle('add:note', (_event, favoritesPack) => {
  console.log('添加收藏:', favoritesPack)
  const result = addFavorites(favoritesPack)
  if (result === undefined) {
    return { success: false, error: '数据库写入失败' }
  }
  return { success: true }
})

// ─── 写入/更新/删除类 on（fire-and-forget） ──────────────────────────

safeOn('save:message', (_event, message) => {
  console.log(`保存消息到本地数据库`, message)
  saveSentMessage(message)
})

safeOn('save:loadMessage', (_event, messageList) => {
  console.log(`从服务端加载的消息批量写入`)
  saveLoadMessage(messageList)
})

safeOn('update:conversation', (_event, condition, data) => {
  console.log('会话列表更新数据', condition, data)
  updateConversation(condition, data)
})

safeOn('add:conversation', (_event, conversationPack) => {
  console.log('新增会话', conversationPack)
  addConversation(conversationPack)
})

safeOn('add:friendRelation', (_event, friendPack) => {
  console.log('新增好友', friendPack)
  addFriendRelation(friendPack)
})

safeOn('update:message', (_event, condition, data) => {
  console.log('消息表更新数据', condition, data)
  updateMessage(condition, data)
})

safeOn('save:note', (_event, data) => {
  const userId = String(store.get('userId'))
  data.userId = userId
  console.log('保存笔记')
  uploadNoteContent(data)
})

safeOn('update:note', (_event, condition, data) => {
  updateOldNoteContent(condition, data)
})

safeOn('clear:historyMessage', (_event, conversationId) => {
  console.log(`清空会话${conversationId}的消息`)
  clearHistoryMessage(conversationId)
})

safeOn('delete:message', (_event, conversationId, messageId) => {
  console.log(`删除会话${conversationId}的消息${messageId}`)
  deleteMessage(conversationId, messageId)
})

safeOn('delete:friend', (_event, friendId) => {
  const userId = String(store.get('userId'))
  deleteFriend(userId, friendId)
})

safeOn('delete:conversation', (_event, conversationId) => {
  deleteConversation(conversationId)
})

safeOn('delete:favorite', (_event, favoriteId) => {
  const userId = String(store.get('userId'))
  console.log(`删除收藏${favoriteId}，用户${userId}`)
  deleteFavorite(userId, favoriteId)
})

safeOn('update:friendRelation', (_event, condition, data) => {
  const userId = String(store.get('userId'))
  condition.userId = userId
  console.log('更新好友关系', condition, data)
  updateFriendRelation(condition, data)
})
