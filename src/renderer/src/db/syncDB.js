import { updateConversation, uploadNoteContent, updateOldNoteContent, clearHistoryMessage, deleteFriend, deleteConversation, updateFriendRelation } from "@/db/dualDB";
import { uploadNoteContentApi, updateOldNoteContentApi } from '@/api/Favorites'
import { updateConversationTopStatusApi, updateConversationMuteStatusApi, deleteConversationApi } from '@/api/Conversation'
import { clearHistoryMessageApi } from "@/api/Message";
import { deleteFriendApi, updateFriendRemarkApi, updateFriendStatusApi } from "@/api/Friend";

/**
 * 同步更新会话置顶：先调服务端，成功后再写本地
 * @param {*} conversationId -- 会话id
 * @param {*} userId -- 用户id
 * @param {*} status -- 更新状态
 */
const updateConversationTopStatus = async (conversationId, userId, status) => {
    await updateConversationTopStatusApi(conversationId, status)
    const condition = { id: conversationId, userId: userId }
    const data = { isTop: status }
    updateConversation(condition, data)
}

/**
 * 同步更新会话免打扰：先调服务端，成功后再写本地
 * @param {*} conversationId -- 会话id
 * @param {*} userId -- 用户id
 * @param {*} status -- 更新状态
 */
const updateConversationMuteStatus = async (conversationId, userId, status) => {
    await updateConversationMuteStatusApi(conversationId, status)
    const condition = { id: conversationId, userId: userId }
    const data = { isMute: status }
    updateConversation(condition, data)
}

const insertNewNote = async (data) => {
    const res = await uploadNoteContentApi(data)
    // 用后端返回的真实ID写入本地，保证前后端ID一致
    const noteId = res.data
    uploadNoteContent({ ...data, id: noteId })
}

const updateOldNote = async (condition, data) => {
    await updateOldNoteContentApi(condition, data)
    updateOldNoteContent(condition, data)
}

const clearHistoryMessageSync = async (conversationId) => {
    clearHistoryMessage(conversationId)
    // 服务端 API 待后端实现
    // await clearHistoryMessageApi(conversationId)
}

const deleteFriendSync = async (friendId) => {
    await deleteFriendApi(friendId)
    deleteFriend(friendId)
}

const deleteConversationSync = async (conversationId) => {
    await deleteConversationApi(conversationId)
    deleteConversation(conversationId)
}

/** 同步更新好友备注：先调服务端，成功后再写本地 */
const updateFriendRemarkSync = async (friendId, remark) => {
    await updateFriendRemarkApi(friendId, remark)
    updateFriendRelation({ friendId: String(friendId) }, { remark })
    updateConversation({ targetId: String(friendId) }, { remark })
}

/** 同步更新好友关系状态：先调服务端，成功后再写本地 */
const updateFriendStatusSync = async (friendId, relationStatus) => {
    await updateFriendStatusApi(friendId, relationStatus)
    updateFriendRelation({ friendId: String(friendId) }, { relationStatus })
}

export {
    updateConversationTopStatus,
    updateConversationMuteStatus,
    insertNewNote,
    updateOldNote,
    clearHistoryMessageSync,
    deleteFriendSync,
    deleteConversationSync,
    updateFriendRemarkSync,
    updateFriendStatusSync
}
