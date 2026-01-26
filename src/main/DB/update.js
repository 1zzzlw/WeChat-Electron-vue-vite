import { update } from "./mainDB"

/**
 * 更新数据库
 * @param condition -- 条件
 * @param data -- 会话表需要更新的字段数 
 */
const updateConversation = (condition, data) => {
    update('conversation', condition, data)
}

export {
    updateConversation
}