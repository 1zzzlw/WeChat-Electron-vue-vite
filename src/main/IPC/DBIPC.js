import { ipcMain } from 'electron'
import { store } from '../index'
import { queryConversation, queryFriend } from '../DB/select'

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

ipcMain.handle('query:message', (e) => {

})