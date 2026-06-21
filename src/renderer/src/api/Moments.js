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

export const commentReplies = (commentId, page, pageSize) => request.get(`/moments/comment/reply/${commentId}`, {
    params: { page: page, pageSize: pageSize }
})

export const publishCommentReply = (data) => request.post('/moments/comment/reply/publish', data)

export const likeComment = (commentId) => request.post(`/moments/comment/like/${commentId}`)

export const listMyMomentsApi = (page, pageSize) => request.get('/moments/my', {
    params: { page, pageSize }
})

export const deleteMomentApi = (momentId) => request.delete(`/moments/delete/${momentId}`)

export const updateMomentApi = (data) => request.put('/moments/update', data)

export const rewardApi = (momentId, count) => request.post('/moments/reward', null, { params: { momentId, count } })