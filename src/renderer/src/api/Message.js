import request from '../utils/request'

export const sendMessageApi = (data) => request.post('/message/send', data)

export const getMessageListApi = (data) => request.get('/message/list', { params: data })

export const uploadFileApi = (data, config) => request.post('/message/uploadChunk', data, config)

export const checkUploadedApi = (data) => request.get('/message/checkUploaded', { params: data })

export const mergeFileApi = (data) =>
  request.post(
    `/message/merge?fileHash=${data.fileHash}&fileName=${data.fileName}&fileType=${data.fileType}&chunkCount=${data.chunkCount}`
  )
