import request from '../utils/axios/request'

export const uploadImageApi = (data) => request.post('/moments/uploadImage', data)

export const publishApi = (data) => request.post('/moments/publish', data)

export const listByNewApi = (id) => request.get(`/moments/list/new`, {
    params: { lastId: id }
})

export const listByHot = (page, pageSize) => request.get('moments/list/hot', {
    params: { page: page, pageSize: pageSize }
})

export const likedApi = (momentId) => request.post(`/moments/like/${momentId}`)

export const momentDetail = (momentId) => request.get(`moments/detail/${momentId}`)

export const publishComment = (data) => request.post('/moments/comment/publish', data)

export const comments = (pageDTO) => request.get('/moments/comments/query', {
    params: pageDTO
})

export const replies = (pageDTO) => request.get('/moments/comments/replies', {
    params: pageDTO
})