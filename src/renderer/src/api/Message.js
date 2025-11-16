import request from '../utils/request'

export const sendMessageApi = (data) => request.post('/message/send', data)

export const getMessageListApi = (data) => request.get('/message/list', { params: data })
