import { createHash } from 'crypto';

const computedFileChunkHash = (data) => {
    const { fileId, fileIndex, arrayBuffer } = data

    const buffer = Buffer.from(arrayBuffer);

    const chunkHash = createHash('md5').update(buffer).digest('hex')

    const blob = new Blob([buffer])

    return {
        fileId,
        fileIndex,
        chunkHash,
        blob
    }

}

export {
    computedFileChunkHash
}