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
        id: messageId
    }
    deletes('message', condition)
}

const deleteFriend = (userId, friendId) => {
    const condition = {
        userId: userId,
        friendId: friendId
    }
    deletes('friend_relation', condition)
}

const deleteConversation = (conversationId) => {
    const condition = {
        id: conversationId
    }
    deletes('conversation', condition)
}

const deleteFavorite = (userId, favoriteId) => {
    const condition = {
        userId: userId,
        id: favoriteId
    }
    deletes('favorites', condition)
}

export {
    clearHistoryMessage,
    deleteMessage,
    deleteFriend,
    deleteConversation,
    deleteFavorite
}