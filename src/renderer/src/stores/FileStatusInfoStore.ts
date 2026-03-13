import { defineStore } from 'pinia'
import { FileUploadStatusInfo, UploadStatus, FileDownloadStatusInfo } from '../types/fileBaseInfo'

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
    getFileUplaodProgressInfo(fileId: string) {
      return {
        uploadProgress: this.fileUploadListMap[fileId].uploadProgress,
        uploadSpeed: this.fileUploadListMap[fileId].uploadProgress,
        uploadStatus: this.fileUploadListMap[fileId].uploadStatus
      }
    },
    updateFileUploadProgressStatus(fileId: string, uploadProgress: number, uploadSpeed: number) {
      this.fileUploadListMap[fileId].uploadProgress = uploadProgress
      this.fileUploadListMap[fileId].uploadSpeed = uploadSpeed
    },
    updateFileUploadStatus(fileId: string, uploadStatus: UploadStatus, uploadProgress: number) {
      this.fileUploadListMap[fileId].uploadStatus = uploadStatus
      this.fileUploadListMap[fileId].uploadProgress = uploadProgress
    },
    updateFileUploadPauseStatus(fileId: string, pause: boolean) {
      if (this.fileUploadListMap[fileId]) {
        this.fileUploadListMap[fileId].pause = pause
      }
    },
    addFileDownlaodInfo(fileId: string, fileBaseInfo: FileDownloadStatusInfo) {
      this.fileDownloadListMap[fileId] = fileBaseInfo
    },
    getFileDownloadInfo(fileId: string) {
      return this.fileDownloadListMap[fileId]
    },
    updateFileDownloadProgressStatus(fileId: string, downloadProgress: number, downloadSpeed: number) {
      this.fileDownloadListMap[fileId].downloadProgress = downloadProgress
      this.fileDownloadListMap[fileId].downloadSpeed = downloadSpeed
    },
    updateFileDownloadStatus(fileId: string, downlaodStatus: UploadStatus, downloadProgress: number) {
      this.fileDownloadListMap[fileId].downloadStatus = downlaodStatus
      this.fileDownloadListMap[fileId].downloadProgress = downloadProgress
    },
    removeFinishedFile() {

    },
  }
})
