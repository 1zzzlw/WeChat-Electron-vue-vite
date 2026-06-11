import { mainWindow } from '../index'
import { generatePath } from '../Util/mediaHandle'
import fs from 'fs'
import http from 'http'

const downloadFile = (fileId, fileName, remoteUrl) => {
    return new Promise((resolve, reject) => {
        const desc = generatePath(fileName)
        let downloadedSize = 0
        let startTime = Date.now()
        let cleaned = false

        const cleanup = () => {
            if (cleaned) return
            cleaned = true
            // 下载中断时删除不完整的文件
            try {
                if (fs.existsSync(desc)) {
                    fs.unlinkSync(desc)
                }
            } catch (e) { /* ignore */ }
        }

        const req = http.get(remoteUrl, (res) => {
            // 处理重定向
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                http.get(res.headers.location, (redirectRes) => {
                    const totalSize = parseInt(redirectRes.headers['content-length'], 10)
                    const stream = fs.createWriteStream(desc)

                    redirectRes.on('data', (chunk) => {
                        downloadedSize += chunk.length
                        const progress = totalSize > 0 ? Math.floor((downloadedSize / totalSize) * 100) : 0
                        const currentTime = Date.now()
                        const timeElapsed = Math.max((currentTime - startTime) / 1000, 0.1)
                        const speed = downloadedSize / timeElapsed
                        const speedMB = (speed / 1024 / 1024).toFixed(2)
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('download-progress', {
                                fileId, downloadProgress: progress, downloadSpeed: speedMB,
                            })
                        }
                    })

                    redirectRes.pipe(stream)

                    stream.on('finish', () => {
                        stream.close()
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('download-loadStatus', { fileId, status: 1 })
                        }
                        resolve(desc)
                    })

                    stream.on('error', (err) => {
                        cleanup()
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('download-loadStatus', { fileId, status: 2 })
                        }
                        reject(err)
                    })
                }).on('error', (err) => {
                    cleanup()
                    reject(err)
                })
                return
            }

            const totalSize = parseInt(res.headers['content-length'], 10)
            const stream = fs.createWriteStream(desc)

            res.on('data', (chunk) => {
                downloadedSize += chunk.length
                const progress = totalSize > 0 ? Math.floor((downloadedSize / totalSize) * 100) : 0
                const currentTime = Date.now()
                const timeElapsed = Math.max((currentTime - startTime) / 1000, 0.1)
                const speed = downloadedSize / timeElapsed
                const speedMB = (speed / 1024 / 1024).toFixed(2)
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('download-progress', {
                        fileId, downloadProgress: progress, downloadSpeed: speedMB,
                    })
                }
            })

            res.pipe(stream)

            stream.on('finish', () => {
                stream.close()
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('download-loadStatus', { fileId, status: 1 })
                }
                resolve(desc)
            })

            stream.on('error', (err) => {
                cleanup()
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('download-loadStatus', { fileId, status: 2 })
                }
                reject(err)
            })
        })

        // 30秒连接超时
        req.setTimeout(30000, () => {
            req.destroy()
            cleanup()
            reject(new Error('下载连接超时'))
        })

        req.on('error', (err) => {
            cleanup()
            reject(err)
        })
    })
}

/**
 * 下载图片，视频另存为
 */
const saveAsMedia = (remoteUrl, filePath) => {
    return new Promise((resolve, reject) => {
        const req = http.get(remoteUrl, (res) => {
            const stream = fs.createWriteStream(filePath)
            res.pipe(stream)
            stream.on('finish', () => {
                stream.close()
                resolve(filePath)
            })
            stream.on('error', (err) => {
                try { fs.unlinkSync(filePath) } catch (e) { /* ignore */ }
                reject(err)
            })
        })
        req.setTimeout(15000, () => {
            req.destroy()
            try { fs.unlinkSync(filePath) } catch (e) { /* ignore */ }
            reject(new Error('另存为连接超时'))
        })
        req.on('error', (err) => {
            try { fs.unlinkSync(filePath) } catch (e) { /* ignore */ }
            reject(err)
        })
    })
}

export {
    downloadFile,
    saveAsMedia
}