import fs from 'fs/promises'
import { store } from '../index'
import { createHash } from 'crypto'
import { FILE_TYPE_MAP, getFileName, getFileType } from './filterFileKind'
import { createWorkerProcess } from './createWorkerProcess'
import { verifyFileUpload, uploadFileChunk, checkUploaded, mergeFile } from '../API/message'

/**
 * 根据文件路径获取文件的信息
 * @param path -- 文件路径 
 */
const getFileInfo = async (path) => {
    // 获得文件类型
    const fileType = getFileType(path)
    const fileName = getFileName(path)
    const fileInfo = await fs.stat(path)
    const fileSize = fileInfo.size
    const fileMtimeMs = fileInfo.mtimeMs
    const fileIno = fileInfo.ino
    const content = FILE_TYPE_MAP.get(fileType)

    // 文件的唯一标识，相当于文件的唯一id
    const fileId = generateFileId(fileName, fileSize, fileMtimeMs, fileIno)

    if (fileType === 2) {
        // 图片，生成blob预览图展示在前端

    } else if (fileType === 3) {
        // 视频，使用FFmpeg生成视频的预览图

    } else if (fileType === 4) {
        // 音频，对音频的相关操作

    } else {
        // 文件，对文件的相关操作

    }

    // 先获取上传凭证
    let verify
    await verifyFileUpload(fileId).then((res) => {
        verify = res.data
    })

    // 获得上传凭证成功，从服务端拉取已经上传过的分块
    const res = await checkUploaded({
        verify: verify,
        fileId: fileId
    })
    const chunksList = res.data

    // 分片上传
    fileUpload(path, fileSize, fileId, verify, chunksList)

    // 返回文件信息
    return {
        content: content,
        fileId: fileId,
        fileName: fileName,
        fileSize: fileSize,
        fileType: fileType,
        localPath: path
    }
}

/**
 *  上传文件
 *  @param arrayBuffer -- 文件buffer信息，进行分片上传
 *  @param fileSize -- 文件大小
 */
const fileUpload = async (path, fileSize, fileId, verify, chunksList) => {
    const results = await createWorkerProcess(path, fileSize, fileId, chunksList)

    for (const result of results) {
        const { fileId, fileIndex, chunkHash, blob } = result
        console.log(fileId, fileIndex, chunkHash, blob)
        const formData = new FormData()
        formData.append('chunkBlob', blob)
        formData.append('chunkIndex', fileIndex)
        formData.append('chunkHash', chunkHash)
        formData.append('fileId', fileId)
        formData.append('verify', verify)

        uploadFileChunk(formData)
    }
}

/**
 * 
 * @param fileName -- 文件名 
 * @param fileSize -- 文件大小
 * @param fileMtimeMs -- 文件的最后修改时间
 * @param fileIno -- 文件的Inode编号
 * @returns 
 */
const generateFileId = (fileName, fileSize, fileMtimeMs, fileIno) => {
    const userId = store.get('userId')
    const fileIdentifier = `${userId}_${fileName}_${fileSize}_${fileMtimeMs}_${fileIno}`
    return createHash('md5').update(fileIdentifier).digest('hex')
}

export {
    getFileInfo
}

