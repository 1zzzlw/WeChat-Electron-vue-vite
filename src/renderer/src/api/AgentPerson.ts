import request from '@/utils/axios/request'
import type {
  CharacterInfo,
  CharacterCandidate,
  PersonSettings,
  AgentAsset,
  AgentCallSession,
  AgentCallTurn
} from '@/types/agentPerson'

export const getCharacter = (userId: string) =>
  request.get<unknown, CharacterInfo>('/ai-message/person', { params: { userId } })
export const generateCandidates = (data: unknown) =>
  request.post<unknown, { candidates: CharacterCandidate[] }>('/ai-message/person/candidates', data)
export const selectCandidate = (data: unknown) => request.post('/ai-message/person/select', data)
export const getPersonSettings = (userId: string) =>
  request.get<unknown, PersonSettings>('/ai-message/person/settings', { params: { userId } })
export const savePersonSettings = (data: unknown) =>
  request.put('/ai-message/person/settings', data)
export const getMoments = (userId: string) =>
  request.get<unknown, any[]>('/ai-message/person/moments', { params: { userId } })
export const interactMoment = (id: string, data: unknown) =>
  request.post(`/ai-message/person/moments/${id}/interactions`, data)
export const saveServerCredential = (data: unknown) =>
  request.put('/ai-message/person/credential', data)
export const sendPresence = (userId: string, chatActive = true, typing = false) =>
  request.post('/ai-message/person/presence', { userId, chatActive, typing })
export const markAgentRead = (userId: string, upToSeq: string) =>
  request.post('/ai-message/person/read', { userId, upToSeq })
export const getAgentCall = (id: string, userId: string) =>
  request.get<unknown, AgentCallSession>(`/ai-message/calls/${id}`, { params: { userId } })
export const uploadAgentMedia = (userId: string, file: File) => {
  const data = new FormData()
  data.append('userId', userId)
  data.append('file', file)
  return request.post<unknown, AgentAsset>('/ai-message/media', data)
}
export const loadAgentMedia = (userId: string, id: string) =>
  request.get<unknown, Blob>(`/ai-message/media/${id}`, {
    params: { userId },
    responseType: 'blob'
  })
export const startAgentCall = (data: unknown) =>
  request.post<unknown, AgentCallSession>('/ai-message/calls', data)
export const endAgentCall = (id: string, data: unknown) =>
  request.post(`/ai-message/calls/${id}/end`, data)
export const interruptAgentCall = (id: string, data: unknown) =>
  request.post<unknown, { epoch: number }>(`/ai-message/calls/${id}/interrupt`, data)
export const hearAgentCall = (id: string, data: unknown) =>
  request.post(`/ai-message/calls/${id}/heard`, data)
export const agentCallTurn = (id: string, userId: string, epoch: number, file: File) => {
  const data = new FormData()
  data.append('userId', userId)
  data.append('epoch', String(epoch))
  data.append('file', file)
  return request.post<unknown, AgentCallTurn>(`/ai-message/calls/${id}/turn`, data)
}
