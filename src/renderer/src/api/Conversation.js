import request from '../utils/axios/request'

export const getConversationListApi = (list) => request.get(`/conversation/list/${list}`)

export const getGroupListApi = () => request.get('/conversation/groupList')

export const getGroupMemberListApi = (conversationId) =>
  request.get(`/conversation/groupMemberList/${conversationId}`)
