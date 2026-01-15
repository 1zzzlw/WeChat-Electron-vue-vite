export interface Message {
    id: string
    senderId: string | number
    conversationId: string
    receiverId: string | number
    msgType: number
    content: string
    sendStatus: number
    readStatus?: number
    sendTime: string
    isRevoked?: number
    quoteMsgId?: number | null
    fileName?: string | null
    fileSize?: number
    localPath?: string | null
    remoteUrl?: string | null
    downloadStatus?: number
    receiveTime?: string
}
