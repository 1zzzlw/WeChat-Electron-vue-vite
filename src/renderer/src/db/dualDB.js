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
        console.info('本地没有值了')
        const result = await pullMessageListApi({
            conversationId: conversationId,
            maxMessageId: messagePageInfo.maxMessageId
        })
        console.info(result.data)
        if (result.data.length === 0) {
            console.info('服务端也没有数据了')
            return {
                messageList: [],
                isFromServer: true
            }
        } else {
            console.info('服务端还有值')
            messagePageInfo.maxMessageId = result.data[result.data.length - 1].id
            return {
                messageList: result.data,
                isFromServer: true
            }
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
    return {
        messageList: messageList,
        isFromServer: false
    }
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
 * @param data -- 会话表的更新字段 
 */
const updateConversation = async (condition, data) => {
    await window.dbApi.updateConversation(condition, data)
}

/**
 * 新增会话数据
 * @param conversationPack -- 会话信息包 
 */
const addConversation = async (conversationPack) => {
    await window.dbApi.addConversation(conversationPack)
}

/**
 * 插入新的好友列表
 * @param friendPack -- 好友信息 
 */
const addFriendRelation = async (friendPack) => {
    await window.dbApi.addFriendRelation(friendPack)
}

/**
 * 更新消息表中的字段信息
 * @param data -- 消息表的更新字段 
 */
const updateMessage = async (condition, data) => {
    await window.dbApi.updateMessageInfo(condition, data)
}

/**
 * 获取好友信息用于展示
 * @param friendId -- 好友id
 * @returns 
 */
const getFriendInfoById = async (friendId) => {
    const friendInfo = await window.dbApi.getFriendInfoById(friendId)
    console.log(friendInfo[0])
    return friendInfo[0]
}

/**
 * 获得会话信息
 * @param conversationId -- 会话id 
 */
const getConversationInfoById = async (conversationId) => {
    const conversationInfo = await window.dbApi.getConversationInfoById(conversationId)
    console.log(conversationInfo[0])
    return conversationInfo[0]
}

/**
 * 获得所有图片路径
 */
const getImageUrlList = async () => {
    const imageUrlList = await window.dbApi.getImageUrlList()
    return imageUrlList
}

/**
 * 获得所有视频路径
 */
const getVideoUrlList = async () => {
    const videoUrlList = await window.dbApi.getVideoUrlList()
    return videoUrlList
}

/**
 * 保存笔记到本地
 * @param data -- 笔记内容
 */
const uploadNoteContent = async (data) => {
    await window.dbApi.uploadNoteContent(data)
}

/**
 * 获得笔记列表和收藏列表
 * @returns 
 */
const getFavorites = async () => {
    const favoritesList = await window.dbApi.getFavorites()
    return favoritesList
}

/**
 * 更新本地笔记
 * @param data -- 新的笔记
 */
const updateOldNoteContent = async (condition, data) => {
    await window.dbApi.updateOldNoteContent(condition, data)
}

const addFavorites = async (favoritesPackList) => {
    return await window.dbApi.addFavorites(favoritesPackList)
}

const clearHistoryMessage = async (conversationId) => {
    await window.dbApi.clearHistoryMessage(conversationId)
}

const deleteMessage = async (conversationId, messageId) => {
    await window.dbApi.deleteMessage(conversationId, messageId)
}

const deleteFriend = async (friendId) => {
    await window.dbApi.deleteFriend(friendId)
}

const deleteConversation = async (conversationId) => {
    await window.dbApi.deleteConversation(conversationId)
}

const getNodeCount = async () => {
    return await window.dbApi.getNodeCount()
}

/**
 * 获取所有收藏（包括笔记和消息收藏）
 */
const getFavoritesAll = async () => {
    const favoritesList = await window.dbApi.queryFavoritesList()
    return favoritesList
}

/**
 * 删除收藏项
 * @param favoriteId -- 收藏项id
 */
const deleteFavorite = async (favoriteId) => {
    await window.dbApi.deleteFavorite(favoriteId)
}

/**
 * 更新好友关系表（本地SQLite）
 * @param condition -- 条件对象，如 { friendId: '123' }
 * @param data -- 要更新的字段，如 { remark: '新备注' } 或 { relationStatus: 2 }
 */
const updateFriendRelation = async (condition, data) => {
    await window.dbApi.updateFriendRelation(condition, data)
}

export {
    getConversationList,
    getFriendList,
    getMessageList,
    saveSentMessage,
    saveLoadMessage,
    updateConversation,
    addConversation,
    addFriendRelation,
    updateMessage,
    getFriendInfoById,
    getConversationInfoById,
    getImageUrlList,
    getVideoUrlList,
    uploadNoteContent,
    getFavorites,
    updateOldNoteContent,
    addFavorites,
    clearHistoryMessage,
    deleteMessage,
    deleteFriend,
    deleteConversation,
    getNodeCount,
    getFavoritesAll,
    deleteFavorite,
    updateFriendRelation
}