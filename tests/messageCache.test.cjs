const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const vue = require('vue')
const { createPinia } = require('pinia')
const { parse, babelParse } = require('vue/compiler-sfc')

const root = path.join(__dirname, '..')
const quiet = { log() {}, info() {}, warn() {}, error() {} }
const deferred = () => {
    let resolve
    const promise = new Promise(done => { resolve = done })
    return { promise, resolve }
}
const message = (id, conversationId = 'a', sendStatus = 1) => ({
    id: String(id), conversationId, senderId: 'A', receiverId: 'B',
    content: 'message ' + id, msgType: 1, sendStatus, sendTime: '2026-10-26T12:00:00'
})
const messages = (start, count, conversationId = 'a') =>
    Array.from({ length: count }, (_, i) => message(start + i, conversationId))

async function run() {
    const { transformWithEsbuild } = await import('vite')
    const storeCode = await transformWithEsbuild(
        fs.readFileSync(path.join(root, 'src/renderer/src/stores/modules/MessageStore.ts'), 'utf8'),
        'MessageStore.ts', { loader: 'ts', format: 'cjs' }
    )
    const scrollCode = await transformWithEsbuild(
        fs.readFileSync(path.join(root, 'src/renderer/src/composables/useChatScroll.ts'), 'utf8'),
        'useChatScroll.ts', { loader: 'ts', format: 'cjs' }
    )
    const component = parse(fs.readFileSync(path.join(root, 'src/renderer/src/views/chat/ChatBase.vue'), 'utf8')).descriptor
    const script = component.scriptSetup.content
    const ast = babelParse(script, { sourceType: 'module', plugins: ['typescript'] })
    const variables = new Set(['messagePageInfo', 'messageLoadVersion', 'retainedConversationId'])
    // 提取组件真实的缓存生命周期、分页函数和监听器，隔离模板及无关聊天功能。
    const selected = ast.program.body.filter(node => {
        if (node.type === 'VariableDeclaration') return node.declarations.some(item => variables.has(item.id.name))
        if (node.type === 'FunctionDeclaration') return node.id.name === 'loadMessage'
        if (node.type !== 'ExpressionStatement' || node.expression.type !== 'CallExpression') return false
        const call = node.expression
        return call.callee.name === 'onUnmounted' ||
            (call.callee.name === 'watch' && (
                call.arguments[0].name === 'effectiveConvId' || call.arguments[0].type === 'ArrayExpression'
            ))
    }).map(node => script.slice(node.start, node.end)).join('\n')
    const viewCode = await transformWithEsbuild(selected + '\nmodule.exports = { loadMessage, getPageInfo: () => ({ ...messagePageInfo }) };',
        'ChatBase-cache.ts', { loader: 'ts', format: 'cjs' })
    const dbSource = fs.readFileSync(path.join(root, 'src/renderer/src/db/dualDB.js'), 'utf8')
        .replace(/^import[^\n]*\n/gm, '').replace(/export\s*\{[\s\S]*?\}\s*$/, '')

    const evaluate = (code, extras = {}) => {
        const module = { exports: {} }
        vm.runInNewContext(code, {
            module, exports: module.exports, require, console: quiet,
            setInterval: () => 1, clearInterval() {},
            window: { wsApi: { sendMessage() {} } },
            ...extras
        })
        return module.exports
    }
    const makeStore = () => evaluate(storeCode.code).messageInfo(createPinia())
    const results = []
    const check = async (name, execute) => {
        try { await execute(); results.push({ name, status: 'PASS' }) }
        catch (error) { results.push({ name, status: 'FAIL', error: error.stack }) }
    }

    const withStore = async execute => {
        const store = makeStore()
        try { await execute(store) }
        finally { store.stopTimeoutChecker(); store.$dispose() }
    }
    const createView = store => {
        const dbRequests = []
        const serverRequests = []
        const stops = []
        const unmounts = []
        const currentId = vue.ref('a')
        const props = vue.reactive({ conversation: { id: 'a', type: 0 } })
        const noMore = vue.ref(false)
        let scrollCount = 0
        const dbApi = evaluate(dbSource + '\nmodule.exports = { getMessageList };', {
            window: { dbApi: { loadMessage: (id, params) => {
                const task = deferred()
                dbRequests.push({ id, params, resolve: task.resolve })
                return task.promise
            } } },
            pullMessageListApi: params => {
                const task = deferred()
                serverRequests.push({ params, resolve: task.resolve })
                return task.promise
            }
        })
        const api = evaluate(viewCode.code, {
            messageStore: store, effectiveConvId: vue.computed(() => currentId.value),
            props, noMore, fileInfoList: vue.ref([]), quoteMessage: vue.ref(null),
            getMessageList: dbApi.getMessageList, saveLoadMessage() {},
            getGroupMemberList: async () => {}, nextTick: vue.nextTick,
            scrollToBottom: () => { scrollCount++ },
            watch: (...args) => { const stop = vue.watch(...args); stops.push(stop); return stop },
            onUnmounted: callback => unmounts.push(callback)
        })
        return {
            ...api, dbRequests, serverRequests, noMore,
            scrollCount: () => scrollCount,
            async settle(request, data, pageTotal = 100) {
                request.resolve({ dataList: data, pageTotal, pageNO: request.params.pageNO })
                for (let i = 0; i < 8; i++) await vue.nextTick()
            },
            async switchTo(id) {
                currentId.value = id
                props.conversation = { id, type: 0 }
                await vue.nextTick()
            },
            dispose() {
                stops.forEach(stop => stop())
                unmounts.forEach(callback => callback())
            }
        }
    }

    await check('打开的会话达到500条后，旧消息仍可插入头部', () => withStore(store => {
        store.retainConversation('a')
        store.messageMap.a = messages(501, 500)
        store.loadMessageMap('a', message(500))
        assert.equal(store.messageMap.a.length, 501)
        assert.equal(store.messageMap.a[0].id, '500')
    }))
    await check('连续加载历史并接收新消息，不移除已显示的旧消息', () => withStore(store => {
        store.retainConversation('a')
        store.messageMap.a = messages(501, 500)
        for (let id = 500; id >= 1; id--) store.loadMessageMap('a', message(id))
        store.addMessageMap('a', message(1001))
        assert.equal(store.messageMap.a.length, 1001)
        assert.equal(store.messageMap.a[0].id, '1')
        assert.equal(store.messageMap.a.at(-1).id, '1001')
    }))
    await check('未打开的会话继续保留最新500条', () => withStore(store => {
        for (const item of messages(1, 700)) store.addMessageMap('a', item)
        assert.equal(store.messageMap.a.length, 500)
        assert.equal(store.messageMap.a[0].id, '201')
    }))
    await check('离开会话时回收到最新500条', () => withStore(store => {
        store.retainConversation('a')
        store.messageMap.a = messages(1, 700)
        store.releaseConversation('a')
        assert.equal(store.messageMap.a.length, 500)
        assert.equal(store.messageMap.a[0].id, '201')
        assert.equal(store.activeConversationViews.a, undefined)
    }))
    await check('同一会话有两个视图时，最后一个关闭后才裁剪', () => withStore(store => {
        store.retainConversation('a')
        store.retainConversation('a')
        store.messageMap.a = messages(1, 700)
        store.releaseConversation('a')
        assert.equal(store.messageMap.a.length, 700)
        store.releaseConversation('a')
        assert.equal(store.messageMap.a.length, 500)
    }))
    await check('批量和逐条历史加载采用相同缓存策略', () => withStore(store => {
        store.retainConversation('a')
        store.messageMap.a = messages(501, 500)
        store.batchLoadMessages('a', messages(481, 20))
        assert.equal(store.messageMap.a.length, 520)
        assert.equal(store.messageMap.a[0].id, '481')
        store.batchLoadMessages('b', messages(1, 600, 'b'))
        assert.equal(store.messageMap.b.length, 500)
    }))
    await check('加载历史后ACK、超时和错误仍只更新对应消息', () => withStore(store => {
        store.retainConversation('a')
        store.messageMap.a = messages(501, 500)
        store.sendMessage(message('pending', 'a', 0), 'a')
        store.loadMessageMap('a', message(500))
        assert.equal(store.onReceiveAck('pending').id, 'pending')
        store.sendMessage(message('timeout', 'a', 0), 'a')
        store.loadMessageMap('a', message(499))
        store.handleMessageTimeout('timeout', store.pendingMessages.get('timeout'))
        assert.equal(store.onReceiveAck('timeout').sendStatus, 1)
        store.sendMessage(message('error', 'a', 0), 'a')
        store.onReceiveError('error', 'test')
        assert.equal(store.messageMap.a.find(item => item.id === 'error').sendStatus, 2)
        assert.equal(store.messageMap.a.find(item => item.id === '499').sendStatus, 1)
    }))
    await check('清空会话消息后，仍打开的视图继续保留新加载历史', () => withStore(store => {
        store.retainConversation('a')
        store.clearConversationMessages('a')
        store.batchLoadMessages('a', messages(1, 600))
        assert.equal(store.messageMap.a.length, 600)
    }))
    await check('滚动加载期间重复滚动只请求一次，并保持原首条消息作为锚点', async () => {
        const pending = deferred()
        let calls = 0
        let anchors = 0
        const scroll = evaluate(scrollCode.code, {
            document: { querySelector: selector => {
                assert.equal(selector, '#message501')
                return { scrollIntoView: () => { anchors++ } }
            } }
        }).useChatScroll(vue.ref(), {
            canLoadMore: () => true, getFirstMessageId: () => '501',
            onLoadMore: () => { calls++; return pending.promise }
        })
        const first = scroll.handleScroll({ scrollTop: 0 })
        await scroll.handleScroll({ scrollTop: 0 })
        assert.equal(calls, 1)
        pending.resolve()
        await first
        assert.equal(anchors, 1)
        assert.equal(scroll.loading.value, false)
    })
    await check('分页加载失败后解除加载锁，允许再次尝试', async () => {
        let calls = 0
        const scroll = evaluate(scrollCode.code, {
            document: { querySelector: () => null }
        }).useChatScroll(vue.ref(), {
            canLoadMore: () => true, getFirstMessageId: () => undefined,
            onLoadMore: async () => { calls++; if (calls === 1) throw new Error('test failure') }
        })
        await assert.rejects(scroll.handleScroll({ scrollTop: 0 }), /test failure/)
        await scroll.handleScroll({ scrollTop: 0 })
        assert.equal(calls, 2)
        assert.equal(scroll.loading.value, false)
    })
    await check('真实分页函数连续加载600条后，继续加载及接收消息仍保留历史', () => withStore(async store => {
        const view = createView(store)
        try {
            await view.settle(view.dbRequests[0], messages(981, 20).reverse())
            for (let page = 1; page < 30; page++) {
                const task = view.loadMessage('a')
                const request = view.dbRequests.at(-1)
                assert.equal(request.params.maxMessageId, String(1001 - page * 20))
                await view.settle(request, messages(981 - page * 20, 20).reverse())
                await task
            }
            assert.equal(store.messageMap.a.length, 600)
            assert.equal(store.messageMap.a[0].id, '401')
            store.addMessageMap('a', message(1001))
            const task = view.loadMessage('a')
            await view.settle(view.dbRequests.at(-1), messages(381, 20).reverse())
            await task
            assert.equal(store.messageMap.a.length, 621)
            assert.equal(store.messageMap.a[0].id, '381')
            assert.equal(view.getPageInfo().maxMessageId, '381')
        } finally { view.dispose() }
        assert.equal(store.messageMap.a.length, 500)
    }))
    await check('切换会话后，迟到的旧分页不能回写缓存或污染新游标', () => withStore(async store => {
        const view = createView(store)
        try {
            const old = view.dbRequests[0]
            await view.switchTo('b')
            const current = view.dbRequests.at(-1)
            await view.settle(current, messages(901, 20, 'b').reverse())
            const cursor = view.getPageInfo().maxMessageId
            const scrolls = view.scrollCount()
            await view.settle(old, messages(1, 20).reverse())
            assert.equal(view.getPageInfo().maxMessageId, cursor)
            assert.equal(store.messageMap.a, undefined)
            assert.equal(store.messageMap.b[0].id, '901')
            assert.equal(store.activeConversationViews.a, undefined)
            assert.equal(store.activeConversationViews.b, 1)
            assert.equal(view.scrollCount(), scrolls)
        } finally { view.dispose() }
    }))
    await check('组件卸载后，迟到分页不重新填充缓存', () => withStore(async store => {
        const view = createView(store)
        const old = view.dbRequests[0]
        view.dispose()
        await view.settle(old, messages(1, 20).reverse())
        assert.equal(store.messageMap.a, undefined)
        assert.equal(store.activeConversationViews.a, undefined)
    }))
    await check('服务端无更多历史时停止继续加载，切换会话会重置该状态', () => withStore(async store => {
        const view = createView(store)
        try {
            await view.settle(view.dbRequests[0], messages(21, 20).reverse(), 0)
            const task = view.loadMessage('a')
            assert.equal(view.serverRequests.length, 1)
            view.serverRequests[0].resolve({ data: [] })
            await task
            assert.equal(view.noMore.value, true)
            await view.switchTo('b')
            assert.equal(view.noMore.value, false)
            await view.settle(view.dbRequests.at(-1), messages(1, 20, 'b').reverse())
        } finally { view.dispose() }
    }))

    const failures = results.filter(result => result.status === 'FAIL')
    if (failures.length) {
        const error = new Error('消息缓存回归失败：' + failures.length)
        error.results = results
        throw error
    }
    return results
}

module.exports = { run }
if (require.main === module) {
    run().then(results => console.log('消息缓存回归：' + results.length + '项通过'))
        .catch(error => { console.error(error.results || error); process.exitCode = 1 })
}
