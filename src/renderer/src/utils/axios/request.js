import axios from 'axios'
import { getAccessToken } from './token'
import { refreshToken, isRefreshToken } from './refreshToken'
import { WSManager } from '../../../../../test/websocket'

const server = axios.create({
  baseURL: '/api',
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
    // 如果是401错误，且不是刷新token的请求
    if (error.response.status === 401 && !isRefreshToken(error.config)) {
      console.info('token过期,刷新token')
      const userId = await window.userInfoApi.storeGetUserInfo('userId')
      // 刷新token
      const isSuccess = await refreshToken(userId)
      if (isSuccess) {
        // 更新请求头中的token（以及经过一次刷新token的请求，所以旧的token已经被新的token替换了）
        server.defaults.headers.Authorization = `${getAccessToken()}`
        error.config.headers.Authorization = `${getAccessToken()}`
        const resp = await server.request(error.config)
        // 重新发送请求，沿用之前的配置
        return resp
      } else {
        console.info('刷新token失败，返回登录界面')
        window.api.resizeWindow('login')
        window.location.href = '#/login'
        WSManager.disconnect()
        return Promise.reject(error)
      }
    } else {
      // 其他错误，直接返回
      console.error('其他错误', error)
      // 返回登录界面，重新登录
      window.api.resizeWindow('login')
      window.location.href = '#/login'
      WSManager.disconnect()
      return Promise.reject(error)
    }
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
