import request from '../utils/axios/request'

export const getFriendListApi = () => request.get('/friend/list')

export const deleteFriendApi = (friendId) => request.delete('/friend/delete', {
  params: { friendId }
})