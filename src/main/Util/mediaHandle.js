import dayjs from 'dayjs'
import fs from 'fs/promises'
import { createWriteStream } from 'fs';
import pathToFfmpeg from 'ffmpeg-static'
import ffmprobe from 'ffprobe-static'
import { exec } from 'child_process'
import { store } from '../index'
import path from 'path'
import http from 'http';

/**
 * 限制图片尺寸，生成图片预览图用于展示头像，聊天内容的照片
 * @param fileSize -- 文件大小
 * @param fileName -- 文件名称
 * @param path -- 文件路径
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
    const mimeType = getImageMimeType(buffer)
    const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`
    // 删除临时预览照片
    await fs.unlink(targetPath)
    return base64
}

/**
 * 根据buffer获得照片类型
 * @param buffer 
 * @returns 
 */
const getImageMimeType = (buffer) => {
    const header = buffer.toString('hex', 0, 4)
    if (header.startsWith('ffd8')) return 'image/jpeg'
    if (header.startsWith('8950')) return 'image/png'
    if (header.startsWith('4749')) return 'image/gif'
    if (header.startsWith('5249')) return 'image/webp'
    return 'image/jpeg' // 默认
}

/**
 * 生成视频的预览图，展示在聊天窗口内
 * @param fileName -- 文件名称
 * @param videoPath -- 文件路径
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
 * 根据日期生成存储路径
 * @param fileName -- 文件名称
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

/**
 * 生成群聊头像
 */
const generateGroupAvatar = async () => {
    // 获得当前登录用户的头像路径
    const avatarPath = store.get('avatar')
    const localPath = store.get('storeLocation')
    const groupTempAvatar = localPath + '/temp.png'
    const cmd = pathToFfmpeg + ` -f lavfi -i color=white:size=201x201 -i "${avatarPath}" -filter_complex [1:v]scale=67:67[a];[0:v][a]overlay=0:0 -frames:v 1 -y "${groupTempAvatar}"`
    await execCommand(cmd)
    const buffer = await fs.readFile(groupTempAvatar)
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return arrayBuffer
}

/**
 * 更新群聊头像
 */
const updateGroupAvatar = async (avatarUrlList) => {
    const localPath = store.get('storeLocation')
    // 获取用户的头像路径
    const avatar = store.get('avatar')
    avatarUrlList.push(avatar)
    // 根据路径下载用户头像到本地
    const downloadPromises = avatarUrlList.map((url, index) => {
        return new Promise((resolve) => {
            const destPath = localPath + `/${index}.png`
            http.get(url, (res) => {
                const stream = createWriteStream(destPath)
                res.pipe(stream)
                stream.on('finish', () => {
                    stream.close()
                    resolve(destPath)
                })
            })
        })
    })

    const localPaths = await Promise.all(downloadPromises)

    // 生成FFmpeg参数
    const inputFiles = localPaths.map(path => `-i "${path}"`).join(' ')
    const scaleFilters = localPaths.map((_, index) => `[${index + 1}:v]scale=67:67[${String.fromCharCode(97 + index)}]`).join(';') + ';'

    // 生成网格布局 (3x3)
    const positions = [
        [0, 0], [67, 0], [134, 0],
        [0, 67], [67, 67], [134, 67],
        [0, 134], [67, 134], [134, 134]
    ]

    let gridFilter = '[0:v]'
    for (let i = 0; i < localPaths.length; i++) {
        const letter = String.fromCharCode(97 + i)
        const [x, y] = positions[i]
        if (i === 0) {
            gridFilter += `[${letter}]overlay=${x}:${y}`
            if (localPaths.length > 1) {
                gridFilter += `[tmp${i + 1}]`
            }
        } else {
            gridFilter += `;[tmp${i}][${letter}]overlay=${x}:${y}`
            if (i < localPaths.length - 1) {
                gridFilter += `[tmp${i + 1}]`
            }
        }
    }

    const outputPath = localPath + '/group_avatar.png'
    const cmd = pathToFfmpeg + ` -f lavfi -i color=white:size=201x201 ${inputFiles} -filter_complex "${scaleFilters}${gridFilter}" -frames:v 1 -y "${outputPath}"`

    await execCommand(cmd)
    const buffer = await fs.readFile(outputPath)
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return arrayBuffer
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
    generatePath,
    getImageMimeType,
    generateImagePreview,
    generateVideoPreview,
    generateGroupAvatar,
    updateGroupAvatar
}