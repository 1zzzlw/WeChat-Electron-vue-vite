import { update } from "./mainDB"

/**
 * 更新数据库
 * @param condition -- 条件
 * @param data -- 会话表需要更新的字段数 
 */
const updateConversation = (condition, data) => {
    update('conversation', condition, data)
}

/**
 * 更新数据库
 * @param condition -- 条件
 * @param data -- 消息表需要更新的字段数 
 */
const updateMessage = (condition, data) => {
    update('message', condition, data)
}

export {
    updateConversation,
    updateMessage
}