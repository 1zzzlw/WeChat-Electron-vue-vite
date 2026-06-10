import type { statusMap } from '../utils/constants'

// 从statusMap里提取状态类型
export type UploadStatus = typeof statusMap[keyof typeof statusMap]['value'];

export interface FileBaseInfo {
    base64?: string
    fileId: string
    fileName: string
    fileSize: number
    fileType: number
    content: string
    localPath: string
    remotePath?: string
}

export interface FileUploadStatusInfo {
    fileId: string
    // 分块数量
    chunkCount: number
    // 上传的状态
    uploadStatus: UploadStatus
    // 上传进度
    uploadProgress: number
    // 上传速度
    uploadSpeed: number
    // 暂停状态
    pause: boolean
}

export interface FileDownloadStatusInfo {
    fileId: string
    downloadStatus: UploadStatus
    downloadProgress: number
    downloadSpeed: number
    pause: boolean
}