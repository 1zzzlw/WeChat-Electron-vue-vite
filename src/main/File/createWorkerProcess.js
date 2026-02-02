import { THREAD_NUMBER, pool } from "./poolConfig"
import fs from 'fs'

const CHUNK_SIZE = 1024 * 1024 * 5

// 根据文件id创建一个管理分块状态的集合
const fileChunkStatusMap = new Map()

const createWorkerProcess = (localPath, fileSize, fileId, chunksList, callback, onComplete) => {
    // 计算分块数量
    const chunkCount = Math.ceil(fileSize / CHUNK_SIZE)
    // 计算每个线程处理的分块数量
    const threadChunkCount = Math.ceil(chunkCount / THREAD_NUMBER)

    let isMerging = false
    let fileIndex = 0
    let isReadComplete = false

    console.log(`该文件需要分${chunkCount}块，每个线程需要处理${threadChunkCount}块`)

    fileChunkStatusMap.set(fileId, {
        // 设置固定的长度和默认值，固定长度为块的数量，默认值为0表示未上传
        chunkStatusArray: Array.from({ length: chunkCount }, (_, index) => {
            // 如果上传成功的数组长度为0就默认全为0，否则只有包含index的索引处为1，不包含的为0，表示上传过和未上传过
            return chunksList.length === 0 ? 0 : chunksList.includes(index) ? 1 : 0
            // if (chunksList.length === 0) {
            //     return 0
            // } else {
            //     return chunksList.includes(index) ? 1 : 0
            // }
        }),
    })

    // 获得当前上传文件的分块上传情况
    const chunkStatus = fileChunkStatusMap.get(fileId)

    // 创建流式读取器
    const readStream = fs.createReadStream(localPath, {
        // 不指定encoding，或显式设为null，返回Buffer
        encoding: null,
        // 每块大小
        highWaterMark: CHUNK_SIZE
    })

    // 这里需要注意线程安全的问题，提前进行累加，不能在线程执行后累加，会造成多线程的并发问题
    readStream.on('data', async (chunk) => {
        const currentFileIndex = fileIndex;
        fileIndex++
        if (chunkStatus.chunkStatusArray[currentFileIndex] === 1) {
            // 该分块文件已经上传，应该跳过
            console.log('上传过了')
            return
        }
        // 分块读取数据
        const arrayBuffer = chunk.buffer
        // 将分块文件推入线程中进行计算
        const task = await pool.run({ arrayBuffer, currentFileIndex, fileId })
        callback({
            task, updateStatus: (chunkIndex) => {
                chunkStatus.chunkStatusArray[chunkIndex] = 1
                checkAndMerge()
            }
        })
    })

    readStream.on('end', async () => {
        // 读取结束
        // const results = await Promise.all(tasks)
        // resolve(results)
        console.log('文件读取完成，可以开始合并')
        isReadComplete = true
        checkAndMerge()
    })

    // 读取出错
    readStream.on('error', (err) => {
        console.log(err)
    });

    const checkAndMerge = () => {
        if (isMerging) return

        if (isReadComplete && !chunkStatus.chunkStatusArray.includes(0)) {
            // 通知外层可以合并了
            isMerging = true
            onComplete(fileIndex)
        }
    }
}

export {
    CHUNK_SIZE,
    createWorkerProcess,
}