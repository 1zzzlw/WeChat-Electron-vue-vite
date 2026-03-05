export interface AIMessage {
    id?: string
    userId: string
    role: string
    msgType: number
    content: string
    imageUrl?: string
    personalityId?: number
}