import { refs } from '../shared.js'
import { generatePath } from '../Util/mediaHandle'
import fs from 'fs'
import http from 'http'
import https from 'https'
import { Transform } from 'stream'
import { pipeline } from 'stream/promises'

/** 根据 URL 协议自动选择 http 或 https 的 get 方法 */
const smartGet = (url, options, callback) => {
    const lib = url.startsWith('https:') ? https : http
    return lib.get(url, options, callback)
}

const activeDownloads = new Map()

const notifyDownload = (channel, data) => {
    if (refs.mainWindow && !refs.mainWindow.isDestroyed()) {
        refs.mainWindow.webContents.send(channel, data)
    }
}

// 普通响应和重定向响应共用后续校验，支持相对 Location，限制重定向次数。
const getResponse = async (url, headers, signal) => {
    for (let redirects = 0; redirects <= 5; redirects++) {
        signal.throwIfAborted()
        const response = await new Promise((resolve, reject) => {
            const req = smartGet(url, { headers, signal }, resolve)
            req.setTimeout(30000, () => req.destroy(new Error('下载请求超时')))
            req.once('error', reject)
        })
        if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
            response.destroy()
            if (!response.headers.location || redirects === 5) {
                throw new Error('下载重定向无效或次数过多')
            }
            url = new URL(response.headers.location, url).href
            continue
        }
        return response
    }
}

// 校验响应后才打开文件；pipeline 会在失败或暂停时关闭所有流。
const transferFile = async (state, onProgress) => {
    const signal = state.controller.signal
    const headers = {}
    if (state.downloadedSize > 0) {
        headers.Range = `bytes=${state.downloadedSize}-`
        if (state.validator) headers['If-Range'] = state.validator
    }
    const response = await getResponse(state.remoteUrl, headers, signal)
    try {
        signal.throwIfAborted()
        if (response.statusCode !== 200 && response.statusCode !== 206) {
            throw new Error(`下载失败：HTTP ${response.statusCode}`)
        }

        let offset = state.downloadedSize
        let expectedBytes = response.headers['content-length'] === undefined
            ? null : Number(response.headers['content-length'])
        if (expectedBytes !== null && (!Number.isSafeInteger(expectedBytes) || expectedBytes < 0)) {
            throw new Error('下载响应的文件长度无效')
        }
        state.totalSize = expectedBytes

        if (response.statusCode === 206) {
            const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers['content-range'] || '')
            if (!range) throw new Error('下载响应缺少有效的 Content-Range')
            const start = Number(range[1])
            const end = Number(range[2])
            const total = Number(range[3])
            if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
                start !== offset || end < start ||
                !Number.isSafeInteger(total) || end >= total) {
                throw new Error('下载响应的续传范围与本地文件不一致')
            }
            const rangeBytes = end - start + 1
            if (expectedBytes !== null && expectedBytes !== rangeBytes) {
                throw new Error('下载响应的长度与续传范围不一致')
            }
            expectedBytes = rangeBytes
            state.totalSize = total
        } else {
            // 服务端忽略 Range 返回完整文件时，从头覆盖，不能追加。
            offset = 0
        }

        const etag = response.headers.etag
        state.validator = etag && !etag.startsWith('W/') ? etag : response.headers['last-modified']
        state.downloadedSize = offset
        const startTime = Date.now()
        let receivedBytes = 0
        let lastProgressAt = 0
        const reportProgress = () => {
            const now = Date.now()
            if (onProgress && now - lastProgressAt >= 100 && !signal.aborted) {
                lastProgressAt = now
                onProgress({
                    downloadProgress: state.totalSize > 0
                        ? Math.min(99, Math.floor(state.downloadedSize / state.totalSize * 100)) : 0,
                    downloadSpeed: (receivedBytes / Math.max((now - startTime) / 1000, 0.1) / 1024 / 1024).toFixed(2)
                })
            }
        }
        reportProgress()
        signal.throwIfAborted()
        const counter = new Transform({
            transform(chunk, encoding, callback) {
                receivedBytes += chunk.length
                state.downloadedSize = offset + receivedBytes
                reportProgress()
                callback(null, chunk)
            }
        })
        state.writing = true
        await pipeline(response, counter, fs.createWriteStream(state.desc, {
            flags: offset > 0 ? 'a' : 'w'
        }), { signal })

        const actualSize = fs.statSync(state.desc).size
        if ((expectedBytes !== null && receivedBytes !== expectedBytes) ||
            (state.totalSize !== null && actualSize !== state.totalSize)) {
            throw new Error('下载文件长度不完整')
        }
        state.downloadedSize = actualSize
    } finally {
        response.destroy()
    }
}

/** 开始或恢复下载，同一文件的旧任务关闭后才允许恢复写入。 */
const downloadFile = (fileId, fileName, remoteUrl) => {
    const previous = activeDownloads.get(fileId)
    if (previous && !previous.paused) return previous.promise

    const state = { controller: new AbortController(), paused: false, writing: false }
    activeDownloads.set(fileId, state)
    state.promise = (async () => {
        try {
            await previous?.promise
            state.desc = previous?.desc
            state.controller.signal.throwIfAborted()
            state.desc = state.desc || await generatePath(fileName)
            state.controller.signal.throwIfAborted()
            // 以已关闭文件的实际长度为准，不能使用尚未落盘的接收字节数。
            state.downloadedSize = previous && fs.existsSync(state.desc) ? fs.statSync(state.desc).size : 0
            state.validator = previous?.validator
            state.remoteUrl = remoteUrl
            await transferFile(state, (progress) => {
                if (!state.paused && activeDownloads.get(fileId) === state) {
                    notifyDownload('download-progress', { fileId, ...progress })
                }
            })
            state.controller.signal.throwIfAborted()
            notifyDownload('download-loadStatus', { fileId, status: 1 })
            return state.desc
        } catch (err) {
            if (state.paused) return null
            if (state.writing && state.desc && fs.existsSync(state.desc)) {
                try { fs.unlinkSync(state.desc) } catch { /* ignore */ }
            }
            notifyDownload('download-loadStatus', { fileId, status: 2 })
            throw err
        } finally {
            if (!state.paused && activeDownloads.get(fileId) === state) {
                activeDownloads.delete(fileId)
            }
        }
    })()
    return state.promise
}

/** 暂停立即阻止进度上报并中止网络/文件流，保留部分文件。 */
const pauseDownload = (fileId) => {
    const state = activeDownloads.get(fileId)
    if (!state || state.paused) return
    state.paused = true
    state.controller.abort()
    notifyDownload('download-paused', { fileId })
}

/** 另存为也使用相同的状态码、重定向和完整性校验。 */
const saveAsMedia = async (remoteUrl, filePath) => {
    const state = { remoteUrl, desc: filePath, downloadedSize: 0, controller: new AbortController() }
    try {
        await transferFile(state)
        return filePath
    } catch (err) {
        if (state.writing && fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath) } catch { /* ignore */ }
        }
        throw err
    }
}

export { downloadFile, pauseDownload, saveAsMedia }
