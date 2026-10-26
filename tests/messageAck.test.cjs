const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createPinia } = require('pinia')
const { babelParse } = require('vue/compiler-sfc')

async function run() {
    const root = path.join(__dirname, '..')
    const { transformWithEsbuild } = await import('vite')
    const code = await transformWithEsbuild(
        fs.readFileSync(path.join(root, 'src/renderer/src/stores/modules/MessageStore.ts'), 'utf8'),
        'MessageStore.ts', { loader: 'ts', format: 'cjs' }
    )
    const handlerSource = fs.readFileSync(path.join(root, 'src/renderer/src/handlers/wsHandlers.js'), 'utf8')
    const handlerNode = babelParse(handlerSource, { sourceType: 'module' }).program.body
        .find(node => node.type === 'FunctionDeclaration' && node.id.name === 'handleAckMessage')
    const handlerCode = handlerSource.slice(handlerNode.start, handlerNode.end)
    const results = []
    const message = (id, content = id, sendStatus = 1) => ({
        id, conversationId: 'chat', content, sendStatus, senderId: 'A',
        receiverId: 'B', msgType: 1, sendTime: '2026-10-26T12:00:00'
    })
    const check = async (name, scenario) => {
        const module = { exports: {} }
        const timers = new Map()
        const saved = []
        let now = 1000
        let timerId = 0
        const quiet = { log() {}, info() {}, warn() {} }
        vm.runInNewContext(code.code, {
            module, exports: module.exports, require, console: quiet,
            window: { wsApi: { sendMessage() {} } },
            Date: { now: () => now },
            setInterval: callback => { timers.set(++timerId, callback); return timerId },
            clearInterval: id => timers.delete(id)
        })
        const store = module.exports.messageInfo(createPinia())
        store.retainConversation('chat')
        store.addMessageMap('chat', message('old', '旧消息'))
        store.sendMessage(message('temporary', '新消息', 0), 'chat')
        const handleAck = vm.runInNewContext(handlerCode + '\nhandleAckMessage;', {
            console: quiet, messageInfo: () => store, saveSentMessage: value => saved.push({ ...value })
        })
        const ack = () => handleAck({ status: 0, tempId: 'temporary', messageId: 'server-id' })
        const timeout = () => { now = 7001; [...timers.values()].forEach(callback => callback()) }
        const verify = () => {
            assert.equal(store.messageMap.chat.find(item => item.id === 'server-id')?.content, '新消息')
            assert.equal(store.messageMap.chat.find(item => item.id === 'server-id')?.sendStatus, 1)
            const old = store.messageMap.chat.find(item => item.id === 'old')
            if (old) { assert.equal(old.content, '旧消息'); assert.equal(old.sendStatus, 1) }
            assert.equal(saved.length, 1)
            assert.equal(saved[0].id, 'server-id')
            assert.equal(saved[0].content, '新消息')
            assert.equal(saved[0].sendStatus, 1)
            assert.equal(store.pendingMessages.has('temporary'), false)
        }
        try {
            await scenario({ store, saved, timers, ack, timeout, verify, message })
            results.push({ name, status: 'PASS' })
        } catch (error) {
            results.push({ name, status: 'FAIL', error: error.stack })
        } finally {
            store.stopTimeoutChecker()
            store.$dispose()
        }
    }
    await check('正常ACK更新正确消息并提交正确保存内容', ({ ack, verify }) => { ack(); verify() })
    await check('前插历史后ACK不修改旧消息', ({ store, ack, verify, message }) => {
        store.loadMessageMap('chat', message('history'))
        ack(); verify()
    })
    await check('删除前面的消息后ACK仍正确关联', ({ store, ack, verify }) => {
        store.deleteMessage('chat', 'old')
        ack(); verify()
    })
    await check('超时后迟到ACK恢复成功状态并正确保存', ({ store, timeout, ack, verify }) => {
        timeout()
        assert.equal(store.messageMap.chat.find(item => item.id === 'temporary').sendStatus, 2)
        ack(); verify()
    })
    await check('服务端ID替换后重复ACK不重复保存', ({ timeout, ack, verify }) => {
        timeout(); ack(); ack(); verify()
    })
    await check('消息已删除时ACK不写入其他消息', ({ store, ack, saved, timers }) => {
        store.deleteMessage('chat', 'temporary')
        ack()
        assert.equal(saved.length, 0)
        assert.equal(store.messageMap.chat[0].id, 'old')
        assert.equal(timers.size, 0)
    })
    await check('确认一条消息时保留其他待确认消息的计时器', ({ store, ack, timers, message }) => {
        store.sendMessage(message('another', '另一条消息', 0), 'chat')
        ack()
        assert.equal(store.pendingMessages.has('another'), true)
        assert.equal(timers.size, 1)
        store.onReceiveAck('another')
        assert.equal(timers.size, 0)
    })
    const failures = results.filter(result => result.status === 'FAIL')
    if (failures.length) { const error = new Error('ACK回归失败'); error.results = results; throw error }
    return results
}

module.exports = { run }
if (require.main === module) {
    run().then(results => console.log('ACK回归：' + results.length + '项通过'))
        .catch(error => { console.error(error.results || error); process.exitCode = 1 })
}
