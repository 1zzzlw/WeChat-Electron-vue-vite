import { defineStore } from 'pinia'

interface fileBaseInfo {
  file: File
  fileId: string
  fileName: string
  fileSize: number
  fileType: string
  fileStatus: string
  fileHash: string
  process: number
}

export const fileBaseListInfo = defineStore('fileBaseListInfo', {
  state: () => {
    return {
      fileListMap: {} as Record<string, fileBaseInfo>
    }
  },
  actions: {
    addFileBaseInfo(fileId: string, fileInfo: fileBaseInfo) {
      if (this.fileListMap[fileId]) {
        this.fileListMap[fileId] = { ...this.fileListMap[fileId], ...fileInfo }
      } else {
        this.fileListMap[fileId] = fileInfo
      }
    },
    getFileHash(fileId: string) {
      if (this.fileListMap[fileId]) {
        return this.fileListMap[fileId].fileHash
      } else {
        return null
      }
    },
    updateFileHash(fileId: string, fileHash: string) {
      if (this.fileListMap[fileId]) {
        this.fileListMap[fileId].fileHash = fileHash
      }
    },
    getFileProcess(fileId: string) {
      if (this.fileListMap[fileId]) {
        return this.fileListMap[fileId].process
      }
    },
    updateFileProcess(fileId: string, process: number) {
      if (this.fileListMap[fileId]) {
        this.fileListMap[fileId].process = process
      }
    }
  }
})
