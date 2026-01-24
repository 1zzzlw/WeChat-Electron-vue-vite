import axios from "axios";
import { store } from "../index";

const server = axios.create(
    {
        baseURL: 'http://localhost:8080',
        // 超时时间
        timeout: 600000
    }
)

// axios的响应 response 拦截器，设置响应拦截器
server.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        console.error('请求错误', error)
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
