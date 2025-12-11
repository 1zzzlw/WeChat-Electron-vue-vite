import { defineStore } from 'pinia'

// 文件分片信息存储

interface fileChunk {
  chunkIndex: number | string
  chunkHash: string
  isUploaded: boolean
}

export const fileChunkInfo = defineStore('fileChunkInfo', {
  state: () => {
    return {
      fileChunkList: {} as Record<number | string, fileChunk>
    }
  },
  actions: {
    addUploadSuccess(chunkIndex: number | string) {
      this.fileChunkList[chunkIndex] = {
        chunkIndex,
        chunkHash: '',
        isUploaded: true
      }
    },
    getIsUploaded(chunkIndex: number | string) {
      // 检查分片是否存在
      if (!this.fileChunkList[chunkIndex]) {
        return false
      }
      return this.fileChunkList[chunkIndex].isUploaded
    }
  }
})
