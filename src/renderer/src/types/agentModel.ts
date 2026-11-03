export interface ModelOption {
  id: string
  configName: string
  providerName: string
  modelName: string
  description: string
  baseUrl?: string
  apiKey?: string
  modelTemperature?: number
  isActive?: boolean
  isDefault?: boolean
  isPublic?: boolean
}

export interface AgentModelConfig {
  configName: string
  providerName: string
  modelName: string
  baseUrl: string
  apiKey: string
  modelTemperature: number
}

export interface SavedModelConfig {
  id: string
  userId: string
  configName: string
  providerName: string
  modelName: string
  baseUrl: string | null
  modelTemperature: number
  isActive: boolean
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export const DEFAULT_MODEL: ModelOption = {
  id: 'system-default',
  configName: '系统默认模型',
  providerName: 'default',
  modelName: '',
  description: '使用管理员提供的默认对话配置',
  modelTemperature: 1,
  isActive: true,
  isDefault: true
}
