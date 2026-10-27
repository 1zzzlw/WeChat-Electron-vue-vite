import request from '@/utils/axios/request'

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

export const updateUserInfoApi = (data) => request.post('/user/updateInfo', data)

/** @returns {Promise<{code: number, msg?: string, data: {id: string, username: string, account: string, avatar: string, phone: string, email: string | null, birthday: string | null}}>} */
export const getMyProfileApi = () => request.get('/user/me')

