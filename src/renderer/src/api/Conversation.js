import request from '@/utils/axios/request'

export const getConversationListApi = () => request.get('/conversation/list')

export const getGroupMemberListApi = (conversationId) =>
  request.get(`/conversation/groupMemberList/${conversationId}`)

export const updateConversationTopStatusApi = (conversationId, status) => request.post('/conversation/updateTopStatus', {}, {
  params: { conversationId, isTop: status }
})

export const updateConversationMuteStatusApi = (conversationId, status) => request.post('/conversation/updateMuteStatus', {}, {
  params: { conversationId, isMute: status }
})

export const deleteConversationApi = (conversationId) => request.delete('/conversation/delete', {
  params: { conversationId }
})

export const GroupNumberExitApi = (conversationId) => request.delete('/conversation/exitGroup', {
  params: { conversationId }
})

export const sendGroupApplyApi = (formData) =>
  request.post(`/conversation/createGroup`, formData)

// ==================== 群聊管理 API ====================

/** 获取群详情 */
export const getGroupDetailApi = (conversationId) =>
  request.get(`/conversation/groupDetail/${conversationId}`)

/** 更新群信息（群名、头像、描述） */
export const updateGroupInfoApi = (data) =>
  request.post('/conversation/updateGroupInfo', {}, {
    params: {
      conversationId: data.conversationId,
      groupName: data.groupName,
      groupAvatar: data.groupAvatar,
      groupDesc: data.groupDesc
    }
  })

/** 踢出群成员 */
export const kickMemberApi = (conversationId, targetUserId) =>
  request.delete('/conversation/kickMember', { params: { conversationId, targetUserId } })

/** 解散群聊 */
export const dissolveGroupApi = (conversationId) =>
  request.delete('/conversation/dissolveGroup', { params: { conversationId } })

/** 设置/取消管理员 (role: 1=管理员, 0=普通成员) */
export const setAdminApi = (conversationId, targetUserId, isAdmin) =>
  request.post('/conversation/setAdmin', {}, {
    params: { conversationId, targetUserId, role: isAdmin ? 1 : 0 }
  })

/** 禁言/取消禁言 (isMute: true/false → 1/0) */
export const muteMemberApi = (conversationId, targetUserId, isMute) =>
  request.post('/conversation/muteMember', {}, {
    params: { conversationId, targetUserId, isMute: isMute ? 1 : 0 }
  })

/** 转让群主 */
export const transferOwnerApi = (conversationId, newOwnerId) =>
  request.post('/conversation/transferOwner', {}, { params: { conversationId, newOwnerId } })

/** 批量邀请成员入群（拉人） */
export const batchInviteMembersApi = (conversationId, userIds) =>
  request.post('/conversation/batchInvite', userIds, { params: { conversationId } })

/** 清除会话未读消息计数 */
export const clearUnreadApi = (conversationId) =>
  request.put(`/conversation/isReaded/${conversationId}`)