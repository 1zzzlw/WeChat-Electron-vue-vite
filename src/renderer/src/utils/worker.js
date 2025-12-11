import { computedChunksMD5 } from './computedChunksMD5.js'

// 接收主线程发送的消息
onmessage = async (e) => {
  const { file, start, end, CHUNK_SIZE, uploadedChunkIndexList } = e.data

  const result = []

  // 开始遍历每个线程内部的块
  for (let i = start; i < end; i++) {
    // 如果当前分片索引在已上传分片索引列表中，跳过计算
    if (uploadedChunkIndexList.includes(i)) {
      result.push({
        chunkIndex: i,
        isUploaded: true
      })

      continue
    }
    result.push(computedChunksMD5(file, i, CHUNK_SIZE))
  }

  // 阻塞等待所有的md5计算完成
  const chunks = await Promise.all(result)

  postMessage(chunks)
}
