import request from '../utils/axios/request'

export const getFriendListApi = () => request.get('/friend/list')

export const searchFriendApi = (phone) => request.get('/friend/search', {
  params: { phone }
})

export const deleteFriendApi = (friendId) => request.delete('/friend/delete', {
  params: { friendId }
})