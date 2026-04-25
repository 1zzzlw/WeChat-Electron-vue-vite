import fs from 'fs/promises'
import { store, mainWindow } from '../index'
import { createHash } from 'crypto'
import { FILE_TYPE_MAP, getFileName, getFileType } from './filterFileKind'
import { createWorkerProcess, CHUNK_SIZE } from './createWorkerProcess'
import { verifyFileUpload, uploadFileChunk, checkUploaded, mergeFile } from '../API/message'
import { generateImagePreview, generateVideoPreview } from '../Util/mediaHandle'
import { MessageQueue } from '../Util/messageQueue'

// 队列积压的最大阈值，防止读文件流太快，导致 worker 产出的 blob 在内存中堆积太多
const MAX_UPLOAD_BACKLOG = 6

// 每个文件都有一个上传队列，避免暂停A文件也把B文件暂停
const fileUploadQueueMap = new Map()
const uploadedBytesMap = new Map()
const uploadedChunkIndexSetMap = new Map()

const getOrCreateUploadQueue = (fileId) => {
    // 先判断当前集合中是否已经有该文件的上传队列
    const existing = fileUploadQueueMap.get(fileId)
    if (existing) return existing

    const queue = new MessageQueue({
        // 不加固定间隔
        intervalMs: 0,
        // 同一文件最多同时上传 2 个分块
        concurrency: 2,
        // 创建后立即可执行
        autoStart: true
    })
    fileUploadQueueMap.set(fileId, queue)
    return queue
}

const getChunkBytes = (fileSize, chunkIndex) => {
    const start = chunkIndex * CHUNK_SIZE
    const remaining = fileSize - start
    if (remaining <= 0) return 0
    return Math.min(CHUNK_SIZE, remaining)
}

