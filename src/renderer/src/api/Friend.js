import request from '../utils/axios/request'

export const getFriendListApi = () => request.get('/friend/list')

export const deleteFriendApi = (friendId) => request.delete('/friend/delete', {
  params: { friendId }
})

/** 更新好友备注 */
export const updateFriendRemarkApi = (friendId, remark) =>
  request.put('/friend/remark', {}, { params: { friendId, remark } })

/** 更新好友关系状态（relationStatus: 1=正常 2=黑名单） */
export const updateFriendStatusApi = (friendId, relationStatus) =>
  request.put('/friend/status', {}, { params: { friendId, relationStatus } })