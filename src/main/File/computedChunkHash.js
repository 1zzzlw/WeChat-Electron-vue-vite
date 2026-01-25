const crypto = require('crypto');

const computedFileChunkHash = (data) => {
    const { fileId, currentFileIndex, arrayBuffer, chunkCount } = data

    const buffer = Buffer.from(arrayBuffer);

    const chunkHash = crypto.createHash('md5').update(buffer).digest('hex')

    const blob = new Blob([buffer])

    return {
        fileId,
        currentFileIndex,
        chunkHash,
        blob,
        chunkCount
    }

}

module.exports = {
    computedFileChunkHash
}