import fs from 'fs/promises'
import { store, mainWindow } from '../index'
import { createHash } from 'crypto'
import { FILE_TYPE_MAP, getFileName, getFileType } from './filterFileKind'
import { createWorkerProcess, CHUNK_SIZE } from './createWorkerProcess'
import { verifyFileUpload, uploadFileChunk, checkUploaded, mergeFile } from '../API/message'
import { generateImagePreview, generateVideoPreview } from '../Util/mediaHandle'

// 已完成的上传分块数量，键为文件id，值为已经上传的文件分块数量，便于计算上传进度
const completedChunksMap = new Map()
// 正在上传的文件分块，键为文件id和分块索引，值为该文件分块的控制器，便于暂停处理，方便管理
const uploadControllers = new Map()
// 保存文件上传凭证，键为文件id，值为凭证信息
const fileVerifyMap = new Map()


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

    console.log('文件大小', fileSize)
    // 文件的唯一标识，相当于文件的唯一id
    const fileId = generateFileId(fileName, fileSize, fileMtimeMs, fileIno)

    let base64 = null

    if (fileType === 2) {
        // 图片，生成blob预览图展示在前端
        base64 = await generateImagePreview(fileSize, fileName, path)
    } else if (fileType === 3) {
        // 视频，使用FFmpeg生成视频的预览图
        base64 = await generateVideoPreview(fileName, path)
    } else if (fileType === 4) {
        // 音频，对音频的相关操作
    } else {
        // 文件，对文件的相关操作
    }

    // 返回用于展示的文件信息
    return {
        base64: base64,
        fileId: fileId,
        fileName: fileName,
        fileSize: fileSize,
        fileType: fileType,
        content: content,
        localPath: path
    }
}

/**
 * 上传文件
 * @param file -- 文件信息
 */
const uploadFile = async (file) => {
    const { fileId, fileName, fileSize, fileType, localPath } = file
    // 先获取上传凭证
    let verify
    let minioFilePath
    await verifyFileUpload(fileId).then((res) => {
        verify = res.data.verify
        minioFilePath = res.data.minioFilePath
        console.log(verify, minioFilePath)
    })

    // 获得上传凭证成功，从服务端拉取已经上传过的分块
    const res = await checkUploaded({
        verify: verify,
        fileId: fileId
    })
    const chunksList = res.data

    // 分片上传
    fileUpload(localPath, fileSize, fileId, fileName, fileType, verify, minioFilePath, chunksList)

    // 分块数量
    const chunkCount = Math.ceil(fileSize / CHUNK_SIZE)

    // 返回上传进行中的文件信息
    return {
        minioFilePath: minioFilePath,
        chunkCount: chunkCount
    }
}


/**
 *  文件分片并上传文件块
 *  @param arrayBuffer -- 文件buffer信息，进行分片上传
 *  @param fileSize -- 文件大小
 */
const fileUpload = async (localPath, fileSize, fileId, fileName, fileType, verify, minioFilePath, chunksList) => {
    let startTime = Date.now()

    // 保存上传凭证
    fileVerifyMap.set(fileId, verify)
    // 初始化完成的分块数量
    completedChunksMap.set(fileId, 0)

    // console.log(localPath, fileSize, fileId, chunksList)
    createWorkerProcess(localPath, fileSize, fileId, chunksList, (e) => {
        const { fileId, currentFileIndex, chunkHash, blob } = e.task
        const currentVerify = fileVerifyMap.get(fileId)
        const formData = new FormData()
        formData.append('chunkBlob', blob)
        formData.append('chunkIndex', currentFileIndex)
        formData.append('chunkHash', chunkHash)
        formData.append('fileId', fileId)
        formData.append('fileType', fileType)
        formData.append('verify', currentVerify)

        // 创建上传请求的控制器，用于暂停
        const controller = new AbortController()
        // 将该分块文件加入上传控制集合中，便于管理
        uploadControllers.set(`${fileId}-${currentFileIndex}`, controller)

        uploadFileChunk(formData, {
            // 传入取消信号，告诉axios这个请求可以被取消
            signal: controller.signal
        }).then(() => {
            // 上传成功
            uploadControllers.delete(`${fileId}-${currentFileIndex}`)

            const currentCompleted = completedChunksMap.get(fileId) + 1
            completedChunksMap.set(fileId, currentCompleted)

            const uploadedBytes = currentCompleted * CHUNK_SIZE
            const progress = Math.floor((uploadedBytes / fileSize) * 100)

            // 计算上传速度
            const currentTime = Date.now()
            const timeElapsed = Math.max((currentTime - startTime) / 1000, 0.1)
            const speed = uploadedBytes / timeElapsed
            const speedMB = (speed / 1024 / 1024).toFixed(2)

            mainWindow.webContents.send('upload-progress', {
                fileId: fileId,
                uploadProgress: progress,
                uploadSpeed: speedMB
            })

            e.updateStatus(currentFileIndex)
        })
    },
        (fileIndex) => {
            console.log('合并')
            mergeFile({
                fileHash: fileId,
                fileName: fileName,
                fileType: fileType,
                minioFilePath: minioFilePath,
                chunkCount: fileIndex
            }).then(() => {
                console.log('文件上传成功')
                // 上传成功，修改发送状态
                mainWindow.webContents.send('upload-loadStatus', {
                    fileId: fileId,
                    status: 1
                })
            }).catch(() => {
                console.log('文件上传失败')
                // 上传失败，修改发送状态
                mainWindow.webContents.send('upload-loadStatus', {
                    fileId: fileId,
                    status: 2
                })
            })
        }
    )
}

const stopUpload = (fileId) => {
    // 取消当前分块的上传请求
    for (const [key, controller] of uploadControllers) {
        if (key.startsWith(fileId)) {
            // 取消当前分块请求
            controller.abort()
            uploadControllers.delete(key)
        }
    }
    // 清除上传凭证，关闭后续分块上传的请求
    fileVerifyMap.delete(fileId)
    completedChunksMap.delete(fileId)
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
    getFileInfo,
    uploadFile,
    stopUpload
}

