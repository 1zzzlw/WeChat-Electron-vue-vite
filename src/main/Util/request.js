import axios from "axios";
import { store } from "../index";

const server = axios.create(
    {
        baseURL: 'http://127.0.0.1:81',
        // 超时时间
        timeout: 600000
    }
)

// axios的响应 response 拦截器，设置响应拦截器
server.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        const config = error?.config
        if (!config || !config.__retryable) return Promise.reject(error)
        if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return Promise.reject(error)

        const status = error?.response?.status
        const retryable = status == null || [408, 429, 500, 502, 503, 504].includes(status)
        if (!retryable) return Promise.reject(error)

        config.__retryCount = (config.__retryCount || 0) + 1
        const max = config.__maxRetries ?? 4
        if (config.__retryCount > max) return Promise.reject(error)

        const delay = Math.min(1000, 200 * (2 ** (config.__retryCount - 1))) + Math.floor(Math.random() * 120)
        await new Promise(r => setTimeout(r, delay))
        return server.request(config)
    }
)

// axios的请求 request 请求拦截器，在前端发送请求前进行预处理，获取store中的token，在请求头中增加token请求头
server.interceptors.request.use(config => {
    const token = store.get('token')
    if (token) {
        config.headers.Authorization = token
    }
    return config
})

export default server
