import { computedFileChunkHash } from './computedChunkHash.js'

// Piscina 要求导出一个函数，接收任务数据，返回结果
export default ({ arrayBuffer, currentFileIndex, fileId, chunkCount }) => {
    const chunkData = computedFileChunkHash({
        fileId,
        currentFileIndex,
        arrayBuffer,
        chunkCount
    })

    return chunkData
}
