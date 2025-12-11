import request from '../utils/request'

export const sendMessageApi = (data) => request.post('/message/send', data)

export const getMessageListApi = (data) => request.get('/message/list', { params: data })

export const uploadFileApi = (data) => request.post('/message/uploadChunk', data)

export const checkUploadedApi = (data) => request.get('/message/checkUploaded', { params: data })
