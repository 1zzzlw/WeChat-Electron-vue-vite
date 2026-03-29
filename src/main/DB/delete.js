import { deletes } from './mainDB'

const clearHistoryMessage = (conversationId) => {
    const condition = {
        conversationId: conversationId
    }
    deletes('message', condition)
}

const deleteMessage = (conversationId, messageId) => {
    const condition = {
        conversationId: conversationId,
        messageId: messageId
    }
    deletes('message', condition)
}

export {
    clearHistoryMessage,
    deleteMessage
}