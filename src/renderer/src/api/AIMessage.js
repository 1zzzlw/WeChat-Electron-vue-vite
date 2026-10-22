import request from '@/utils/axios/request'

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

export const getModelConfigs = (userId) =>
  request.get('/ai-message/config/getConfig', { params: { userId } })

export const addModelConfig = (data) => request.post('/ai-message/config/add_model', data)

export const updateModelConfig = (data) => request.put('/ai-message/config/updateModel', data)

export const switchModelConfig = (data) => request.put('/ai-message/config/switchModel', data)

export const deleteModelConfig = (configId, userId) =>
  request.delete(`/ai-message/config/deleteModel/${configId}`, { params: { userId } })

/**
 * @param {import('@/types').SubmitAIWorkspaceToolResultRequest} data
 */
export const submitAIWorkspaceToolResult = (data) =>
  request.post('/ai-message/workspace/tool/result', data)
