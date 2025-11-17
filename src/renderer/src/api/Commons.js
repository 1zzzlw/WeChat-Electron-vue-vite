import request from '../utils/request'

export const refreshTokenAPI = () => {
  return request({
    url: '/commons/refreshToken',
    method: 'post'
  })
}
