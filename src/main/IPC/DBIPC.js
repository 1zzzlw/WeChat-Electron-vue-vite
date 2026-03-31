import { ipcMain } from 'electron'
import { store } from '../index'
import { queryConversation, queryFriend, loadMessage, getFriendInfoById, getConversationInfoById, getImageUrlList, getVideoUrlList, getFavorites } from '../DB/select'
import { saveSentMessage, saveLoadMessage, addConversation, addFriendRelation, uploadNoteContent, addFavorites } from '../DB/insert'
import { updateConversation, updateMessage, updateOldNoteContent } from '../DB/update'
import { clearHistoryMessage, deleteMessage, deleteFriend, deleteConversation } from '../DB/delete'

ipcMain.handle('query:conversation', (e) => {
    const userId = store.get('userId')
    console.log('用户', userId, '查询会话')
    return queryConversation(userId)
})

ipcMain.handle('query:friend', (e) => {
    const userId = store.get('userId')
    console.log('用户', userId, '查询好友')
    return queryFriend(userId)
})

ipcMain.handle('load:message', (e, conversationId, messagePageInfo) => {
    console.log(`查询会话${conversationId}的分页信息`)
    console.log(messagePageInfo)
    return loadMessage(conversationId, messagePageInfo)
})

ipcMain.on('save:message', (e, message) => {
    console.log(`保存消息${message}到本地数据库`)
    saveSentMessage(message)
})

ipcMain.on('save:loadMessage', (e, messageList) => {
    console.log(`从服务端加载的消息为${messageList}`)
    saveLoadMessage(messageList)
})

ipcMain.on('update:conversation', (e, condition, data) => {
    console.log(`会话列表更新数据`, condition, data)
    updateConversation(condition, data)
})

ipcMain.on('add:conversation', (e, conversationPack) => {
    console.log(`新增会话${conversationPack}`)
    addConversation(conversationPack)
})

ipcMain.on('add:friendRelation', (e, friendPack) => {
    console.log(`新增好友`)
    console.log(friendPack)
    addFriendRelation(friendPack)
})

ipcMain.on('update:message', (e, condition, data) => {
    console.log(`消息表更新数据`, condition, data)
    updateMessage(condition, data)
})

ipcMain.handle('query:friendInfo', (e, friendId) => {
    console.log(`查询好友${friendId}的信息`)
    const userId = store.get('userId')
    return getFriendInfoById(userId, friendId)
})

ipcMain.handle('query:conversationInfo', (e, conversationId) => {
    console.log(`查询会话${conversationId}的信息`)
    const userId = store.get('userId')
    return getConversationInfoById(userId, conversationId)
})

ipcMain.handle('query:imageUrlList', () => {
    console.log(`查询所有的照片路径`)
    return getImageUrlList()
})

ipcMain.handle('query:videoUrlList', () => {
    console.log(`查询所有的视频路径`)
    return getVideoUrlList()
})

ipcMain.on('save:note', (e, data) => {
    const userId = String(store.get('userId'))
    data.userId = userId
    console.log(`保存的笔记内容为${data}`)
    uploadNoteContent(data)
})

ipcMain.handle('query:favoritesList', () => {
    const userId = String(store.get('userId'))
    return getFavorites(userId)
})

ipcMain.on('update:note', (e, condition, data) => {
    updateOldNoteContent(condition, data)
})

ipcMain.on('add:note', (e, favoritesPack) => {
    console.log(favoritesPack)
    addFavorites(favoritesPack)
})

ipcMain.on('clear:historyMessage', (e, conversationId) => {
    console.log(`清空会话${conversationId}的消息`)
    return clearHistoryMessage(conversationId)
})

ipcMain.on('delete:message', (e, conversationId, messageId) => {
    console.log(`删除会话${conversationId}的消息${messageId}`)
    return deleteMessage(conversationId, messageId)
})

ipcMain.on('delete:friend', (e, friendId) => {
    const userId = String(store.get('userId'))
    return deleteFriend(userId, friendId)
})

ipcMain.on('delete:conversation', (e, conversationId) => {
    return deleteConversation(conversationId)
})