import axios from 'axios'
import { getAccessToken } from '@/utils/axios/token'
import { refreshToken, isRefreshToken } from '@/utils/axios/refreshToken'

const baseURL = import.meta.env.DEV
  ? '/api'
  : 'http://47.111.22.183:81'

const server = axios.create({
  baseURL: baseURL,
  headers: {
    Authorization: `${getAccessToken()}`
  },
  // 超时时间
  timeout: 600000
})

// axios的响应 response 拦截器，设置响应拦截器
server.interceptors.response.use(
  (response) => {
    // 如果短期token存在
    if (response.headers.authorization) {
      const token = response.headers.authorization.replace('Bearer ', '')
      // 将短期token存储在localStorage中
      localStorage.setItem('token', token)
      // 短期token写入electron-store中
      window.userInfoApi.storeSetUserInfo('accessToken', token)
      // 更新请求头中的token
      server.defaults.headers.Authorization = `${token}`
    }
    // 如果存在刷新token
    if (response.headers.refreshtoken) {
      const refreshToken = response.headers.refreshtoken
      // 将刷新token存储在本地中
      window.userInfoApi.storeSetUserInfo('token', refreshToken)
    }
    return response.data
  },
  async (error) => {
    const status = error.response?.status

    // 网络断开或服务无响应（error.response 为 undefined）
    if (!error.response) {
      console.error('网络异常或服务端无响应', error.message)
      return Promise.reject(error)
    }

    // 401 token 过期，尝试刷新
    if (status === 401 && !isRefreshToken(error.config)) {
      console.info('token过期,刷新token')
      const userId = await window.userInfoApi.storeGetUserInfo('userId')
      const isSuccess = await refreshToken(userId)
      if (isSuccess) {
        server.defaults.headers.Authorization = `${getAccessToken()}`
        error.config.headers.Authorization = `${getAccessToken()}`
        return await server.request(error.config)
      } else {
        console.info('刷新token失败，返回登录界面')
        window.userInfoApi.storeSetUserInfo('token', '')
        window.userInfoApi.storeSetUserInfo('accessToken', '')
        window.location.href = '#/login'
        return Promise.reject(error)
      }
    }

    // 其他 HTTP 错误：仅打印日志，不粗暴跳转登录
    console.error(`HTTP ${status} 错误:`, error.config?.url, error.response?.data)
    return Promise.reject(error)
  }
)

server.interceptors.request.use(
  async (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default server
