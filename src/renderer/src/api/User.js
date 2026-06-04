import request from '../utils/axios/request'

export const mainAvatarApi = () => request.get('/user/mainAvatar')

export const loginApi = (data) => request.post('/user/login', data)

export const verifyCodeApi = (config = {}) => request.get('/user/verifyCode', config)

export const PendingLoginApi = (token, userId) =>
    request.get('/user/pendingLogin', {
        params: {
            token,
            userId
        }
    })

export const registerApi = (data) => request.post('/user/register', data)

export const sendPhoneCodeApi = (phone) =>
    request.post('/user/phoneCode', {}, { params: { phone } })

export const searchFriendApi = (number) => request.get('/user/search', {
    params: { number }
})

