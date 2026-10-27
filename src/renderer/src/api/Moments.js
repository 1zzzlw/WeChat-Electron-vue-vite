import request from '@/utils/axios/request'

export const uploadImageApi = (data) => request.post('/moments/uploadImage', data)

/** @returns {Promise<{code: number, msg?: string}>} */
export const publishApi = (data) => request.post('/moments/publish', data)

export const listByNewApi = (id) => request.get(`/moments/list/new`, {
    params: { lastId: id }
})

export const listByHot = (page, pageSize) => request.get('moments/list/hot', {
    params: { page: page, pageSize: pageSize }
})

export const likedApi = (momentId) => request.post(`/moments/like/${momentId}`)

/** @returns {Promise<{code: number, msg?: string, data: import('@/types/moments').MomentsItem}>} */
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

/** @returns {Promise<{code: number, msg?: string, data: {total: number, data: import('@/types/userMoments').UserMoment[]}}>} */
export const listMyMomentsApi = (page, pageSize) => request.get('/moments/my', {
    params: { page, pageSize }
})

/**
 * userId 按字符串传递，避免大整数作者 ID 在渲染进程丢失精度。
 * @returns {Promise<{code: number, msg?: string, data: {total: number, data: import('@/types/userMoments').UserMoment[]}}>}
 */
export const listUserMomentsApi = (userId, page, pageSize) => request.get(`/moments/user/${userId}`, {
    params: { page, pageSize }
})

/** @returns {Promise<{code: number, msg?: string}>} */
export const deleteMomentApi = (momentId) => request.delete(`/moments/delete/${momentId}`)

/** @returns {Promise<{code: number, msg?: string}>} */
export const updateMomentApi = (data) => request.put('/moments/update', data)

export const rewardApi = (momentId, amount) => request.post('/moments/reward', null, { params: { momentId, amount } })
