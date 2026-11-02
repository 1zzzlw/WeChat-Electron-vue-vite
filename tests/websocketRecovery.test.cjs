const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const { babelParse } = require('vue/compiler-sfc')

test('WebSocket 弱网恢复', async t => {
    const root = path.join(__dirname, '..')
    const { transformWithEsbuild } = await import('vite')
    const compile = async file => (await transformWithEsbuild(
        fs.readFileSync(path.join(root, file), 'utf8'), file, { format: 'cjs' }
    )).code
    const protocolModule = { exports: {} }
    vm.runInNewContext(await compile('src/main/protocol.js'), {
        module: protocolModule, exports: protocolModule.exports, TextEncoder, TextDecoder
    })
    const protocol = protocolModule.exports
    const managerCode = await compile('src/main/websocket.js')
    const create = () => {
        let now = 0
        let taskId = 0
        let token = 'first-token'
        const tasks = new Map()
        const sockets = []
        const received = []
        const schedule = (fn, delay, repeat = false) => {
            const id = ++taskId
            tasks.set(id, { fn, at: now + delay, delay: repeat ? delay : 0 })
            return id
        }
        const tick = elapsed => {
            const end = now + elapsed
            while (true) {
                const next = [...tasks].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
                if (!next) break
                const [id, task] = next
                now = task.at
                if (task.delay) task.at += task.delay
                else tasks.delete(id)
                task.fn()
            }
            now = end
        }
        class Socket {
            static CONNECTING = 0
            static OPEN = 1
            static CLOSED = 3
            constructor(url) { this.url = url; this.readyState = 0; this.sent = []; sockets.push(this) }
            open() { this.readyState = 1; this.onopen() }
            close() { this.readyState = 3; this.onclose?.() }
            send(buffer) { this.sent.push(protocol.decodeMessage(buffer)) }
            snapshot(ids) { this.onmessage({ data: protocol.encodeMessage(10, 0, { friendIdList: ids }) }) }
            pong() { this.onmessage({ data: protocol.encodeMessage(0, 0, {}) }) }
        }
        const module = { exports: {} }
        const dependencies = {
            './shared.js': { store: { get: () => token }, refs: {} },
            'electron': { BrowserWindow: { getAllWindows: () => [{
                isDestroyed: () => false,
                webContents: { send: (...args) => received.push(args) }
            }] } },
            './protocol.js': protocol
        }
        vm.runInNewContext(managerCode, {
            module, exports: module.exports, WebSocket: Socket,
            Date: { now: () => now }, console: { log() {}, info() {}, warn() {} },
            setTimeout: (fn, delay) => schedule(fn, delay), clearTimeout: id => tasks.delete(id),
            setInterval: (fn, delay) => schedule(fn, delay, true), clearInterval: id => tasks.delete(id),
            require: name => dependencies[name] ?? {}
        })
        return { manager: module.exports.default, sockets, received, tick, setToken: value => { token = value } }
    }

    await t.test('连接后立即请求在线列表，延迟回包仍可正常广播', () => {
        const { manager, sockets, received, tick } = create()
        manager.requestPresence()
        manager.connect()
        sockets[0].open()
        assert.equal(sockets[0].sent[0].messageType, 0)
        assert.equal(sockets[0].sent[1].messageType, 19)
        tick(25000)
        sockets[0].snapshot(['200'])
        tick(35000)
        assert.equal(manager.ws.status, 1)
        assert.equal(received[0][1], 10)
        assert.equal(received[0][2].friendIdList[0], '200')
    })
    await t.test('连接假活时超时重连，重连后重新请求完整状态', () => {
        const { manager, sockets, tick } = create()
        manager.requestPresence()
        manager.connect()
        sockets[0].open()
        tick(90000)
        assert.equal(manager.ws.status, 3)
        assert.equal(sockets[0].readyState, 3)
        tick(2000)
        sockets[1].open()
        assert.equal(sockets[1].sent[0].messageType, 0)
        assert.equal(sockets[1].sent[1].messageType, 19)
    })
    await t.test('超过三次失败仍重试，并使用最新凭证', () => {
        const { manager, sockets, tick, setToken } = create()
        manager.connect()
        for (const delay of [2000, 4000, 8000, 15000, 30000]) {
            manager.onError()
            setToken('renewed-token')
            tick(delay)
        }
        assert.equal(sockets.length, 6)
        assert.ok(sockets.at(-1).url.endsWith('token=renewed-token'))
    })
    await t.test('旧连接迟到的回调不会关闭新连接，握手卡住也可重试', () => {
        const { manager, sockets, tick } = create()
        manager.connect()
        const staleClose = sockets[0].onclose
        tick(30000)
        tick(2000)
        sockets[1].open()
        staleClose()
        assert.equal(manager.ws.websocket, sockets[1])
        assert.equal(manager.ws.status, 1)
    })
    await t.test('页面先注册接收监听，再请求在线列表', () => {
        const source = fs.readFileSync(path.join(root, 'src/renderer/src/handlers/wsHandlers.js'), 'utf8')
        const declaration = babelParse(source, { sourceType: 'module' }).program.body
            .find(node => node.type === 'ExportNamedDeclaration' && node.declaration?.id?.name === 'registerWsHandlers')
            .declaration
        let listening = false
        let requests = 0
        vm.runInNewContext(source.slice(declaration.start, declaration.end) + '\nregisterWsHandlers();', {
            _wsHandlersRegistered: false,
            window: { dbApi: {}, wsApi: {
                onMessage: () => { listening = true },
                sendMessage: type => { assert.equal(listening, true); assert.equal(type, 19); requests++ }
            } }
        })
        assert.equal(requests, 1)
    })
    await t.test('普通心跳不重复拉取好友列表，也不广播回包到页面', () => {
        const { manager, sockets, received, tick } = create()
        manager.requestPresence()
        manager.connect()
        sockets[0].open()
        manager.requestPresence()
        manager.requestPresence()
        for (let i = 0; i < 4; i++) {
            tick(30000)
            sockets[0].pong()
        }
        assert.equal(sockets[0].sent.filter(frame => frame.messageType === 19).length, 1)
        assert.equal(sockets[0].sent.filter(frame => frame.messageType === 0).length, 5)
        assert.equal(received.length, 0)
        assert.equal(manager.ws.status, 1)
    })
    await t.test('页面监听较晚时等待页面请求，并合并尚未完成的请求', () => {
        const { manager, sockets } = create()
        manager.connect()
        sockets[0].open()
        assert.equal(sockets[0].sent.filter(frame => frame.messageType === 19).length, 0)
        manager.requestPresence()
        manager.requestPresence()
        assert.equal(sockets[0].sent.filter(frame => frame.messageType === 19).length, 1)
        sockets[0].snapshot([])
        manager.requestPresence()
        assert.equal(sockets[0].sent.filter(frame => frame.messageType === 19).length, 2)
    })
})
