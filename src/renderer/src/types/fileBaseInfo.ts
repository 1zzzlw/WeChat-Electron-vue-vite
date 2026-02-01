// 状态类型的只读map集合
export const statusMap = {
    fail: {
        value: 'fail',
        desc: '上传失败',
        icon: 'close'
    },
    preview: {
        value: 'preview',
        desc: '预览中',
        icon: 'clock'
    },
    uploading: {
        value: 'uploading',
        desc: '上传中',
        icon: 'upload'
    },
    upload_finish: {
        value: 'upload_finish',
        desc: '已完成',
        icon: 'success'
    },
    upload_seconds: {
        value: 'upload_seconds',
        desc: '秒传',
        icon: 'success'
    }
} as const

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

export interface FileStatusInfo {
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