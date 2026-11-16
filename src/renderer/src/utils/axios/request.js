import axios from 'axios'
import { getAccessToken } from '@/utils/axios/token'
import { refreshToken, isRefreshToken } from '@/utils/axios/refreshToken'
import { getBackendUrl } from '../../../../shared/backend.js'

const baseURL = import.meta.env.DEV ? '/api' : getBackendUrl(false)

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
  async (response) => {
    const snapshot = response.config.__accountSession
    const current = await window.accountApi.getSession()
    if (
      snapshot &&
      (snapshot.userId !== current.userId || snapshot.revision !== current.revision)
    ) {
      throw new axios.CanceledError('账号已切换，忽略旧请求结果')
    }
    const accessToken = response.headers.authorization?.replace(/^Bearer\s+/i, '')
    const refreshTokenValue = response.headers.refreshtoken
    if (response.config.url === '/user/register' && response.data?.code === 1) {
      const profile = response.data.data
      const session = await window.accountApi.activateSession(
        snapshot,
        { ...profile, id: profile.id ?? profile.userId },
        { accessToken, refreshToken: refreshTokenValue }
      )
      localStorage.setItem('token', session.accessToken)
    } else if (accessToken || refreshTokenValue) {
      const saved = await window.accountApi.updateTokens(snapshot, {
        accessToken,
        refreshToken: refreshTokenValue
      })
      if (!saved) throw new axios.CanceledError('登录状态已变更')
      if (accessToken) localStorage.setItem('token', accessToken)
    }
    return response.data
  },
  async (error) => {
    const status = error.response?.status
    const snapshot = error.config?.__accountSession
    const current = await window.accountApi.getSession()
    if (
      snapshot &&
      (snapshot.userId !== current.userId || snapshot.revision !== current.revision)
    ) {
      return Promise.reject(new axios.CanceledError('账号已切换，忽略旧请求错误'))
    }

    // 网络断开或服务无响应（error.response 为 undefined）
    if (!error.response) {
      console.error('网络异常或服务端无响应', error.message)
      return Promise.reject(error)
    }

    // 401 token 过期，尝试刷新
    if (
      status === 401 &&
      current.userId &&
      !error.config.__retried &&
      !isRefreshToken(error.config)
    ) {
      console.info('token过期,刷新token')

      let isSuccess

      try {
        isSuccess = await refreshToken(current)
      } catch (refreshError) {
        const refreshStatus = refreshError.response?.status

        if (refreshStatus === 400 || refreshStatus === 401) {
          // 网关用这两个状态表示刷新凭据失效
          isSuccess = false
        } else {
          // 网络、服务异常：结束本次请求，交给调用方处理
          return Promise.reject(refreshError)
        }
      }

      if (isSuccess) {
        const active = await window.accountApi.getSession()
        if (active.userId !== current.userId || active.revision !== current.revision) {
          return Promise.reject(new axios.CanceledError('账号已切换，停止重试旧请求'))
        }
        error.config.__retried = true
        return await server.request(error.config)
      } else {
        console.info('刷新token失败，返回登录界面')
        if (await window.accountApi.expireSession(current)) localStorage.removeItem('token')
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
    const snapshot = await window.accountApi.getSession()
    config.__accountSession = snapshot
    config.headers.Authorization = snapshot.accessToken || ''
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default server
