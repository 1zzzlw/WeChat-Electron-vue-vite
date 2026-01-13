import { getMessageListApi } from "../api/Message"

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
    if (messagePageInfo.noData) {
        // TODO 如果本地数据库中没有了数据，发送请求从服务端拉取旧数据
        return
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

    if (pageTotal === pageNO) {
        // 说明当前数据库没有了数据
        messagePageInfo.noData = true
        console.info('该会话的消息查询完了')
    }

    // 分页页码加一
    messagePageInfo.pageNO++

    // 消息进行倒叙排序
    messageList.sort((a, b) => {
        return a.id - b.id
    })

    console.log('查询分页数据', messageList)
    console.log(messagePageInfo)
    return messageList
}

export {
    getConversationList,
    getFriendList,
    getMessageList
}