import request from '@/utils/axios/request'
import { refreshToken } from '@/utils/axios/refreshToken'
import { getAccessToken } from '@/utils/axios/token'
import { readSSE } from '@/utils/sse'

const sendStreamRequest = (baseURL, data, accessToken, signal) =>
  fetch(`${baseURL}/ai-message/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${accessToken}`
    },
    body: JSON.stringify(data),
    signal
  })

async function refreshAccessToken() {
  console.info('AI请求token过期，刷新token')
  const userId = await window.userInfoApi.storeGetUserInfo('userId')
  const isSuccess = await refreshToken(userId)

  if (isSuccess) return

  console.info('刷新token失败，返回登录界面')
  window.api.resizeWindow('login')
  window.location.href = '#/login'
  if (window.WSManager) window.WSManager.disconnect()
  throw new Error('登录已过期，请重新登录')
}

async function dispatchStreamEvent(event, handlers, streamState) {
  let eventData
  try {
    eventData = JSON.parse(event.data)
  } catch {
    throw new Error(`无法解析 SSE 事件数据：${event.event}`)
  }

  if (event.event === 'run.started') {
    handlers.onStarted?.(eventData)
    return
  }

  if (event.event === 'message.reasoning.delta') {
    const delta = eventData.delta ?? ''
    handlers.onReasoningDelta?.(delta, eventData)
    return
  }

  if (event.event === 'message.delta') {
    const delta = eventData.delta ?? ''
    streamState.fullContent += delta
    handlers.onDelta?.(delta, eventData)
    return
  }

  if (event.event === 'message.completed') {
    streamState.fullContent = eventData.content ?? streamState.fullContent
    handlers.onCompleted?.(eventData)
    return
  }

  if (event.event === 'tool.request') {
    if (!handlers.onToolRequest) throw new Error('客户端没有配置本地文件工具处理器')
    console.info('[IM Agent] 调用本地文件工具', {
      tool: eventData.operation,
      workspace: eventData.workspaceName,
      path: eventData.path,
      toolCallId: eventData.toolCallId
    })
    await handlers.onToolRequest(eventData)
    return
  }

  if (event.event === 'tool.completed') {
    handlers.onToolCompleted?.(eventData)
    return
  }

  if (event.event === 'run.failed') {
    throw new Error(eventData.message || '模型调用失败')
  }

  if (event.event === 'done') {
    streamState.doneReceived = true
    handlers.onDone?.(eventData)
  }
}

/**
 * 发送 AI 消息并消费同一个 HTTP 响应中的 SSE 事件流。
 * @param {import('@/types').SendAIMessageRequest} data
 * @param {import('@/types').AIStreamHandlers} [handlers]
 * @param {AbortSignal} [signal]
 * @returns {Promise<string>}
 */
export async function streamAIMessage(data, handlers = {}, signal) {
  const baseURL = request.defaults.baseURL || window.location.origin
  let response = await sendStreamRequest(baseURL, data, getAccessToken(), signal)

  if (response.status === 401) {
    if (response.body) await response.body.cancel().catch(() => {})
    await refreshAccessToken()
    response = await sendStreamRequest(baseURL, data, getAccessToken(), signal)
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`请求失败: ${response.status} - ${errorText}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) {
    throw new Error(`服务端没有返回 SSE，实际类型：${contentType || '未知'}`)
  }

  const streamState = {
    fullContent: '',
    doneReceived: false
  }

  for await (const event of readSSE(response)) {
    await dispatchStreamEvent(event, handlers, streamState)
  }

  if (!streamState.doneReceived) throw new Error('SSE 连接提前结束，未收到 done 事件')
  return streamState.fullContent
}
