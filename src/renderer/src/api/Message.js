import request from '@/utils/axios/request'

export const sendMessageApi = (data) => request.post('/message/send', data)

export const pullMessageListApi = (data) => request.get('/message/pull/list', { params: data })

export const updateMessageFileSendStatusApi = (fileId, status) => request.put(`/message/updateFileSendStatus?fileId=${fileId}&sendStatus=${status}`)

export const recallMessageApi = (data) => request.delete('/message/recallMessage', {
    params: data
})

export const clearHistoryMessageApi = (conversationId) => request.delete(`/message/clearHistoryMessage/${conversationId}`)