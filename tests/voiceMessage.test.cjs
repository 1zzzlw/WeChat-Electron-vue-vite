const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const vm = require('node:vm')

async function voiceWriter() {
    const source = await fs.readFile(path.join(__dirname, '../src/main/File/voiceRecording.js'), 'utf8')
    return (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).saveVoiceRecording
}

test('recorded WebM is saved byte-for-byte as audio and uses a generated path', async t => {
    const save = await voiceWriter()
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'im-voice-'))
    t.after(() => fs.rm(directory, { recursive: true, force: true }))
    const bytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3])
    const file = await save({ data: bytes.buffer, mimeType: 'audio/webm;codecs=opus', duration: 8.3 }, directory)
    assert.equal(file.fileType, 4)
    assert.equal(file.content, '[语音] 8.3秒')
    assert.match(file.fileName, /^voice_\d+_[a-f0-9-]+\.webm$/)
    assert.equal(path.dirname(file.localPath), directory)
    assert.deepEqual(await fs.readFile(file.localPath), Buffer.from(bytes))
    assert.equal(file.fileId.length, 32)
})

test('empty, oversize, unsupported and invalid-duration recordings never create files', async t => {
    const save = await voiceWriter()
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'im-voice-invalid-'))
    t.after(() => fs.rm(directory, { recursive: true, force: true }))
    const recording = { data: new Uint8Array([1]).buffer, mimeType: 'audio/webm', duration: 2 }
    for (const change of [
        { data: new ArrayBuffer(0) }, { data: new ArrayBuffer(8 * 1024 * 1024 + 1) },
        { mimeType: 'video/webm' }, { data: 'not binary' },
        ...[NaN, Infinity, -1, .5, 100].map(duration => ({ duration }))
    ]) await assert.rejects(save({ ...recording, ...change }, directory))
    assert.deepEqual(await fs.readdir(directory), [])
})

async function transferHarness() {
    const source = (await fs.readFile(path.join(__dirname, '../src/renderer/src/handlers/fileTransferHandlers.js'), 'utf8'))
        .replace(/^import[^\n]*\n/gm, '').replace(/export function/g, 'function')
    const messages = new Map()
    const uploads = new Map()
    const callbacks = {}
    const sent = []
    const store = {
        getFileMessage: id => messages.get(id), removeFileMessage: id => messages.delete(id),
        sendFileMessage: (message, conversationId, receivers) => sent.push({ ...message, conversationId, receivers })
    }
    const state = {
        getFileUploadUpdateInfo: id => uploads.get(id),
        updateFileUploadStatus: (id, status) => { uploads.get(id).uploadStatus = status }
    }
    const { registerFileTransferHandlers, sendUploadedFileIfReady } = vm.runInNewContext(source + '\n({ registerFileTransferHandlers, sendUploadedFileIfReady })', {
        toRaw: value => value, messageInfo: () => store, fileStatusListInfo: () => state,
        statusMap: { upload_finish: { value: 'upload_finish' }, fail: { value: 'fail' } },
        updateMessageFileSendStatusApi() {}, updateMessage() {}, console: { log() {} },
        window: { uploadFileApi: {
            updateUploadStatus: callback => { callbacks.finish = callback }, updateUploadProgress() {},
            updateDownloadStatus() {}, updateDownloadProgress() {}
        } }
    })
    registerFileTransferHandlers()
    const message = { id: '7520640156303511552', fileId: 'voice', msgType: 4, conversationId: 'g_test', receiverIds: ['200'], remoteUrl: '' }
    messages.set('voice', message)
    uploads.set('voice', { uploadStatus: 'uploading' })
    return { message, sent, messages, ready: () => sendUploadedFileIfReady('voice'),
        finish: status => callbacks.finish({}, { fileId: 'voice', status }) }
}

test('upload finishing before REST waits for the saved URL and only sends once', async () => {
    const h = await transferHarness()
    await h.finish(1)
    assert.equal(h.sent.length, 0)
    h.message.remoteUrl = 'http://fixture.invalid/audio.webm'
    h.ready()
    h.ready()
    await h.finish(1)
    assert.equal(h.sent.length, 1)
    assert.equal(h.sent[0].id, h.message.id)
    assert.equal(h.sent[0].msgType, 4)
    assert.deepEqual(h.sent[0].receivers, ['200'])
    assert.equal(h.messages.size, 0)
})

test('REST finishing first also waits for upload, and failed upload never sends', async () => {
    const h = await transferHarness()
    h.message.remoteUrl = 'http://fixture.invalid/audio.webm'
    h.ready()
    assert.equal(h.sent.length, 0)
    await h.finish(2)
    h.ready()
    assert.equal(h.sent.length, 0)
    assert.equal(h.message.sendStatus, 2)
    await h.finish(1)
    assert.equal(h.sent.length, 1)
})

test('file upload IPC routes progress to the originating chat window', async () => {
    const source = (await fs.readFile(path.join(__dirname, '../src/main/IPC/uploadFileIPC.js'), 'utf8'))
        .replace(/^import[^\n]*\n/gm, '')
    const handlers = new Map()
    const events = new Map()
    const calls = []
    vm.runInNewContext(source, {
        ipcMain: { handle: (name, fn) => handlers.set(name, fn), on: (name, fn) => events.set(name, fn) },
        uploadFile: async (...args) => { calls.push(args); return { chunkCount: 1 } }, console: { log() {} }
    })
    const sender = { id: 42 }
    const file = { fileId: 'voice', fileType: 4 }
    await handlers.get('upload-file')({ sender }, file)
    events.get('update-pauseStatus')({ sender }, file, false)
    assert.equal(calls.length, 2)
    assert.equal(calls[0][1], sender)
    assert.equal(calls[1][1], sender)
})

test('a failed audio chunk reports failure to its source and stops the file worker', async () => {
    const source = (await fs.readFile(path.join(__dirname, '../src/main/File/fileUpload.js'), 'utf8'))
        .replace(/^import[^\n]*\n/gm, '').replace(/export\s*\{[\s\S]*?\}\s*$/, '')
    const events = []
    let stopped = false
    let notified
    const notification = new Promise(resolve => { notified = resolve })
    class Queue {
        size = 0
        running = 0
        enqueue(task) { return task() }
    }
    const { uploadFile } = vm.runInNewContext(source + '\n({ uploadFile })', {
        refs: {}, MessageQueue: Queue, CHUNK_SIZE: 5 * 1024 * 1024,
        createWorkerProcess: (_path, _size, fileId, _uploaded, onChunk) => {
            setImmediate(() => onChunk({ task: { fileId, currentFileIndex: 0, chunkHash: 'hash', blob: new Blob(['audio']) } }))
            return { stop: () => { stopped = true } }
        },
        verifyFileUpload: async () => ({ data: { verify: 'ticket', minioFilePath: 'voice/test' } }),
        checkUploaded: async () => ({ data: [] }),
        uploadFileChunk: async () => { throw new Error('offline') },
        AbortController, FormData, Blob, console: { log() {}, error() {} }
    })
    await uploadFile({ fileId: 'voice', fileName: 'voice.webm', fileSize: 5, fileType: 4, localPath: '/fixture/voice.webm' }, {
        isDestroyed: () => false,
        send: (channel, value) => { events.push({ channel, ...value }); notified() }
    })
    await notification
    assert.equal(events.length, 1)
    assert.equal(events[0].channel, 'upload-loadStatus')
    assert.equal(events[0].status, 2)
    assert.equal(stopped, true)
})
