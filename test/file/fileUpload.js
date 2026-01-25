import { createWorker } from './createWorker'
import { uploadFileApi, checkUploadedApi, mergeFileApi } from '../../src/renderer/src/api/Message'
import { fileBaseListInfo } from '../../src/renderer/src/stores/FileBaseInfoStore'
import { getFileType } from './filterFileKind'

export function uploadFile(file) {
  const fileId = file.uid
  // 将文件更新到文件列表中
  fileBaseListInfo().addFileBaseInfo(fileId, {
    file: file,
    fileId: fileId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    fileStatus: null,
    fileHash: null,
    process: 0
  })

  // 开始处理文件
  dealFile(file, fileId)
}

async function dealFile(file, fileId) {
  // 根据文件名，文件大小，文件类型等信息拿到文件的唯一标识 fileHash
  const fileHash = fileBaseListInfo().getFileHash(fileId)
  console.info(fileHash)
  // 拿到上传成功的文件索引列表
  let doneUploadChunkList = []
  if (fileHash !== null) {
    // 说明fileHash被创建过，发送请求获得上传的分块
    doneUploadChunkList = await checkUploadedApi({
      fileHash: fileHash
    })
  }

  // 对文件进行切片处理
  createWorker(file, doneUploadChunkList, (e) => {
    const fileHash = e.fileKey
    const chunkCount = e.chunkCount
    if (e.fileTask === null) {
      // 说明所以的分块都上传过一次了，直接进行合并
      mergeFile(fileHash, file, fileId, chunkCount)
      return
    }
    const { chunkIndex, chunkHash, chunkBlob } = e.fileTask
    const isNeedMerge = e.isNeedMerge
    // 将文件的唯一id存入缓存
    fileBaseListInfo().updateFileHash(fileId, fileHash)
    upload(file, fileId, chunkIndex, chunkHash, chunkBlob, fileHash, isNeedMerge, chunkCount)
  })
}

async function upload(
  file,
  fileId,
  chunkIndex,
  chunkHash,
  chunkBlob,
  fileHash,
  isNeedMerge,
  chunkCount
) {
  const formData = new FormData()

  formData.append('chunkBlob', chunkBlob)
  formData.append('chunkIndex', chunkIndex)
  formData.append('chunkHash', chunkHash)
  formData.append('fileHash', fileHash)

  // 配置监听传输的进程
  const config = {
    onUploadProgress: (e) => {
      // 如果文件大小未知，直接退出
      if (!e.lengthComputable) return
      const chunkLoaded = e.loaded
      // 向上取整
      let process = fileBaseListInfo().getFileProcess(fileId)
      process += Math.ceil((chunkLoaded / file.size) * 100)
      process = process > 100 ? 100 : process

      // 更新文件信息的进度条
      fileBaseListInfo().updateFileProcess(fileId, process)
    }
  }

  await uploadFileApi(formData, config)
    .then((res) => {
      // console.info('发送成功', res.data)
    })
    .catch((error) => {
      console.info(error)
    })

  if (isNeedMerge) {
    // 需要进行融合
    await mergeFile(fileHash, file, fileId, chunkCount)
  }
}

/**
 * 
 * @param fileHash -- 文件hash 用于校验文件的完整性
 * @param file -- 文件Blob
 * @param fileId -- 文件id
 * @param chunkCount -- 文件分块数量
 */
async function mergeFile(fileHash, file, fileId, chunkCount) {
  await mergeFileApi({
    fileHash: fileHash,
    fileName: file.name,
    fileType: getFileType(file),
    chunkCount: chunkCount
  }).then((res) => {
    console.info('合并成功')
    fileBaseListInfo().updateFileProcess(fileId, 100)
  })
}
