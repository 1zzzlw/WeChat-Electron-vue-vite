export interface AIMessage {
    id?: string
    userId: string
    role: string
    messageType: number
    content: string
    imageUrl?: string
    personalityId?: number
}