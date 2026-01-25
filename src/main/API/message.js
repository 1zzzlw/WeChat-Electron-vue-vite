import request from '../Util/request'

export const verifyFileUpload = (fileId) => request.get(`/message/verifyUploadToken/${fileId}`)

export const uploadFileChunk = (formData, config) => request.post('/message/uploadChunk', formData, config)

export const checkUploaded = (data) => request.get(`/message/checkUploaded`, { params: data })

export const mergeFile = (data) => request.post('/message/merge', data)