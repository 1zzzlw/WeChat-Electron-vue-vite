import axios from "axios";
import { store } from "../index";

const server = axios.create(
    {
        baseURL: 'http://localhost:8080',
        // 超时时间
        timeout: 600000
    }
)

// 标记：是否正在刷新token
let isRefreshing = false
// 存储等待刷新token的请求
let refreshSubscribers = []

// axios的响应 response 拦截器，设置响应拦截器
server.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        // 如果是401错误，且不是刷新token的请求
        if (error.response.status === 401) {
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
                console.info('刷新token失败，此时登录过期')
                // TODO
                return Promise.reject(error)
            }
        } else {
            // 其他错误
            console.error('其他错误', error)
        }
    }
)

// axios的请求 request 请求拦截器，在前端发送请求前进行预处理，获取store中的token，在请求头中增加token请求头
server.interceptors.request.use(config => {
    const token = store.get('accessToken')
    if (token) {
        config.headers.Authorization = token
    }
    return config
})

// 通知渲染进程刷新token
function refreshToken() {
    return new Promise((resolve) => {
        mainWindow.webContents.send('refresh-token')

        // 监听渲染进程的刷新结果
        ipcMain.once('token-refreshed', (e, success) => {
            resolve(success)
        })
    })
}

export default server
