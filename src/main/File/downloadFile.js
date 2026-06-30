import { refs } from '../shared.js'
import { generatePath } from '../Util/mediaHandle'
import fs from 'fs'
import http from 'http'
import https from 'https'

/** 根据 URL 协议自动选择 http 或 https 的 get 方法 */
const smartGet = (url, options, callback) => {
  const lib = url.startsWith('https:') ? https : http
  return lib.get(url, options, callback)
}

// 管理活跃的下载任务
// key: fileId, value: { req, redirectReq, stream, desc, downloadedSize, totalSize, startTime, fileName, remoteUrl, paused }
const activeDownloads = new Map()

/**
 * 开始/恢复下载文件
 */
const downloadFile = (fileId, fileName, remoteUrl) => {
    // 检查是否是恢复下载
    const existing = activeDownloads.get(fileId)
    const existingSize = existing ? existing.downloadedSize : 0

    return generatePath(fileName).then((desc) => {
        return new Promise((resolve, reject) => {
            let downloadedSize = existingSize
            let startTime = existing ? existing.startTime : Date.now()
            let cleaned = false

            const cleanup = () => {
                if (cleaned) return
                cleaned = true
                if (activeDownloads.get(fileId)?.paused) return // 暂停时不删除文件
                try {
                    if (fs.existsSync(desc)) {
                        fs.unlinkSync(desc)
                    }
                } catch (e) { /* ignore */ }
            }

            // 构建请求选项：断点续传
            const requestOptions = {}
            if (existingSize > 0 && fs.existsSync(desc)) {
                requestOptions.headers = { 'Range': `bytes=${existingSize}-` }
            }

            const req = smartGet(remoteUrl, requestOptions, (res) => {
                // 处理重定向
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const redirectUrl = res.headers.location
                    // 重定向请求也需带上 Range 头
                    const redirectOptions = {}
                    if (existingSize > 0 && fs.existsSync(desc)) {
                        redirectOptions.headers = { 'Range': `bytes=${existingSize}-` }
                    }

                    const redirectReq = smartGet(redirectUrl, redirectOptions, (redirectRes) => {
                        const contentRange = redirectRes.headers['content-range']
                        let totalSize = parseInt(redirectRes.headers['content-length'], 10)
                        // 206 Partial Content: Content-Range 格式 "bytes start-end/total"
                        if (redirectRes.statusCode === 206 && contentRange) {
                            const match = contentRange.match(/\/(\d+)/)
                            if (match) totalSize = parseInt(match[1], 10)
                        }

                        const stream = fs.createWriteStream(desc, { flags: existingSize > 0 ? 'a' : 'w' })

                        // 保存到活跃下载 map
                        activeDownloads.set(fileId, {
                            req, redirectReq, stream,
                            desc, downloadedSize, totalSize, startTime,
                            fileName, remoteUrl, paused: false
                        })

                        redirectRes.on('data', (chunk) => {
                            downloadedSize += chunk.length
                            activeDownloads.get(fileId).downloadedSize = downloadedSize
                            const progress = totalSize > 0 ? Math.floor((downloadedSize / totalSize) * 100) : 0
                            const currentTime = Date.now()
                            const timeElapsed = Math.max((currentTime - startTime) / 1000, 0.1)
                            const speed = downloadedSize / timeElapsed
                            const speedMB = (speed / 1024 / 1024).toFixed(2)
                            if (refs.mainWindow && !refs.mainWindow.isDestroyed()) {
                                refs.mainWindow.webContents.send('download-progress', {
                                    fileId, downloadProgress: Math.min(progress, 100), downloadSpeed: speedMB,
                                })
                            }
                        })

                        redirectRes.pipe(stream)

                        stream.on('finish', () => {
                            stream.close()
                            activeDownloads.delete(fileId)
                            if (refs.mainWindow && !refs.mainWindow.isDestroyed()) {
                                refs.mainWindow.webContents.send('download-loadStatus', { fileId, status: 1 })
                            }
                            resolve(desc)
                        })

                        stream.on('error', (err) => {
                            if (activeDownloads.get(fileId)?.paused) return
                            cleanup()
                            activeDownloads.delete(fileId)
                            if (refs.mainWindow && !refs.mainWindow.isDestroyed()) {
                                refs.mainWindow.webContents.send('download-loadStatus', { fileId, status: 2 })
                            }
                            reject(err)
                        })
                    })

                    redirectReq.setTimeout(30000, () => {
                        if (activeDownloads.get(fileId)?.paused) return
                        redirectReq.destroy()
                        cleanup()
                        activeDownloads.delete(fileId)
                        reject(new Error('下载连接超时'))
                    })

                    redirectReq.on('error', (err) => {
                        if (activeDownloads.get(fileId)?.paused) {
                            // 暂停触发的 destroy：不清理，保留进度
                            return
                        }
                        cleanup()
                        activeDownloads.delete(fileId)
                        reject(err)
                    })
                    return
                }

                // 非重定向响应
                const contentRange = res.headers['content-range']
                let totalSize = parseInt(res.headers['content-length'], 10)
                if (res.statusCode === 206 && contentRange) {
                    const match = contentRange.match(/\/(\d+)/)
                    if (match) totalSize = parseInt(match[1], 10)
                }

                const stream = fs.createWriteStream(desc, { flags: existingSize > 0 ? 'a' : 'w' })

                // 保存到活跃下载 map
                activeDownloads.set(fileId, {
                    req, redirectReq: null, stream,
                    desc, downloadedSize, totalSize, startTime,
                    fileName, remoteUrl, paused: false
                })

                res.on('data', (chunk) => {
                    downloadedSize += chunk.length
                    activeDownloads.get(fileId).downloadedSize = downloadedSize
                    const progress = totalSize > 0 ? Math.floor((downloadedSize / totalSize) * 100) : 0
                    const currentTime = Date.now()
                    const timeElapsed = Math.max((currentTime - startTime) / 1000, 0.1)
                    const speed = downloadedSize / timeElapsed
                    const speedMB = (speed / 1024 / 1024).toFixed(2)
                    if (refs.mainWindow && !refs.mainWindow.isDestroyed()) {
                        refs.mainWindow.webContents.send('download-progress', {
                            fileId, downloadProgress: Math.min(progress, 100), downloadSpeed: speedMB,
                        })
                    }
                })

                res.pipe(stream)

                stream.on('finish', () => {
                    stream.close()
                    activeDownloads.delete(fileId)
                    if (refs.mainWindow && !refs.mainWindow.isDestroyed()) {
                        refs.mainWindow.webContents.send('download-loadStatus', { fileId, status: 1 })
                    }
                    resolve(desc)
                })

                stream.on('error', (err) => {
                    if (activeDownloads.get(fileId)?.paused) return
                    cleanup()
                    activeDownloads.delete(fileId)
                    if (refs.mainWindow && !refs.mainWindow.isDestroyed()) {
                        refs.mainWindow.webContents.send('download-loadStatus', { fileId, status: 2 })
                    }
                    reject(err)
                })
            })

            // 30秒连接超时
            req.setTimeout(30000, () => {
                if (activeDownloads.get(fileId)?.paused) return
                req.destroy()
                cleanup()
                activeDownloads.delete(fileId)
                reject(new Error('下载连接超时'))
            })

            req.on('error', (err) => {
                if (activeDownloads.get(fileId)?.paused) {
                    // 暂停触发的 destroy：不清理，不 reject
                    return
                }
                cleanup()
                activeDownloads.delete(fileId)
                reject(err)
            })
        })
    })
}

/**
 * 暂停下载：销毁 HTTP 请求，保留已下载的部分文件
 */
const pauseDownload = (fileId) => {
    const state = activeDownloads.get(fileId)
    if (!state) return

    // 标记为暂停（防止 error handler 清理文件）
    state.paused = true

    // 销毁写入流（使用 destroy 而非 end，避免触发 finish 事件导致状态被清理）
    if (state.stream && !state.stream.destroyed) {
        state.stream.destroy()
    }

    // 销毁重定向请求
    if (state.redirectReq) {
        state.redirectReq.destroy()
    }

    // 销毁主请求
    if (state.req) {
        state.req.destroy()
    }

    // 通知渲染进程
    if (refs.mainWindow && !refs.mainWindow.isDestroyed()) {
        refs.mainWindow.webContents.send('download-paused', {
            fileId,
            downloadedSize: state.downloadedSize
        })
    }
}

/**
 * 保存图片/视频另存为
 */
const saveAsMedia = (remoteUrl, filePath) => {
    return new Promise((resolve, reject) => {
        const req = smartGet(remoteUrl, (res) => {
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
    pauseDownload,
    saveAsMedia
}
