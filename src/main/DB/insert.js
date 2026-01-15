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

export {
    saveSentMessage,
    saveLoadMessage
}