import request from '@/utils/axios/request'
import { getAccessToken } from '@/utils/axios/token'
import { refreshToken } from '@/utils/axios/refreshToken'
import { readSSE } from '@/utils/sse'

export const loadMessage = (userId, conversationId = undefined, limit = 500) =>
  request.get('/ai-message/loadMessage', {
    params: { userId, conversationId, limit }
  })

export const getAIConversations = (userId) =>
  request.get('/ai-message/conversation/list', { params: { userId } })

export const renameAIConversation = (data) =>
  request.put('/ai-message/conversation/rename', data)

export const deleteAIConversation = (conversationId, userId) =>
  request.delete(`/ai-message/conversation/${conversationId}`, { params: { userId } })

export const createPersonality = (data) => request.post('/ai-message/createPersonality', data)

export const updatePersonality = (data) => request.post('/ai-message/updatePersonality', data)

export const switchPersonality = (id) => request.post(`/ai-message/switchPersonality/${id}`)

export const deletePersonality = (id) => request.delete(`/ai-message/deletePersonality/${id}`)

export const listPersonality = () => request.get('/ai-message/listPersonality')

export const getModelConfigs = (userId) =>
  request.get('/ai-message/config/getConfig', { params: { userId } })

export const addModelConfig = (data) => request.post('/ai-message/config/add_model', data)

export const updateModelConfig = (data) => request.put('/ai-message/config/updateModel', data)

export const switchModelConfig = (data) => request.put('/ai-message/config/switchModel', data)

export const deleteModelConfig = (configId, userId) =>
  request.delete(`/ai-message/config/deleteModel/${configId}`, { params: { userId } })

/**
 * 发送 AI 消息并消费 SSE 流。
 * @param {import('@/types').SendAIMessageRequest} data
 * @param {import('@/types').AIStreamHandlers} [handlers]
 * @param {AbortSignal} [signal]
 * @returns {Promise<string>}
 */
export async function sendAIMessageApi(data, handlers = {}, signal) {
  const baseURL = request.defaults.baseURL || window.location.origin

  const sendRequest = (accessToken) =>
    fetch(`${baseURL}/ai-message/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${accessToken}`
      },
      body: JSON.stringify(data),
      signal
    })

  let response = await sendRequest(getAccessToken())

  // 处理401（token过期）
  if (response.status === 401) {
    if (response.body) await response.body.cancel().catch(() => {})

    try {
      console.info('AI请求token过期，刷新token')

      // 获取userId
      const userId = await window.userInfoApi.storeGetUserInfo('userId')

      // 刷新token
      const isSuccess = await refreshToken(userId)

      if (isSuccess) {
        // 用新token重试
        response = await sendRequest(getAccessToken())
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

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) {
    throw new Error(`服务端没有返回 SSE，实际类型：${contentType || '未知'}`)
  }

  let fullContent = ''
  let doneReceived = false

  for await (const event of readSSE(response)) {
    let eventData
    try {
      eventData = JSON.parse(event.data)
    } catch {
      throw new Error(`无法解析 SSE 事件数据：${event.event}`)
    }

    if (event.event === 'run.started') {
      handlers.onStarted?.(eventData)
      continue
    }

    if (event.event === 'message.reasoning.delta') {
      const delta = eventData.delta ?? ''
      handlers.onReasoningDelta?.(delta, eventData)
      continue
    }

    if (event.event === 'message.delta') {
      const delta = eventData.delta ?? ''
      fullContent += delta
      handlers.onDelta?.(delta, eventData)
      continue
    }

    if (event.event === 'message.completed') {
      fullContent = eventData.content ?? fullContent
      handlers.onCompleted?.(eventData)
      continue
    }

    if (event.event === 'run.failed') {
      throw new Error(eventData.message || '模型调用失败')
    }

    if (event.event === 'done') {
      doneReceived = true
      handlers.onDone?.(eventData)
    }
  }

  if (!doneReceived) throw new Error('SSE 连接提前结束，未收到 done 事件')

  return fullContent
}
