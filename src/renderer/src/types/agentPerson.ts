export interface CharacterInfo {
  exists: boolean
  requiresCreation?: boolean
  worldId?: string
  name?: string
  status?: string | null
  profile?: Record<string, unknown>
}
export interface CharacterCandidate {
  id: string
  name: string
  introduction: string
  appearance: string
}
export interface PersonSettings {
  lifeWindowMinutes?: number
  presenceVisibility?: { online: boolean; read: boolean; typing: boolean }
  notifications?: { muted: boolean }
}
export interface AgentAsset {
  id: string
  kind: 'image' | 'audio'
  analysis: { emotion?: string | null; transcript?: string; description?: string }
}
export interface AgentCallSession {
  id: string
  status: string
  epoch: number
}
export interface AgentCallTurn {
  status: string
  epoch: number
  transcript: string
  segments: Array<{ id: string; text: string; assetId: string }>
}
