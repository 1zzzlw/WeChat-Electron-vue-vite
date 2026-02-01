import { defineStore } from 'pinia'
import { FileStatusInfo, UploadStatus } from '../types/fileBaseInfo'

export const fileStatusListInfo = defineStore('fileStatusListInfo', {
  state: () => {
    return {
      fileListMap: {} as Record<string, FileStatusInfo>
    }
  },
  actions: {
    addFileUpdateInfo(fileId: string, fileBaseInfo: FileStatusInfo) {
      this.fileListMap[fileId] = fileBaseInfo
    },
    getFileUpdateInfo(fileId: string) {
      return this.fileListMap[fileId]
    },
    updateFileProgressStatus(fileId: string, uploadProgress: number, uploadSpeed: number) {
      this.fileListMap[fileId].uploadProgress = uploadProgress
      this.fileListMap[fileId].uploadSpeed = uploadSpeed
    },
    updateFileStatus(fileId: string, uploadStatus: UploadStatus, uploadProgress: number) {
      this.fileListMap[fileId].uploadStatus = uploadStatus
      this.fileListMap[fileId].uploadProgress = uploadProgress
    },
    removeFinishedFile() {

    },
  }
})
