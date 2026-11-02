import dayjs from 'dayjs'
import fs from 'fs/promises'
import { createWriteStream } from 'fs';
import pathToFfmpegStatic from 'ffmpeg-static'
import { exec } from 'child_process'
import { store } from '../shared.js'
import path from 'path'
import http from 'http';
import { app } from 'electron'

// 动态获取 ffmpeg 和 ffprobe 路径
const pathToFfmpeg = app.isPackaged
    ? pathToFfmpegStatic.replace('app.asar', 'app.asar.unpacked')
    : pathToFfmpegStatic

// 预览保留为小文件，只返回本地路径；图片字节不再编码为 base64。
const previewPathFor = async (key) => {
    const folder = path.join(app.getPath('userData'), 'media-previews')
    await fs.mkdir(folder, { recursive: true })
    return path.join(folder, `${key}.jpg`)
}

const generateImagePreview = async (_fileSize, key, sourcePath) => {
    const targetPath = await previewPathFor(key)
    const command = `"${pathToFfmpeg}" -y -i "${sourcePath}" -frames:v 1 -vf "scale=320:320:force_original_aspect_ratio=decrease" -q:v 6 "${targetPath}"`
    await execCommand(command)
    return targetPath
}

const generateVideoPreview = async (key, videoPath) => {
    const targetPath = await previewPathFor(key)
    // 取首个可解码画面，避免不足2秒的短视频无法生成封面。
    const command = `"${pathToFfmpeg}" -y -i "${videoPath}" -frames:v 1 -vf "scale=320:320:force_original_aspect_ratio=decrease" -q:v 6 "${targetPath}"`
    await execCommand(command)
    return targetPath
}

/**
 * 根据日期生成存储路径
 * @param fileName -- 文件名称
 */
const generatePath = async (fileName) => {
    // 获得当前时间
    const currentTime = dayjs().format('YYYY-MM-DD')
    // 获得存储文件路径
    const basePath = store.get('storeLocation') || app.getPath('downloads')
    const savePath = path.join(basePath, currentTime)
    // 根据当前日期创建文件夹
    await fs.mkdir(savePath, { recursive: true })
    const filePath = savePath + '\\' + fileName
    return filePath
}

/**
 * 生成群聊头像
 */
const generateGroupAvatar = async () => {
    // 获得当前登录用户的头像路径
    const avatarPath = store.get('avatar')
    let localPath = store.get('storeLocation')
    if (!localPath) {
        localPath = app.getPath('pictures')
    }
    const groupTempAvatar = path.join(localPath, 'temp.png')
    const cmd = pathToFfmpeg + ` -f lavfi -i color=white:size=201x201 -i "${avatarPath}" -filter_complex [1:v]scale=67:67[a];[0:v][a]overlay=0:0 -frames:v 1 -y "${groupTempAvatar}"`
    await execCommand(cmd)
    const buffer = await fs.readFile(groupTempAvatar)
    // 清理临时文件
    try {
        await fs.unlink(groupTempAvatar)
    } catch (e) {
        console.warn('清理临时群头像文件失败', e)
    }
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return arrayBuffer
}

/**
 * 更新群聊头像
 */
const updateGroupAvatar = async (avatarUrlList) => {
    let localPath = store.get('storeLocation')
    if (localPath === undefined) {
        // 不存在
        localPath = app.getPath('pictures')
    }
    console.log('存储位置为', localPath)
    // 根据路径下载用户头像到本地
    const downloadPromises = avatarUrlList.map((url, index) => {
        return new Promise((resolve) => {
            const destPath = path.join(localPath, `${index}.png`)
            const req = http.get(url, (res) => {
                // 处理重定向
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    http.get(res.headers.location, (redirectRes) => {
                        const stream = createWriteStream(destPath)
                        redirectRes.pipe(stream)
                        stream.on('finish', () => {
                            stream.close()
                            resolve(destPath)
                        })
                        stream.on('error', () => resolve(null))
                    }).on('error', () => resolve(null))
                    return
                }
                const stream = createWriteStream(destPath)
                res.pipe(stream)
                stream.on('finish', () => {
                    stream.close()
                    resolve(destPath)
                })
                stream.on('error', () => resolve(null))
            })
            // 10秒超时
            req.setTimeout(10000, () => {
                req.destroy()
                resolve(null)
            })
            req.on('error', () => resolve(null))
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

    const outputPath = path.join(localPath, '/group_avatar.png')
    const cmd = pathToFfmpeg + ` -f lavfi -i color=white:size=201x201 ${inputFiles} -filter_complex "${scaleFilters}${gridFilter}" -frames:v 1 -y "${outputPath}"`

    await execCommand(cmd)
    const buffer = await fs.readFile(outputPath)
    // 清理下载的临时头像文件
    for (const p of localPaths) {
        if (p) {
            try { await fs.unlink(p) } catch (e) { /* ignore */ }
        }
    }
    // 清理生成的群头像临时文件
    try { await fs.unlink(outputPath) } catch (e) { /* ignore */ }
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return arrayBuffer
}

const execCommand = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('命令执行失败:', command, error.message)
                reject(error)
                return
            }
            resolve(stdout)
        })
    })
}

export {
    generatePath,
    generateImagePreview,
    generateVideoPreview,
    generateGroupAvatar,
    updateGroupAvatar
}