// 缓存每个 fileId 的 { minioFilePath, chunkCount }，暂停后继续时，不重新走 verifyFileUpload/checkUploaded ，而是直接返回之前的元信息，保持你 IPC/渲染侧调用不变
const fileUploadMetaMap = new Map()
// 保存每个 fileId 对应的“读流控制器”，用来暂停/恢复/停止文件读取流
const fileStreamControllerMap = new Map()
// 标记哪些 fileId 处于“用户主动暂停”状态，在 stopUpload(fileId) 与 uploadFile(file) （继续）之间建立状态桥梁
const pausedFileSet = new Set()
// 标记哪些 fileId 因为“队列积压过多”而被自动暂停读流，区分“用户暂停”与“背压暂停”，避免用户暂停后又被自动恢复
const backpressurePausedFileSet = new Set()

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

    // 如果暂停队列里面包含该文件，说明是执行的继续操作
    if (pausedFileSet.has(fileId)) {
        pausedFileSet.delete(fileId)
        // 重新创建该文件的上传队列
        const queue = getOrCreateUploadQueue(fileId)
        queue.resume()
        const controller = fileStreamControllerMap.get(fileId)
        controller?.resume()

        const meta = fileUploadMetaMap.get(fileId)
        if (meta) return meta
        return { minioFilePath: undefined, chunkCount: Math.ceil(fileSize / CHUNK_SIZE) }
    }

    // 先获取上传凭证
    let verify
    let minioFilePath
    await verifyFileUpload(fileId).then((res) => {
        verify = res.data.verify
        minioFilePath = res.data.minioFilePath
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
    const meta = {
        minioFilePath: minioFilePath,
        chunkCount: chunkCount
    }
    fileUploadMetaMap.set(fileId, meta)
    return meta
}


/**
 *  文件分片并上传文件块
 *  @param arrayBuffer -- 文件buffer信息，进行分片上传
 *  @param fileSize -- 文件大小
 */
const fileUpload = async (localPath, fileSize, fileId, fileName, fileType, verify, minioFilePath, chunksList) => {
    let startTime = Date.now()
    const uploadQueue = getOrCreateUploadQueue(fileId)

    // 保存上传凭证
    fileVerifyMap.set(fileId, verify)
    // 初始化完成的分块数量
    completedChunksMap.set(fileId, chunksList.length)
    uploadedChunkIndexSetMap.set(fileId, new Set(chunksList))
    uploadedBytesMap.set(fileId, chunksList.reduce((sum, idx) => sum + getChunkBytes(fileSize, idx), 0))

    const streamController = createWorkerProcess(localPath, fileSize, fileId, chunksList, (e) => {
        const { fileId, currentFileIndex, chunkHash, blob } = e.task
        const key = `${fileId}-${currentFileIndex}`

        if (!pausedFileSet.has(fileId) && (uploadQueue.size + uploadQueue.running) >= MAX_UPLOAD_BACKLOG) {
            backpressurePausedFileSet.add(fileId)
            streamController.pause()
        }

        const controller = new AbortController()
        uploadControllers.set(key, controller)

        uploadQueue.enqueue(async () => {
            const currentVerify = fileVerifyMap.get(fileId)
            if (!currentVerify) return

            const formData = new FormData()
            formData.append('chunkBlob', blob)
            formData.append('chunkIndex', currentFileIndex)
            formData.append('chunkHash', chunkHash)
            formData.append('fileId', fileId)
            formData.append('fileType', fileType)
            formData.append('verify', currentVerify)

            try {
                await uploadFileChunk(formData, {
                    signal: controller.signal
                })

                const uploadedSet = uploadedChunkIndexSetMap.get(fileId)
                const isFirstSuccess = !uploadedSet?.has(currentFileIndex)
                if (isFirstSuccess) {
                    uploadedSet?.add(currentFileIndex)
                    const currentCompleted = completedChunksMap.get(fileId) + 1
                    completedChunksMap.set(fileId, currentCompleted)
                    uploadedBytesMap.set(fileId, (uploadedBytesMap.get(fileId) || 0) + getChunkBytes(fileSize, currentFileIndex))
                }

                const uploadedBytes = uploadedBytesMap.get(fileId) || 0
                const progress = Math.floor((uploadedBytes / fileSize) * 100)

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
            } finally {
                uploadControllers.delete(key)

                if (backpressurePausedFileSet.has(fileId)) {
                    if (!pausedFileSet.has(fileId) && (uploadQueue.size + uploadQueue.running) < MAX_UPLOAD_BACKLOG) {
                        backpressurePausedFileSet.delete(fileId)
                        streamController.resume()
                    }
                }
            }
        }, { signal: controller.signal }).catch((err) => {
            if (err?.name === 'AbortError') return
            console.log(err)
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
                cleanupFileUploadState(fileId)
            }).catch(() => {
                console.log('文件上传失败')
                // 上传失败，修改发送状态
                mainWindow.webContents.send('upload-loadStatus', {
                    fileId: fileId,
                    status: 2
                })
                cleanupFileUploadState(fileId)
            })
        }
    )
    fileStreamControllerMap.set(fileId, streamController)
}

const stopUpload = (fileId) => {
    pausedFileSet.add(fileId)
    const queue = getOrCreateUploadQueue(fileId)
    queue.pause()
    const controller = fileStreamControllerMap.get(fileId)
    controller?.pause()
}

const cleanupFileUploadState = (fileId) => {
    fileVerifyMap.delete(fileId)
    completedChunksMap.delete(fileId)
    fileUploadMetaMap.delete(fileId)
    pausedFileSet.delete(fileId)
    backpressurePausedFileSet.delete(fileId)
    fileUploadQueueMap.delete(fileId)
    uploadedBytesMap.delete(fileId)
    uploadedChunkIndexSetMap.delete(fileId)
    const controller = fileStreamControllerMap.get(fileId)
    controller?.stop?.()
    fileStreamControllerMap.delete(fileId)

    for (const [key, abortController] of uploadControllers) {
        if (key.startsWith(fileId)) {
            abortController.abort()
            uploadControllers.delete(key)
        }
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
    getFileInfo,
    uploadFile,
    stopUpload
}

