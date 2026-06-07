import request from '../utils/axios/request'

export const uploadImageApi = (data) => request.post('/moments/uploadImage', data)

export const publishApi = (data) => request.post('/moments/publish', data)

export const listApi = (sortWay, id) => request.get(`/moments/list`, {
    params: { sortWay: sortWay, lastId: id }
})

export const likeedApi = (momentId) => request.post(`/moments/like/${momentId}`)