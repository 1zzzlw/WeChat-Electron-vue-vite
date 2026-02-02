import { ipcMain } from 'electron'
import { store } from '../index'
import { queryConversation, queryFriend, loadMessage } from '../DB/select'
import { saveSentMessage, saveLoadMessage, addConversation, addFriendRelation } from '../DB/insert'
import { updateConversation, updateMessage } from '../DB/update'

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
