const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const https = require('node:https')
const os = require('node:os')
const path = require('node:path')
const vm = require('node:vm')
const { Transform } = require('node:stream')
const { pipeline } = require('node:stream/promises')
const { createHash } = require('node:crypto')

const payload = Buffer.from(Array.from({ length: 512 * 1024 }, (_, i) => i % 251))
const hash = data => createHash('sha256').update(data).digest('hex')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const waitFor = async predicate => {
    const deadline = Date.now() + 3000
    while (!predicate()) {
        if (Date.now() > deadline) throw new Error('等待测试条件超时')
        await delay(5)
    }
}

const source = fs.readFileSync(path.join(__dirname, '../src/main/File/downloadFile.js'), 'utf8')
    .replace(/^import[^\n]*\n/gm, '')
    .replace(/export\s*\{[\s\S]*?\}\s*$/, '')

// 除 Electron 通知和保存路径外，执行真实源码、HTTP 请求、文件流与取消逻辑。
async function withServer(handler, check) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'im-download-test-'))
    const events = []
    const requests = []
    const tasks = []
    const ids = new Set()
    let onEvent
    let pathCalls = 0
    const server = http.createServer((req, res) => {
        requests.push({ url: req.url, range: req.headers.range, ifRange: req.headers['if-range'] })
        handler(req, res)
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const raw = vm.runInNewContext(source + '\n({ downloadFile, pauseDownload, saveAsMedia });', {
        fs, http, https, Transform, pipeline, AbortController, URL, console,
        generatePath: async name => { pathCalls++; return path.join(dir, name) },
        refs: { mainWindow: {
            isDestroyed: () => false,
            webContents: { send(channel, data) {
                events.push({ channel, ...data })
                onEvent?.(channel, data)
            } }
        } }
    })
    const api = {
        ...raw,
        downloadFile(...args) {
            ids.add(args[0])
            const task = raw.downloadFile(...args)
            tasks.push(task)
            return task
        }
    }
    try {
        await check({
            api, events, requests, dir,
            url: 'http://127.0.0.1:' + server.address().port,
            setOnEvent: callback => { onEvent = callback },
            pathCalls: () => pathCalls
        })
    } finally {
        onEvent = undefined
        for (const id of ids) raw.pauseDownload(id)
        server.closeAllConnections()
        await new Promise(resolve => server.close(resolve))
        await Promise.allSettled(tasks)
        assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir(), 'im-download-test-')))
        fs.rmSync(dir, { recursive: true, force: true })
    }
}

function serveFile(req, res, { ignoreRange = false, badRange = false, data = payload, etag = '"v1"', slow = false } = {}) {
    const requested = req.headers.range
    const start = requested && !ignoreRange ? Number(/^bytes=(\d+)-$/.exec(requested)[1]) : 0
    const partial = !!requested && !ignoreRange
    const headers = { 'Content-Length': data.length - start, ETag: etag }
    if (partial) headers['Content-Range'] = 'bytes ' + (badRange ? start + 1 : start) + '-' + (data.length - 1) + '/' + data.length
    res.writeHead(partial ? 206 : 200, headers)
    if (!slow) { res.end(data.subarray(start)); return }
    let cursor = start
    const timer = setInterval(() => {
        const end = Math.min(cursor + 16384, data.length)
        res.write(data.subarray(cursor, end))
        cursor = end
        if (cursor === data.length) { clearInterval(timer); res.end() }
    }, 12)
    res.on('close', () => clearInterval(timer))
}

async function pauseAfterProgress(context, fileUrl) {
    const { api, setOnEvent, dir } = context
    let paused = false
    setOnEvent((channel, data) => {
        if (!paused && channel === 'download-progress' && data.downloadProgress > 0) {
            paused = true
            api.pauseDownload('f')
        }
    })
    const result = await api.downloadFile('f', 'file.bin', fileUrl)
    assert.equal(result, null)
    assert.equal(paused, true)
    setOnEvent(undefined)
    const size = fs.statSync(path.join(dir, 'file.bin')).size
    assert.ok(size > 0 && size < payload.length)
    return size
}

