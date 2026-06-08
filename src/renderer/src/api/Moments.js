import request from '../utils/axios/request'

export const uploadImageApi = (data) => request.post('/moments/uploadImage', data)

export const publishApi = (data) => request.post('/moments/publish', data)

export const listApi = (sortWay, id) => request.get(`/moments/list`, {
    params: { sortWay: sortWay, lastId: id }
})

export const likedApi = (momentId) => request.post(`/moments/like/${momentId}`)

export const momentDetail = (momentId) => request.get(`moments/detail/${momentId}`)

export const publishComment = (data) => request.post('/moments/comment/publish', data)

export const comments = (pageDTO) => request.get('/moments/comments/query', {
    params: pageDTO
})