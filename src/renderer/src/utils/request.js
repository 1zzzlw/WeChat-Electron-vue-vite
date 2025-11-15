import axios from 'axios'

const server = axios.create({
  baseURL: '/api',
  timeout: 600000
})

// axios的响应 response 拦截器，设置响应拦截器
server.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    return Promise.reject(error)
  }
)

// axios的请求 request 请求拦截器，在前端发送请求前进行预处理，获取localStorage中的token，在请求头中增加token请求头
server.interceptors.request.use(
  async (config) => {
    // 从store中获取token，必须是异步获取
    const token = await window.api.storeGetToken()
    if (token) {
      // token存在
      config.headers.Authorization = token
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default server
