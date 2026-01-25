import { createHash } from 'crypto';

const computedFileChunkHash = (data) => {
    const { fileId, currentFileIndex, arrayBuffer, chunkCount } = data

    const buffer = Buffer.from(arrayBuffer);

    const chunkHash = createHash('md5').update(buffer).digest('hex')

    const blob = new Blob([buffer])

    return {
        fileId,
        currentFileIndex,
        chunkHash,
        blob,
        chunkCount
    }

}

export {
    computedFileChunkHash
}