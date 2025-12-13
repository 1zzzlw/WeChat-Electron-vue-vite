import { computedChunksMD5 } from './computedChunksMD5.js'

// 接收主线程发送的消息
onmessage = async (e) => {
  const { file, start, end, CHUNK_SIZE, uploadedChunkIndexList } = e.data

  let doneNumber = 0

  // 开始遍历每个线程内部的块
  for (let i = start; i < end; i++) {
    // 如果当前分片索引在已上传分片索引列表中，跳过计算
    if (uploadedChunkIndexList.includes(i)) {
      // 已上传的分片
      doneNumber++

      postMessage({
        chunkIndex: i,
        isUploaded: true,
        isThreadDone: doneNumber === end - start
      })

      continue
    }

    const result = await computedChunksMD5(file, i, CHUNK_SIZE)

    doneNumber++

    if (doneNumber === end - start) {
      result.isThreadDone = true
    }

    postMessage(result)
  }
}
