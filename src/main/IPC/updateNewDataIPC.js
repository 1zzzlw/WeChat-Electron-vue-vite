import { ipcMain } from "electron";
import { store } from '../index'
import { multipleInsert } from "../DB/mainDB";

// 更新在离线错过的消息到本地数据库
ipcMain.on('update:db', async (e) => {
    const api = 'http://localhost:8080'

    const token = store.get('accessToken')
    // 全量更新会话表
    const conversationResponse = await fetch(`${api}/conversation/init/list?isInit=false`, {
        headers: {
            Authorization: token,
            'Content-Type': 'application/json'
        }
    })

    if (!conversationResponse.ok) {
        throw new Error(`获取会话列表失败: ${conversationResponse.status}`)
    }

    const conversationResponseData = await conversationResponse.json()

    const conversation = conversationResponseData.data

    console.log('更新过的会话数据', conversation)

    if (conversation.length > 0) {
        // 覆盖插入更新过的会话表
        multipleInsert('insert or replace', 'conversation', conversation)
    }

    // 需要更新的会话id集合
    const conversationIds = conversation.map(c => c.id)

    console.info('需要更新的会话id集合', conversationIds)

    // 全量更新好友表
    const friendRelationResponse = await fetch(`${api}/friend/init/list?isInit=false`, {
        headers: {
            Authorization: token,
            'Content-Type': 'application/json'
        }
    })

    if (!friendRelationResponse.ok) {
        throw new Error(`获取好友表失败: ${friendRelationResponse.status}`)
    }

    const friendRelationResponseData = await friendRelationResponse.json()

    const friend_relation = friendRelationResponseData.data

    console.log('更新过的好友信息', friend_relation)

    if (friend_relation.length > 0) {
        // 覆盖插入更新过的好友信息
        multipleInsert('insert or replace', 'friend_relation', friend_relation)
    }

    // 增量更新消息表，根据最新消息时间和会话id
    let message = []

    if (conversationIds.length > 0) {
        // 发送 HTTP 请求获取消息列表
        const messageResponse = await fetch(`${api}/message/init/list/${conversationIds}?isInit=false`, {
            headers: {
                Authorization: token,
                'Content-Type': 'application/json'
            }
        })

        if (!messageResponse.ok) {
            throw new Error(`获取消息表失败: ${messageResponse.status}`)
        }

        const messageResponseData = await messageResponse.json()

        message = messageResponseData.data === null ? [] : messageResponseData.data

        console.info('离线期间收到的消息', message)

        if (message.length > 0) {
            // 新增离线期间收到的消息
            multipleInsert('insert or ignore', 'message', message)
        }
    }
})