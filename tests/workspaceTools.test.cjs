const assert = require('node:assert/strict')
const fs = require('node:fs')
const fsPromises = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const vm = require('node:vm')
const { EventEmitter } = require('node:events')

const source = fs.readFileSync(path.join(__dirname, '../src/main/File/fileInfo.js'), 'utf8')
    .replace(/^import[^\n]*\n/gm, '')
    .replace(/export\s*\{[\s\S]*?\}\s*$/, '')

async function run() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'im-workspace-test-'))
    const results = []
    let activeReads = 0
    let peakReads = 0
    const records = new Map()
    const trackedFs = {
        ...fsPromises,
        async readFile(...args) {
            activeReads++
            peakReads = Math.max(peakReads, activeReads)
            try {
                await new Promise(resolve => setTimeout(resolve, 5))
                return await fsPromises.readFile(...args)
            } finally {
                activeReads--
            }
        }
    }
    const api = vm.runInNewContext(source + '\n({ registerWorkspace, executeWorkspaceTool, formatCommandOutput });', {
        fs: trackedFs, path, console, setTimeout, clearTimeout,
        shell: {},
        process: { platform: 'win32' },
        saveWorkspace: record => { records.set(record.name, record); return 1 },
        getWorkspaceByName: name => records.get(name),
        queryWorkspaceList: () => [...records.values()],
        // 这里只隔离子进程，验证真实 close 回调能处理非零退出及非空输出。
        spawn: () => {
            const child = new EventEmitter()
            child.stdout = new EventEmitter()
            child.stderr = new EventEmitter()
            child.kill = () => {}
            queueMicrotask(() => {
                child.stdout.emit('data', Buffer.from('command output\n'))
                child.stderr.emit('data', Buffer.from('command error\n'))
                child.emit('close', 1)
            })
            return child
        }
    })
    const search = options => api.executeWorkspaceTool({
        workspaceName: 'fixture', operation: 'search', pattern: 'needle', ...options
    })
    const matchLines = result => result.content.split('\n').filter(line => /^[^:]+:\d+: /.test(line))
    const check = async (name, execute) => {
        try {
            await execute()
            results.push({ name, status: 'PASS' })
        } catch (error) {
            results.push({ name, status: 'FAIL', error: error.message })
        }
    }
    try {
        await fsPromises.writeFile(path.join(dir, 'many.txt'), Array.from({ length: 350 }, (_, i) => 'needle ' + i).join('\n'))
        for (let i = 0; i < 12; i++) {
            await fsPromises.writeFile(path.join(dir, 'source-' + i + '.js'), 'const needle = ' + i)
        }
        await fsPromises.mkdir(path.join(dir, 'empty'))
        await api.registerWorkspace('fixture', dir)

        await check('默认搜索返回100条并提示截断', async () => {
            const result = await search({})
            assert.equal(result.success, true)
            assert.equal(matchLines(result).length, 100)
            assert.match(result.content, /已截断到 100 条/)
        })
        await check('调用方指定更小的搜索数量时遵守限制', async () => {
            const result = await search({ maxResults: 2 })
            assert.equal(matchLines(result).length, 2)
        })
        await check('超过上限的搜索请求最多返回200条', async () => {
            const result = await search({ maxResults: 9999 })
            assert.equal(matchLines(result).length, 200)
            assert.match(result.content, /已截断到 200 条/)
        })
        await check('实际读取并发不超过4且能完成多个文件搜索', async () => {
            peakReads = 0
            const result = await search({ glob: '.js', maxResults: 200 })
            assert.equal(matchLines(result).length, 12)
            assert.ok(peakReads > 1 && peakReads <= 4, '实际并发数：' + peakReads)
        })
        await check('无匹配时正常返回提示', async () => {
            const result = await search({ pattern: 'not-present-in-fixture' })
            assert.match(result.content, /没有匹配/)
        })
        await check('空目录搜索正常结束', async () => {
            const result = await search({ path: 'empty' })
            assert.match(result.content, /没有匹配/)
        })
        await check('正则搜索正常返回匹配', async () => {
            const result = await search({ pattern: 'needle 34[0-9]$', useRegex: true })
            assert.equal(matchLines(result).length, 10)
        })
        await check('空命令输出正常返回提示', () => {
            assert.equal(api.formatCommandOutput('', ''), '（没有输出）')
        })
        await check('短输出保留stdout和stderr', () => {
            assert.equal(api.formatCommandOutput('output\n', 'error\n'), 'output\nerror')
        })
        await check('200行输出保持完整', () => {
            const text = Array.from({ length: 200 }, (_, i) => 'line ' + i).join('\n')
            assert.equal(api.formatCommandOutput(text, ''), text)
        })
        await check('长输出保留前100行和后100行并标明省略数量', () => {
            const text = Array.from({ length: 250 }, (_, i) => 'line ' + i).join('\n')
            const lines = api.formatCommandOutput(text, '').split('\n')
            assert.equal(lines.length, 201)
            assert.equal(lines[0], 'line 0')
            assert.equal(lines[99], 'line 99')
            assert.match(lines[100], /省略 50 行/)
            assert.equal(lines[101], 'line 150')
            assert.equal(lines[200], 'line 249')
        })
        await check('命令关闭回调可以返回非零退出码及非空输出', async () => {
            const result = await api.executeWorkspaceTool({
                workspaceName: 'fixture', operation: 'command', command: 'git', args: ['status']
            })
            assert.equal(result.success, true)
            assert.equal(result.content, '退出码 1\ncommand output\ncommand error')
        })
    } finally {
        assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir(), 'im-workspace-test-')))
        fs.rmSync(dir, { recursive: true, force: true })
    }
    const failures = results.filter(result => result.status === 'FAIL')
    if (failures.length) {
        const error = new Error('工作区工具回归失败：' + failures.length)
        error.results = results
        throw error
    }
    return results
}

module.exports = { run }
if (require.main === module) {
    run().then(results => console.log('工作区工具回归：' + results.length + '项通过'))
        .catch(error => { console.error(error.results || error); process.exitCode = 1 })
}
