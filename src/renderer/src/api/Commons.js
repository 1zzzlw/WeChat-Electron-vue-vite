import request from '../utils/axios/request'

export const refreshTokenAPI = (userId, config = {}) => {
  return request.post(`/commons/refreshToken/${userId}`, config)
}
