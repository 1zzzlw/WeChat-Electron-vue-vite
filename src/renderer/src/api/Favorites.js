import request from '../utils/axios/request'

export const uploadImageApi = (data) => request.post('/favorites/uploadImage', data)

export const uploadNoteContentApi = (data) => request.post('/favorites/saveNote', data)

export const updateOldNoteContentApi = (condition, data) => request.post('/favorites/updateNote', { ...condition, ...data })

export const getFavoritesApi = () => request.get('/favorites/getNote')