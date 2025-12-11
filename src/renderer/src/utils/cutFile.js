// 设置每个块的大小为5MB
const CHUNK_SIZE = 1024 * 1024 * 5
// 获取电脑的CPU核心数
const THREAD_COUNT = navigator.hardwareConcurrency || 4

export function cutFile(file, uploadedChunkIndexList) {
  return new Promise((resolve, reject) => {
    console.info('cutFile', file)

    // 计算当前文件需要分多少个块
    const chunkCount = Math.ceil(file.size / CHUNK_SIZE)

    // 计算一个线程需要分配多少块
    const threadChunkCount = Math.ceil(chunkCount / THREAD_COUNT)

    const result = []

    const threadQueue = []

    console.info('当前电脑CPU核心数为：', THREAD_COUNT)
    console.info('该文件需要分块个数为：', chunkCount)
    console.info('每个线程需要处理的块数', threadChunkCount)

    // 遍历每个线程
    for (let i = 0; i < THREAD_COUNT; i++) {
      const start = i * threadChunkCount

      let end = (i + 1) * threadChunkCount

      // 这里的end就相当于遍历到的块数，如果超出了chunkCount，需要单独赋值
      if (end > chunkCount) {
        end = chunkCount
      }

      if (start >= end) {
        continue
      }

      // 每个线程创建一个worker
      const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })

      // console.info('线程', i, '需要处理的块数为：', start, end)

      worker.onerror = (error) => {
        // 完整错误信息：错误原因、文件、行号、列号
        const errorMsg = `Worker错误：${error.message}，文件：${error.filename}，行号：${error.lineno}，列号：${error.colno}`
        console.error(errorMsg)
        reject(new Error(errorMsg))
        worker.terminate()
      }

      // 像worker线程发送消息
      worker.postMessage({
        file,
        start,
        end,
        CHUNK_SIZE,
        uploadedChunkIndexList
      })

      threadQueue.push(worker)

      // 接收worker线程发送的消息
      worker.onmessage = (e) => {
        const chunks = e.data

        chunks.forEach((chunk) => {
          console.info('每个线程内部块的信息', chunk)
          result[chunk.chunkIndex] = chunk
        })

        // 销毁worker线程
        worker.terminate()

        // 每个线程处理完成后，从队列中移除
        threadQueue.shift()

        // 所有线程处理完成后，返回结果
        if (threadQueue.length === 0) {
          resolve(result)
        }
      }
    }
  })
}
