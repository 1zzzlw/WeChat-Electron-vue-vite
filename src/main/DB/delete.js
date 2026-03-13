import { deletes } from './mainDB'

const clearHistoryMessage = (conversationId) => {
    const condition = {
        conversationId: conversationId
    }
    deletes('message', condition)
}

export {
    clearHistoryMessage
}