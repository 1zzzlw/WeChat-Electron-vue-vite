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
    fileId?: string | null
    fileName?: string | null
    fileSize?: number | null
    remotePath?: string | null
    localPath?: string | null
    remoteUrl?: string | null
    previewBase64?: string | null
    downloadStatus?: number
    receiveTime?: string
}