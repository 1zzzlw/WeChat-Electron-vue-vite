import request from '../utils/request'

export const loginApi = (data) => request.post('/login', data)

export const verifyCodeApi = (config = {}) => request.get('/login/verifyCode', config)

export const PendingLoginApi = (token, userId) =>
  request.get('/login/pendingLogin', {
    params: {
      token,
      userId
    }
  })
