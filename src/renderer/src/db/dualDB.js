import { getMessageListApi } from "../api/Message"
import { getConversationListApi } from "../api/Conversation"

/**
 * 从本地获取会话列表，如果本地数据不够或缺失，从服务端拉取
 */
const getConversationList = async () => {
    const conversationList = await window.dbApi.queryConversationList()
    console.log(conversationList)
    return conversationList
}

/**
 * 从本地获取好友列表，如果本地数据不够或缺失，从服务端拉取
 */
const getFriendList = async () => {
    const friendList = await window.dbApi.queryFriendList()
    console.log(friendList)
    return friendList
}

/**
 * 从本地获取消息列表，如果本地数据不够或缺失，从服务端拉取
 */
const getMessageList = async () => {

}

export {
    getConversationList,
    getFriendList,
    getMessageList
}