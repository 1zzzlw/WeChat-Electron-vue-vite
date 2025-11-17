import axios from 'axios'

import { refreshTokenAPI } from '../api/Commons'

const server = axios.create({
  baseURL: '/api',
  timeout: 600000
})

// axios的响应 response 拦截器，设置响应拦截器
server.interceptors.response.use(
  (response) => {
    return response.data
  },
  async (error) => {
    // originalRequest 就是 原始发出的请求对象，它包含了请求的所有信息，比如请求方法、请求URL、请求头、请求体等
    const originalRequest = error.config
    // _retry 是我们自己给请求对象加的一个“标记”，用于判断是否是第一次请求
    if (error.response && error.response.status === 460 && !originalRequest._retry) {
      // 目的：防止 无限循环刷新,表示这个请求已经刷新过 token 了，不需要再刷新。
      originalRequest._retry = true
      // 460 表示token过期
      // 调用刷新token接口
      const res = await refreshTokenAPI()
      const newToken = res.data
      // 更新本地存储
      await window.api.storeSetToken(newToken)
      // 更新请求头
      axios.defaults.headers.common['Authorization'] = newToken
      originalRequest.headers['Authorization'] = newToken
      // 重发原请求,用新的 token 重新发一次原来的请求：
      return axios(originalRequest)
    }
    return Promise.reject(error)
  }
)

// axios的请求 request 请求拦截器，在前端发送请求前进行预处理，获取localStorage中的token，在请求头中增加token请求头
server.interceptors.request.use(
  async (config) => {
    // 从store中获取token，必须是异步获取
    const token = await window.api.storeGetToken()
    if (token) {
      // token存在，添加到请求头
      config.headers.Authorization = token
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default server
