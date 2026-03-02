import { mainWindow } from '../index'
import { generatePath } from '../Util/mediaHandle'
import fs from 'fs'
import http from 'http'

const downloadFile = (fileId, fileName, remoteUrl) => {
    return new Promise((resolve, reject) => {
        const desc = generatePath(fileName)
        let downloadedSize = 0
        let startTime = Date.now()

        http.get(remoteUrl, (res) => {
            const totalSize = parseInt(res.headers['content-length'], 10)
            console.log(totalSize)

            const stream = fs.createWriteStream(desc)

            res.on('data', (chunk) => {
                downloadedSize += chunk.length
                const progress = Math.floor((downloadedSize / totalSize) * 100)

                const currentTime = Date.now()
                const timeElapsed = Math.max((currentTime - startTime) / 1000, 0.1)
                const speed = downloadedSize / timeElapsed
                const speedMB = (speed / 1024 / 1024).toFixed(2)

                // 发送进度到渲染进程
                mainWindow.webContents.send('download-progress', {
                    fileId: fileId,
                    downloadProgress: progress,
                    downloadSpeed: speedMB,
                })
            })

            res.pipe(stream)

            stream.on('finish', () => {
                stream.close()
                console.log('下载完成')
                mainWindow.webContents.send('download-loadStatus', {
                    fileId: fileId,
                    status: 1
                })
                resolve(desc)
            })

            stream.on('error', (err) => {
                console.error('下载失败:', err)
                mainWindow.webContents.send('download-loadStatus', {
                    fileId: fileId,
                    status: 2
                })
                reject(err)
            })

        }).on('error', (err) => {
            console.error('请求失败:', err)
            reject(err)
        })
    })
}

/**
 * 下载图片，视频另存为
 */
const saveAsMedia = (remoteUrl, filePath) => {
    return new Promise((resolve) => {
        http.get(remoteUrl, (res) => {
            const stream = fs.createWriteStream(filePath)
            res.pipe(stream)
            stream.on('finish', () => {
                stream.close()
                resolve(filePath)
            })
        })
    })
}

export {
    downloadFile,
    saveAsMedia
}