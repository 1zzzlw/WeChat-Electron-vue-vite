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
  id: number
  userId: string
  configName: string
  providerName: string
  modelName: string
  baseUrl: string | null
  modelTemperature: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const DEFAULT_MODEL: ModelOption = {
  id: 'default-deepseek-flush',
  configName: '系统默认模型',
  providerName: 'default',
  modelName: 'deepseek-flush',
  description: '适合复杂分析与编码任务',
  modelTemperature: 1,
  isActive: true,
  isDefault: true
}
