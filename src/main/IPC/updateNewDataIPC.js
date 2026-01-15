import { ipcMain } from "electron";
import { multipleInsert } from "../DB/mainDB";
import { initConversationList, initFriendList, initMessageList } from "../API/initData";

// 更新在离线错过的消息到本地数据库
ipcMain.on('update:db', async (e) => {
    try {
        // 全量更新会话列表
        const conversationResponse = await initConversationList(false)

        const conversation = conversationResponse.data

        console.log('更新过的会话数据', conversation)

        if (conversation.length > 0) {
            // 覆盖插入更新过的会话表
            multipleInsert('insert or replace', 'conversation', conversation)
        }

        // 需要更新的会话id集合
        const conversationIds = conversation.map(c => c.id)

        console.info('需要更新的会话id集合', conversationIds)

        // 全量更新好友表
        const friendRelationResponse = await initFriendList(false)

        const friend_relation = friendRelationResponse.data

        console.log('更新过的好友信息', friend_relation)

        if (friend_relation.length > 0) {
            // 覆盖插入更新过的好友信息
            multipleInsert('insert or replace', 'friend_relation', friend_relation)
        }

        // 增量更新消息表，根据最新消息时间和会话id
        let message = []

        if (conversationIds.length > 0) {
            // 发送 HTTP 请求获取消息列表
            const messageResponse = await initMessageList(conversationIds, false)

            message = messageResponse.data === null ? [] : messageResponse.data

            console.info('离线期间收到的消息', message)

            if (message.length > 0) {
                // 新增离线期间收到的消息
                multipleInsert('insert or ignore', 'message', message)
            }
        }
    } catch (error) {
        console.log(`登录更新时出错`, error)
    }
})