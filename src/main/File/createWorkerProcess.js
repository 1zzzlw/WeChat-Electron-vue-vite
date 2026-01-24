import { THREAD_NUMBER, pool } from "./poolConfig"
import fs from 'fs'

const CHUNK_SIZE = 1024 * 1024 * 5

const createWorkerProcess = (filePath, fileSize, fileId, chunksList) => {
    return new Promise(async (resolve, reject) => {
        // 计算分块大小
        const chunkCount = Math.ceil(fileSize / CHUNK_SIZE)
        // 计算每个线程处理的分块数量
        const threadChunkCount = Math.ceil(chunkCount / THREAD_NUMBER)

        const tasks = []

        let fileIndex = 0

        console.log(`该文件需要分${chunkCount}块，每个线程需要处理${threadChunkCount}块`)

        // 创建流式读取器
        const readStream = fs.createReadStream(filePath, {
            // 不指定encoding，或显式设为null，返回Buffer
            encoding: null,
            // 每块大小
            highWaterMark: CHUNK_SIZE
        })

        readStream.on('data', (chunk) => {
            if (chunksList.includes(fileIndex)) {

            }
            // 分块读取数据
            const arrayBuffer = chunk.buffer
            // 将分块文件推入线程中进行计算
            tasks.push(pool.run({ arrayBuffer, fileIndex, fileId }))
            fileIndex++
        })

        readStream.on('end', async () => {
            const results = await Promise.all(tasks)
            resolve(results)
        })

        // 读取出错
        readStream.on('error', (err) => {
            reject(err);
        });
    })
}

export {
    createWorkerProcess
}