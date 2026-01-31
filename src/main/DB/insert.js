import { multipleInsert, insert } from "./mainDB"

/**
 * 插入发送成功的消息
 * @param message -- 单条消息
 */
const saveSentMessage = (message) => {
    insert('message', message)
}

/**
 * 插入从服务端拉取的分页消息
 * @param messageList -- 多条消息
 */
const saveLoadMessage = (messageList) => {
    multipleInsert(`insert`, 'message', messageList)
}

/**
 * 插入新的会话列表
 * @param conversationPack -- 会话信息
 */
const addConversation = (conversationPack) => {
    insert('conversation', conversationPack)
}

/**
 * 插入新的好友列表
 * @param friendPack -- 好友信息 
 */
const addFriendRelation = (friendPack) => {
    insert('friend_relation', friendPack)
}

export {
    saveSentMessage,
    saveLoadMessage,
    addConversation,
    addFriendRelation
}