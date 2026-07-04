import request from '@/utils/axios/request'
import server from '@/utils/axios/request' // 你的axios实例
import { getAccessToken } from '@/utils/axios/token'
import { refreshToken, isRefreshToken } from '@/utils/axios/refreshToken'

export const loadMessage = () => request.get('/ai-message/loadMessage')

export const createPersonality = (data) => request.post('/ai-message/createPersonality', data)

export const updatePersonality = (data) => request.post('/ai-message/updatePersonality', data)

export const switchPersonality = (id) => request.post(`/ai-message/switchPersonality/${id}`)

export const deletePersonality = (id) => request.delete(`/ai-message/deletePersonality/${id}`)

export const listPersonality = () => request.get('/ai-message/listPersonality')

// AI流式请求
export async function sendAIMessageApi(data) {
    const baseURL = server.defaults.baseURL || window.location.origin
    const token = getAccessToken()

    let response = await fetch(`${baseURL}/ai-message/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `${token}`
        },
        body: JSON.stringify(data)
    })

    // 处理401（token过期）
    if (response.status === 401) {
        try {
            console.info('AI请求token过期，刷新token')

            // 获取userId
            const userId = await window.userInfoApi.storeGetUserInfo('userId')

            // 刷新token
            const isSuccess = await refreshToken(userId)

            if (isSuccess) {
                // 用新token重试
                const newToken = getAccessToken()
                response = await fetch(`${baseURL}/ai-message/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `${newToken}`
                    },
                    body: JSON.stringify(data)
                })
            } else {
                // 刷新失败，返回登录界面
                console.info('刷新token失败，返回登录界面')
                window.api.resizeWindow('login')
                window.location.href = '#/login'
                // 断开WebSocket
                if (window.WSManager) {
                    window.WSManager.disconnect()
                }
                throw new Error('登录已过期，请重新登录')
            }
        } catch (error) {
            console.error('Token刷新失败:', error)
            throw error
        }
    }

    // 处理其他错误
    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`请求失败: ${response.status} - ${errorText}`)
    }

    return response
}