import { defineStore } from 'pinia'
import { FileUploadStatusInfo, UploadStatus, FileDownloadStatusInfo } from '../../types/fileBaseInfo'

export const fileStatusListInfo = defineStore('fileStatusListInfo', {
  state: () => {
    return {
      fileUploadListMap: {} as Record<string, FileUploadStatusInfo>,
      fileDownloadListMap: {} as Record<string, FileDownloadStatusInfo>,
      // 缓存版本号
      _cacheVersion: '',
      // 缓存时间戳  
      _cacheTimestamp: 0
    }
  },
  persist: {
    // 存储位置：localStorage 
    storage: localStorage,
    key: 'fileStatus-store',
    // 只持久化指定状态
    pick: ['_cacheVersion', '_cacheTimestamp']
  },
  actions: {
    addFileUploadUpdateInfo(fileId: string, fileBaseInfo: FileUploadStatusInfo) {
      this.fileUploadListMap[fileId] = fileBaseInfo
    },
    getFileUploadUpdateInfo(fileId: string) {
      return this.fileUploadListMap[fileId]
    },
    getFileUploadProgressInfo(fileId: string) {
      const info = this.fileUploadListMap[fileId]
      if (!info) {
        return { uploadProgress: 0, uploadSpeed: 0, uploadStatus: 'pending' as UploadStatus }
      }
      return {
        uploadProgress: info.uploadProgress,
        uploadSpeed: info.uploadSpeed,
        uploadStatus: info.uploadStatus
      }
    },
    updateFileUploadProgressStatus(fileId: string, uploadProgress: number, uploadSpeed: number) {
      if (this.fileUploadListMap[fileId]) {
        this.fileUploadListMap[fileId].uploadProgress = uploadProgress
        this.fileUploadListMap[fileId].uploadSpeed = uploadSpeed
      }
    },
    updateFileUploadStatus(fileId: string, uploadStatus: UploadStatus, uploadProgress: number) {
      if (this.fileUploadListMap[fileId]) {
        this.fileUploadListMap[fileId].uploadStatus = uploadStatus
        this.fileUploadListMap[fileId].uploadProgress = uploadProgress
      }
    },
    updateFileUploadPauseStatus(fileId: string, pause: boolean) {
      if (this.fileUploadListMap[fileId]) {
        this.fileUploadListMap[fileId].pause = pause
      }
    },
    addFileDownloadInfo(fileId: string, fileBaseInfo: FileDownloadStatusInfo) {
      this.fileDownloadListMap[fileId] = fileBaseInfo
    },
    getFileDownloadInfo(fileId: string) {
      return this.fileDownloadListMap[fileId]
    },
    updateFileDownloadPauseStatus(fileId: string, pause: boolean) {
      if (this.fileDownloadListMap[fileId]) {
        this.fileDownloadListMap[fileId].pause = pause
      }
    },
    updateFileDownloadProgressStatus(fileId: string, downloadProgress: number, downloadSpeed: number) {
      if (this.fileDownloadListMap[fileId]) {
        this.fileDownloadListMap[fileId].downloadProgress = downloadProgress
        this.fileDownloadListMap[fileId].downloadSpeed = downloadSpeed
      }
    },
    updateFileDownloadStatus(fileId: string, downloadStatus: UploadStatus, downloadProgress: number) {
      if (this.fileDownloadListMap[fileId]) {
        this.fileDownloadListMap[fileId].downloadStatus = downloadStatus
        this.fileDownloadListMap[fileId].downloadProgress = downloadProgress
      }
    },
    removeFinishedFile(fileId?: string) {
      if (fileId) {
        // 移除指定文件
        const uploadInfo = this.fileUploadListMap[fileId]
        if (uploadInfo && (uploadInfo.uploadStatus === 'finish' || uploadInfo.uploadStatus === 'fail')) {
          delete this.fileUploadListMap[fileId]
        }
        const downloadInfo = this.fileDownloadListMap[fileId]
        if (downloadInfo && (downloadInfo.downloadStatus === 'finish' || downloadInfo.downloadStatus === 'fail')) {
          delete this.fileDownloadListMap[fileId]
        }
      } else {
        // 清除所有已完成/失败的上传记录
        for (const [id, info] of Object.entries(this.fileUploadListMap)) {
          if (info.uploadStatus === 'finish' || info.uploadStatus === 'fail') {
            delete this.fileUploadListMap[id]
          }
        }
        // 清除所有已完成/失败的下载记录
        for (const [id, info] of Object.entries(this.fileDownloadListMap)) {
          if (info.downloadStatus === 'finish' || info.downloadStatus === 'fail') {
            delete this.fileDownloadListMap[id]
          }
        }
      }
    },
  }
})
