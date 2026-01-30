import fs from 'fs/promises'
import { store, mainWindow } from '../index'
import { createHash } from 'crypto'
import { FILE_TYPE_MAP, getFileName, getFileType } from './filterFileKind'
import { createWorkerProcess } from './createWorkerProcess'
import { verifyFileUpload, uploadFileChunk, checkUploaded, mergeFile } from '../API/message'
import dayjs from 'dayjs'
import pathToFfmpeg from 'ffmpeg-static'
import ffmprobe from 'ffprobe-static'
import { exec } from 'child_process'
import path from 'path'
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

    // 返回文件信息
    return {
        base64: base64,
        content: content,
        fileId: fileId,
        fileName: fileName,
        fileSize: fileSize,
        fileType: fileType,
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

    return minioFilePath
}

/**
 *  文件分片并上传文件块
 *  @param arrayBuffer -- 文件buffer信息，进行分片上传
 *  @param fileSize -- 文件大小
 */
const fileUpload = async (localPath, fileSize, fileId, fileName, fileType, verify, minioFilePath, chunksList) => {
    // console.log(localPath, fileSize, fileId, chunksList)
    createWorkerProcess(localPath, fileSize, fileId, chunksList, (e) => {
        const { fileId, currentFileIndex, chunkHash, blob, chunkCount } = e.task
        const formData = new FormData()
        formData.append('chunkBlob', blob)
        formData.append('chunkIndex', currentFileIndex)
        formData.append('chunkHash', chunkHash)
        formData.append('fileId', fileId)
        formData.append('fileType', fileType)
        formData.append('verify', verify)

        // 配置监听传输的进程
        const config = {
            onUploadProgress: (e) => {
                // 如果文件大小未知，直接退出
                if (!e.lengthComputable) return
                if (e.loaded === e.total) {
                    mainWindow.webContents.send('upload-progress', {
                        uploadProgress: e.loaded,
                        fileId: fileId,
                        totalCount: chunkCount
                    });
                }
            }
        }

        uploadFileChunk(formData, config).then(() => {
            // 上传成功
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
            })
        }
    )
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

/**
 * 限制图片尺寸，生成图片预览图用于展示头像，聊天内容的照片
 * @param path 
 */
const generateImagePreview = async (fileSize, fileName, path) => {
    if (fileSize <= 30720) {
        // 照片尺寸小于30KB，直接生成blob返回给前端展示
        const buffer = await fs.readFile(path)
        const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`
        return base64
    }
    const targetPath = generatePath(fileName)
    const cmd = pathToFfmpeg + ` -y -i "${path}" -vf scale=200:-1 -q:v 30 -compression_level 9 "${targetPath}"`
    await execCommand(cmd)
    const buffer = await fs.readFile(targetPath)
    const getImageMimeType = (buffer) => {
        const header = buffer.toString('hex', 0, 4)
        if (header.startsWith('ffd8')) return 'image/jpeg'
        if (header.startsWith('8950')) return 'image/png'
        if (header.startsWith('4749')) return 'image/gif'
        if (header.startsWith('5249')) return 'image/webp'
        return 'image/jpeg' // 默认
    }
    const mimeType = getImageMimeType(buffer)
    const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`
    // 删除临时预览照片
    // await fs.unlink(targetPath)
    return base64
}

/**
 * 生成视频的预览图，展示在聊天窗口内
 * @param videoPath 
 */
const generateVideoPreview = async (fileName, videoPath) => {
    let command = ffmprobe.path + ` -v error -select_streams v:0 -show_entries stream=codec_name "${videoPath}"`
    let result = await execCommand(command)
    // 去掉空格
    result = result.replaceAll("\r\n", "")
    let targetPath
    // 按照等号分割
    result = result.substring(result.indexOf('=') + 1)
    const codec = result.substring(0, result.indexOf('['))
    if ('hevc' === codec) {
        targetPath = generatePath(fileName)
        command = pathToFfmpeg + ` -y -i "${videoPath}" -c:v libx264 -crf 20 ${targetPath}`
        await execCommand(command)
    }
    // 生成缩略图
    const baseName = fileName.replace(path.extname(fileName), '') + '_thumb.jpg'
    targetPath = generatePath(baseName)
    command = pathToFfmpeg + ` -y -ss 2 -i "${videoPath}" -vframes 1 -vf "scale=min(300\\,iw):min(300\\,ih):force_original_aspect_ratio=decrease" -q:v 8 -f mjpeg "${targetPath}"`
    await execCommand(command)
    // 生成缩略图的base64
    const buffer = await fs.readFile(targetPath)
    const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`
    // 删除临时预览照片
    await fs.unlink(targetPath)
    return base64
}

/**
 *  根据日期生成存储路径
 */
const generatePath = (fileName) => {
    // 获得当前时间
    const currentTime = dayjs().format('YYYY-MM-DD')
    // 获得存储文件路径
    const savePath = store.get('storeLocation') + '\\' + currentTime
    // 根据当前日期创建文件夹
    fs.mkdir(savePath, { recursive: true })
    const filePath = savePath + '\\' + fileName
    return filePath
}

const execCommand = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            // console.log('ffmpeg的命令:', command)
            if (error) {
                console.log('错误', error)
            }
            resolve(stdout)
        })
    })
}

export {
    getFileInfo,
    uploadFile
}

