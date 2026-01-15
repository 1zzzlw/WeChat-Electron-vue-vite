import request from '../Util/request'

export const initConversationList = (isInit) => request.get(`/conversation/init/list?isInit=${isInit}`)

export const initFriendList = (isInit) => request.get(`/friend/init/list?isInit=${isInit}`)

export const initMessageList = (conversationIds, isInit) => request.get(`/message/init/list/${conversationIds}?isInit=${isInit}`)