import { computedFileChunkHash } from './computedChunkHash.js'

// Piscina 要求导出一个函数，接收任务数据，返回结果
export default ({ arrayBuffer, fileIndex, fileId }) => {

    const chunkData = computedFileChunkHash({
        fileId,
        fileIndex,
        arrayBuffer
    })

    return chunkData
}