const cases = [
    ['正常下载的长度、哈希和成功通知正确', () => withServer(
        (req, res) => serveFile(req, res),
        async ({ api, url, dir, events }) => {
            await api.downloadFile('f', 'file.bin', url + '/file')
            assert.equal(hash(fs.readFileSync(path.join(dir, 'file.bin'))), hash(payload))
            assert.equal(events.filter(e => e.channel === 'download-loadStatus' && e.status === 1).length, 1)
        }
    )],
    ...[404, 500, 416].flatMap(status => [false, true].map(redirect => [
        'HTTP ' + status + (redirect ? '（重定向后）' : '') + ' 不写错误文件或通知成功',
        () => withServer((req, res) => {
            if (redirect && req.url === '/redirect') {
                res.writeHead(302, { Location: '/error' }); res.end(); return
            }
            res.writeHead(status); res.end('error response')
        }, async ({ api, url, dir, events }) => {
            await assert.rejects(api.downloadFile('f', 'file.bin', url + (redirect ? '/redirect' : '/error')), /HTTP/)
            assert.equal(fs.existsSync(path.join(dir, 'file.bin')), false)
            assert.equal(events.filter(e => e.channel === 'download-loadStatus' && e.status === 1).length, 0)
            assert.equal(events.filter(e => e.channel === 'download-loadStatus' && e.status === 2).length, 1)
        })
    ])),
    ['暂停后不再上报进度，206 从已落盘的实际偏移恢复且哈希一致', () => withServer(
        (req, res) => serveFile(req, res, { slow: true }),
        async context => {
            const size = await pauseAfterProgress(context, context.url + '/file')
            const count = context.events.filter(e => e.channel === 'download-progress').length
            await delay(60)
            assert.equal(context.events.filter(e => e.channel === 'download-progress').length, count)
            assert.equal(fs.statSync(path.join(context.dir, 'file.bin')).size, size)
            await context.api.downloadFile('f', 'file.bin', context.url + '/file')
            assert.equal(context.requests[1].range, 'bytes=' + size + '-')
            assert.equal(context.requests[1].ifRange, '"v1"')
            assert.equal(hash(fs.readFileSync(path.join(context.dir, 'file.bin'))), hash(payload))
            assert.equal(context.pathCalls(), 1)
        }
    )],
    ['服务端忽略 Range 返回200时覆盖重下，不追加完整文件', () => withServer(
        (req, res) => serveFile(req, res, { slow: true, ignoreRange: true }),
        async context => {
            await pauseAfterProgress(context, context.url + '/file')
            await context.api.downloadFile('f', 'file.bin', context.url + '/file')
            const data = fs.readFileSync(path.join(context.dir, 'file.bin'))
            assert.equal(data.length, payload.length)
            assert.equal(hash(data), hash(payload))
        }
    )],
    ['206 返回错误起点时拒绝写入，保留原部分文件', () => withServer(
        (req, res) => serveFile(req, res, { slow: true, badRange: true }),
        async context => {
            const size = await pauseAfterProgress(context, context.url + '/file')
            await assert.rejects(context.api.downloadFile('f', 'file.bin', context.url + '/file'), /续传范围/)
            assert.equal(fs.statSync(path.join(context.dir, 'file.bin')).size, size)
            assert.equal(context.events.filter(e => e.channel === 'download-loadStatus' && e.status === 1).length, 0)
        }
    )],
    ...[
        { name: '缺少 Content-Range', range: undefined, body: 'ABC' },
        { name: '未知总长度', range: 'bytes 0-2/*', body: 'ABC' },
        { name: '长度与范围冲突', range: 'bytes 0-1/2', body: 'ABC' },
        { name: '未覆盖完整文件', range: 'bytes 0-2/6', body: 'ABC' }
    ].map(({ name, range, body }) => ['206 ' + name + ' 不通知成功', () => withServer(
        (req, res) => {
            res.writeHead(206, { 'Content-Length': body.length, ...(range ? { 'Content-Range': range } : {}) })
            res.end(body)
        },
        async ({ api, url, events }) => {
            await assert.rejects(api.downloadFile('f', 'file.bin', url + '/file'))
            assert.equal(events.filter(e => e.channel === 'download-loadStatus' && e.status === 1).length, 0)
        }
    )]),
    ['资源发生变化时根据 If-Range 覆盖重下，避免拼接不同版本', () => {
        let changed = false
        const newPayload = Buffer.alloc(payload.length, 88)
        return withServer((req, res) => serveFile(req, res, {
            slow: true, ignoreRange: changed,
            data: changed ? newPayload : payload, etag: changed ? '"v2"' : '"v1"'
        }), async context => {
            await pauseAfterProgress(context, context.url + '/file')
            changed = true
            await context.api.downloadFile('f', 'file.bin', context.url + '/file')
            assert.equal(context.requests[1].ifRange, '"v1"')
            assert.equal(hash(fs.readFileSync(path.join(context.dir, 'file.bin'))), hash(newPayload))
        })
    }],
    ['相对重定向后的206也能正确续传', () => withServer(
        (req, res) => {
            if (req.url === '/redirect') { res.writeHead(302, { Location: '/file' }); res.end(); return }
            serveFile(req, res, { slow: true })
        },
        async context => {
            const size = await pauseAfterProgress(context, context.url + '/redirect')
            await context.api.downloadFile('f', 'file.bin', context.url + '/redirect')
            assert.equal(context.requests[3].range, 'bytes=' + size + '-')
            assert.equal(hash(fs.readFileSync(path.join(context.dir, 'file.bin'))), hash(payload))
        }
    )],
    ['无 Content-Length 的完整200响应正常下载', () => withServer(
        (req, res) => { res.writeHead(200); res.write(payload.subarray(0, 100)); res.end(payload.subarray(100)) },
        async ({ api, url, dir }) => {
            await api.downloadFile('f', 'file.bin', url + '/file')
            assert.equal(hash(fs.readFileSync(path.join(dir, 'file.bin'))), hash(payload))
        }
    )],
    ['快速连续暂停和恢复，旧任务不会继续写入或误报失败', () => withServer(
        (req, res) => serveFile(req, res, { slow: true }),
        async context => {
            await pauseAfterProgress(context, context.url + '/file')
            const second = context.api.downloadFile('f', 'file.bin', context.url + '/file')
            context.api.pauseDownload('f')
            const third = context.api.downloadFile('f', 'file.bin', context.url + '/file')
            context.api.pauseDownload('f')
            const last = context.api.downloadFile('f', 'file.bin', context.url + '/file')
            assert.equal(await second, null)
            assert.equal(await third, null)
            await last
            assert.equal(hash(fs.readFileSync(path.join(context.dir, 'file.bin'))), hash(payload))
            assert.equal(context.events.filter(e => e.channel === 'download-loadStatus' && e.status === 2).length, 0)
        }
    )],
    ['响应头尚未到达也可以暂停，恢复正常下载', () => withServer(
        (req, res) => {
            const timer = setTimeout(() => serveFile(req, res), 80)
            res.on('close', () => clearTimeout(timer))
        },
        async context => {
            const first = context.api.downloadFile('f', 'file.bin', context.url + '/file')
            await waitFor(() => context.requests.length === 1)
            context.api.pauseDownload('f')
            assert.equal(await first, null)
            await context.api.downloadFile('f', 'file.bin', context.url + '/file')
            assert.equal(hash(fs.readFileSync(path.join(context.dir, 'file.bin'))), hash(payload))
        }
    )],
    ['部分文件丢失后恢复时从零开始，不使用旧偏移', () => withServer(
        (req, res) => serveFile(req, res, { slow: true }),
        async context => {
            await pauseAfterProgress(context, context.url + '/file')
            fs.unlinkSync(path.join(context.dir, 'file.bin'))
            await context.api.downloadFile('f', 'file.bin', context.url + '/file')
            assert.equal(context.requests[1].range, undefined)
            assert.equal(hash(fs.readFileSync(path.join(context.dir, 'file.bin'))), hash(payload))
        }
    )],
    ['同一文件重复开始不会创建并发写入任务', () => withServer(
        (req, res) => serveFile(req, res, { slow: true }),
        async ({ api, url, requests }) => {
            const first = api.downloadFile('f', 'file.bin', url + '/file')
            const second = api.downloadFile('f', 'file.bin', url + '/file')
            assert.equal(first, second)
            await first
            assert.equal(requests.length, 1)
        }
    )],
    ['响应中途断开时失败并清理不完整文件', () => withServer(
        (req, res) => {
            res.writeHead(200, { 'Content-Length': payload.length })
            res.write(payload.subarray(0, 1000))
            setTimeout(() => res.destroy(), 10)
        },
        async ({ api, url, dir, events }) => {
            await assert.rejects(api.downloadFile('f', 'file.bin', url + '/file'))
            assert.equal(fs.existsSync(path.join(dir, 'file.bin')), false)
            assert.equal(events.filter(e => e.channel === 'download-loadStatus' && e.status === 1).length, 0)
        }
    )],
    ['另存为支持相对重定向，404 不覆盖已有文件', () => withServer(
        (req, res) => {
            if (req.url === '/redirect') { res.writeHead(302, { Location: '/file' }); res.end(); return }
            if (req.url === '/error') { res.writeHead(404); res.end('Not Found'); return }
            serveFile(req, res)
        },
        async ({ api, url, dir }) => {
            const target = path.join(dir, 'saved.bin')
            await api.saveAsMedia(url + '/redirect', target)
            assert.equal(hash(fs.readFileSync(target)), hash(payload))
            await assert.rejects(api.saveAsMedia(url + '/error', target), /HTTP 404/)
            assert.equal(hash(fs.readFileSync(target)), hash(payload))
        }
    )]
]

async function run() {
    const results = []
    for (const [name, execute] of cases) {
        try {
            await execute()
            results.push({ name, status: 'PASS' })
        } catch (error) {
            results.push({ name, status: 'FAIL', error: error.stack })
        }
    }
    console.log(JSON.stringify(results, null, 2))
    assert.equal(results.filter(r => r.status === 'FAIL').length, 0, '下载回归测试失败')
    return results
}

module.exports = { run }
if (require.main === module) {
    run().catch(error => { console.error(error); process.exitCode = 1 })
}
