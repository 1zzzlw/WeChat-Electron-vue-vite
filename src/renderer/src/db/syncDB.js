import { updateConversation, uploadNoteContent, updateOldNoteContent, clearHistoryMessage, deleteFriend, deleteConversation } from "./dualDB";
import { uploadNoteContentApi, updateOldNoteContentApi } from '../api/Favorites'
import { updateConversationTopStatusApi, updateConversationMuteStatusApi, deleteConversationApi } from '../api/Conversation'
import { clearHistoryMessageApi } from "../api/Message";
import { deleteFriendApi } from "../api/Friend";

/**
 * 
 * @param {*} conversationId -- 会话id
 * @param {*} userId -- 用户id
 * @param {*} status -- 更新状态
 */
const updateConversationTopStatus = (conversationId, userId, status) => {
    // 更新本地数据库中的置顶状态
    const condition = {
        id: conversationId,
        userId: userId
    }
    const data = {
        isTop: status
    }
    updateConversation(condition, data)
    // 更新服务端的置顶状态
    updateConversationTopStatusApi(conversationId, status)
}

/**
 * 
 * @param {*} conversationId -- 会话id
 * @param {*} userId -- 用户id
 * @param {*} status -- 更新状态
 */
const updateConversationMuteStatus = (conversationId, userId, status) => {
    // 更新本地数据库中的消息免打扰状态
    const condition = {
        id: conversationId,
        userId: userId
    }
    const data = {
        isMute: status
    }
    updateConversation(condition, data)
    // 更新服务端的消息免打扰状态
    updateConversationMuteStatusApi(conversationId, status)
}

const insertNewNote = (data) => {
    // 保存到本地数据库
    uploadNoteContent(data)
    // 保存到服务器数据库
    uploadNoteContentApi(data)
}

const updateOldNote = (condition, data) => {
    // 保存到本地数据库
    updateOldNoteContent(condition, data)
    // 保存到服务器数据库
    updateOldNoteContentApi(condition, data)
}

const clearHistoryMessageSync = (conversationId) => {
    // 清空本地数据库的历史消息
    clearHistoryMessage(conversationId)
    // 清空服务器的历史消息
    // clearHistoryMessageApi(conversationId)
}

const deleteFriendSync = (friendId) => {
    deleteFriend(friendId)
    deleteFriendApi(friendId)
}

const deleteConversationSync = (conversationId) => {
    deleteConversation(conversationId)
    deleteConversationApi(conversationId)
}

export {
    updateConversationTopStatus,
    updateConversationMuteStatus,
    insertNewNote,
    updateOldNote,
    clearHistoryMessageSync,
    deleteFriendSync,
    deleteConversationSync
}