import request from '../utils/axios/request'

export const getConversationListApi = () => request.get('/conversation/list')

export const getGroupMemberListApi = (conversationId) =>
  request.get(`/conversation/groupMemberList/${conversationId}`)
