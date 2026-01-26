import { pullMessageListApi } from "../api/Message"

/**
 * 从本地获取会话列表，本地会话列表已经是全量数据，不需要从服务端拉取，本地没有服务端就没有
 */
const getConversationList = async () => {
    const conversationList = await window.dbApi.queryConversationList()
    console.log(conversationList)
    return conversationList
}

/**
 * 从本地获取好友列表，本地好友列表已经是全量数据，不需要从服务端拉取，本地没有服务端就没有
 */
const getFriendList = async () => {
    const friendList = await window.dbApi.queryFriendList()
    console.log(friendList)
    return friendList
}

/**
 * 从本地获取消息列表，如果本地数据不够或缺失，从服务端拉取
 * @param conversationId -- 会话id
 * @param messagePageInfo -- 消息分页的基本配置列表 
 * @returns -- 消息结果
 */
const getMessageList = async (conversationId, messagePageInfo) => {
    if (messagePageInfo.noData && messagePageInfo.maxMessageId != null) {
        // TODO 如果本地数据库中没有了数据，发送请求从服务端拉取旧数据
        console.info('没有值了')
        const result = await pullMessageListApi({
            conversationId: conversationId,
            maxMessageId: messagePageInfo.maxMessageId
        })
        console.info(result.data)
        if (result.data.length === 0) {
            console.info('服务端也没有数据了')
            return []
        } else {
            console.info('服务端还有值')
            messagePageInfo.maxMessageId = result.data[result.data.length - 1].id
            return result.data
        }
    }
    const messagePageResult = await window.dbApi.loadMessage(conversationId, {
        pageNO: messagePageInfo.pageNO,
        maxMessageId: messagePageInfo.maxMessageId
    })

    console.info('查询消息分页结果', messagePageResult)

    const messageList = messagePageResult.dataList
    const pageTotal = messagePageResult.pageTotal
    // 目前查询的页码
    const pageNO = messagePageResult.pageNO

    console.info(pageTotal, pageNO)

    if (pageTotal === pageNO) {
        // 已经到了最后一页，本地数据库中没有数据
        messagePageInfo.noData = true
        console.info('该会话的消息查询完了')
    } else {
        // 本地数据库内还有值，分页页码加一
        messagePageInfo.pageNO++
    }

    if (messageList.length > 0) {
        // 最大id赋值
        messagePageInfo.maxMessageId = messageList[messageList.length - 1].id
    }

    console.log('查询分页数据', messageList)
    console.log(messagePageInfo)
    return messageList
}

/**
 * 保存已经发送成功的消息到本地数据库
 * @param message -- 单条消息 
 */
const saveSentMessage = async (message) => {
    await window.dbApi.saveSentMessage(message)
}

/**
 * 保存从服务端拉取过来的分页消息
 * @param messageList -- 消息数组
 */
const saveLoadMessage = async (messageList) => {
    await window.dbApi.saveLoadMessage(messageList)
}

/**
 * 更新会话表中的字段信息
 * @param data -- 消息表的更新字段 
 */
const updateConversation = async (condition, data) => {
    await window.dbApi.updateConversation(condition, data)
}

export {
    getConversationList,
    getFriendList,
    getMessageList,
    saveSentMessage,
    saveLoadMessage,
    updateConversation
}