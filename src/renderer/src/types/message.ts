export interface Message {
    id: string
    senderId: string | number
    conversationId: string
    receiverId: string | number
    receiverIds?: string[]
    msgType: number              // 1=text, 2=image, 3=video, 4=audio, 5=file, 6=redPacket, 99=system
    subType?: number
    content: string
    sendStatus: number           // 0=sending, 1=sent, 2=failed
    readStatus?: number
    sendTime: string
    isRevoked?: number
    quoteMsgId?: number | null
    quoteContent?: string | null
    quoteMsgType?: number | null
    fileId?: string | null
    fileName?: string | null
    fileSize?: number | null
    remotePath?: string | null
    localPath?: string | null
    remoteUrl?: string | null
    previewBase64?: string | null
    downloadStatus?: number
    receiveTime?: string
    /** 关联红包ID，msg_type=6 时使用（使用字符串避免精度丢失） */
    redPacketId?: string
}

export interface MessageContentManageProps extends Message {
    isUpload?: boolean;
}