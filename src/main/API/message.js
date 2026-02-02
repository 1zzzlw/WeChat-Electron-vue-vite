import request from '../Util/request'

export const verifyFileUpload = (fileId) => request.get(`/message/verifyUploadToken/${fileId}`)

export const uploadFileChunk = (formData) => request.post('/message/uploadChunk', formData)

export const checkUploaded = (data) => request.get(`/message/checkUploaded`, { params: data })

export const mergeFile = (data) => request.post('/message/merge', data)