import request from '@/utils/axios/request'

/** @returns {Promise<import('@/types/agentChat').AgentServiceStatus>} */
export const getAgentStatus = (userId) => request.get('/ai-message/status', { params: { userId } })

/** @returns {Promise<import('@/types/agentApi').SavedAIMessage[]>} */
export const loadMessage = (userId, limit = 500) =>
  request.get('/ai-message/loadMessage', { params: { userId, limit } })

/** @returns {Promise<import('@/types/agentModel').SavedModelConfig[]>} */
export const getModelConfigs = (userId) =>
  request.get('/ai-message/config/getConfig', { params: { userId } })

/** @returns {Promise<{ configId: string }>} */
export const addModelConfig = (data) => request.post('/ai-message/config/add_model', data)
export const updateModelConfig = (data) => request.put('/ai-message/config/updateModel', data)
export const switchModelConfig = (data) => request.put('/ai-message/config/switchModel', data)
export const deleteModelConfig = (configId, userId) =>
  request.delete(`/ai-message/config/deleteModel/${configId}`, { params: { userId } })
