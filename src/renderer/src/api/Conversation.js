import request from '../utils/request'

export const getConversationListApi = (list) => request.get(`/conversation/list/${list}`)
