import request from '../utils/request'

export const registerApi = (data) => request.post('/user/register', data)

export const sendPhoneCodeApi = (phone) =>
  request.post('/user/phoneCode', {}, { params: { phone } })
