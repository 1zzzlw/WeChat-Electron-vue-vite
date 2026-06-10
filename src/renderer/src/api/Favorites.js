import request from '../utils/axios/request'

export const uploadImageApi = (data) => request.post('/favorites/uploadImage', data)

export const uploadNoteContentApi = (data) => request.post('/favorites/saveNote', data)

export const updateOldNoteContentApi = (condition, data) => request.post('/favorites/updateNote', { ...condition, ...data })

export const getFavoritesApi = () => request.get('/favorites/getNote')

// ==================== 消息收藏接口（后端待实现） ====================

/**
 * 收藏消息
 * POST /favorites/save
 * @param {Object} data
 * @param {string} data.title          - 收藏标题（文本消息取前20字，其他取文件名）
 * @param {string} data.content        - 收藏内容（文本: HTML字符串, 图片: MinIO URL, 视频/文件: URL或路径）
 * @param {string} data.sourceUsername - 来源用户名
 * @param {number} data.type           - 类型: 1=文本, 2=图片, 3=视频, 4=文件
 *
 * 后端响应: Result<Object>  (成功返回 Result.success())
 */
export const saveFavoriteApi = (data) => request.post('/favorites/save', data)

/**
 * 获取当前用户的所有收藏（笔记 + 消息收藏）
 * GET /favorites/list
 *
 * 后端响应: Result<List<FavoritesVO>>
 * FavoritesVO: { id, title, content, sourceUsername, type, createdAt, updatedAt }
 */
export const getFavoritesAllApi = () => request.get('/favorites/list')

/**
 * 删除收藏
 * DELETE /favorites/delete/:id
 * @param {number|string} id - 收藏记录的 id
 *
 * 后端响应: Result<Object>  (成功返回 Result.success())
 */
export const deleteFavoriteApi = (id) => request.delete(`/favorites/delete/${id}`)
