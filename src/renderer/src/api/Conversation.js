import request from '../utils/axios/request'

export const getConversationListApi = () => request.get('/conversation/list')

export const getGroupMemberListApi = (conversationId) =>
  request.get(`/conversation/groupMemberList/${conversationId}`)

export const updateConversationTopStatusApi = (conversationId, status) => request.post('/conversation/updateTopStatus', {}, {
  params: { conversationId, isTop: status }
})

export const updateConversationMuteStatusApi = (conversationId, status) => request.post('/conversation/updateMuteStatus', {}, {
  params: { conversationId, isMute: status }
})