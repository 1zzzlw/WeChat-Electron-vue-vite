import request from '../utils/request'

export const getConversationListApi = (list) => request.get(`/conversation/list/${list}`)

export const getGroupListApi = () => request.get('/conversation/groupMemberList')
