import request from '@/utils/axios/request'
import { refreshToken } from '@/utils/axios/refreshToken'
import { getAccessToken } from '@/utils/axios/token'
import { readSSE } from '@/utils/sse'

const sendStreamRequest = (baseURL, data, accessToken, signal) =>
  fetch(`${baseURL}/ai-message/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `${accessToken}` },
    body: JSON.stringify(data),
    signal
  })

async function refreshAccessToken() {
  const userId = await window.userInfoApi.storeGetUserInfo('userId')
  if (await refreshToken(userId)) return
  window.api.resizeWindow('login')
  window.location.href = '#/login'
  window.WSManager?.disconnect()
  throw new Error('登录已过期，请重新登录')
}

/**
 * 只消费对外回复；内部推理、规划和工具事件不进入人物聊天界面。
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
    const payload = await response.json().catch(() => ({}))
    const detail = payload.error || payload.detail
    const message = typeof detail === 'string' ? detail : detail?.message
    throw Object.assign(new Error(message || `消息发送失败（${response.status}），请稍后重试`), {
      code: detail?.code
    })
  }
  if (!(response.headers.get('content-type') || '').includes('text/event-stream')) {
    throw new Error('聊天服务返回了无法识别的响应，请稍后重试')
  }
  let fullContent = ''
  let doneReceived = false
  for await (const event of readSSE(response)) {
    // 不解析不需要的内部事件，避免把推理或工具载荷交给 UI。
    if (
      ![
        'run.started',
        'message.delta',
        'message.completed',
        'run.failed',
        'run.interrupted',
        'done'
      ].includes(event.event)
    )
      continue
    let payload
    try {
      payload = JSON.parse(event.data)
    } catch {
      throw new Error('聊天消息格式异常，请重新连接')
    }
    if (event.event === 'run.started') handlers.onStarted?.(payload)
    if (event.event === 'message.delta') {
      const delta = payload.delta ?? ''
      fullContent += delta
      handlers.onDelta?.(delta)
    }
    if (event.event === 'message.completed') {
      fullContent = payload.content ?? fullContent
      handlers.onCompleted?.({
        messageId: payload.messageId,
        content: fullContent,
        parts: payload.parts
      })
    }
    if (event.event === 'run.failed') throw new Error(payload.message || '聊天服务暂时无法回复')
    if (event.event === 'done') doneReceived = true
  }
  if (!doneReceived) throw new Error('连接已中断，回复可能尚未收取完整')
  return fullContent
}
