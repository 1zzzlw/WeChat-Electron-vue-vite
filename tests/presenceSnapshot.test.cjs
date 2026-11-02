const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const { createApp, nextTick } = require('vue')
const { createPinia } = require('pinia')
const { babelParse } = require('vue/compiler-sfc')

test('登录在线列表覆盖缓存状态', async t => {
    const root = path.join(__dirname, '..')
    const { transformWithEsbuild } = await import('vite')
    const { createPersistedState } = await import('pinia-plugin-persistedstate')
    const evaluate = (code, extras = {}) => {
        const module = { exports: {} }
        vm.runInNewContext(code, { module, exports: module.exports, require, console, ...extras })
        return module.exports
    }
    const cacheCode = await transformWithEsbuild(
        fs.readFileSync(path.join(root, 'src/renderer/src/utils/cache.ts'), 'utf8'),
        'cache.ts', { loader: 'ts', format: 'cjs' }
    )
    const cache = evaluate(cacheCode.code)
    const storeCode = await transformWithEsbuild(
        fs.readFileSync(path.join(root, 'src/renderer/src/stores/modules/ContactListStore.ts'), 'utf8'),
        'ContactListStore.ts', { loader: 'ts', format: 'cjs' }
    )
    const handlerSource = fs.readFileSync(path.join(root, 'src/renderer/src/handlers/wsHandlers.js'), 'utf8')
    const handler = babelParse(handlerSource, { sourceType: 'module' }).program.body
        .find(node => node.type === 'FunctionDeclaration' && node.id.name === 'handleBatchOnline')
    const makeStore = () => {
        const records = new Map([
            ['friendInfo-store', JSON.stringify({
                friendInfoMap: { old: { friendId: 'old', username: '旧好友', isOnline: true } },
                onlineUserIds: ['old']
            })],
            ['conversation-store', '已有会话缓存']
        ])
        const storage = {
            getItem: key => records.get(key) ?? null,
            setItem: (key, value) => records.set(key, value),
            removeItem: key => records.delete(key)
        }
        const pinia = createPinia()
        pinia.use(createPersistedState())
        createApp({}).use(pinia)
        const store = evaluate(storeCode.code, {
            localStorage: storage,
            require: name => name === '@/utils/cache' ? cache : require(name)
        }).friendInfo(pinia)
        const receive = vm.runInNewContext(handlerSource.slice(handler.start, handler.end) + '\nhandleBatchOnline;', {
            friendInfo: () => store, localStorage: storage, console: { log() {} }
        })
        return { store, storage, receive }
    }

    await t.test('删除持久化数据不会清空当前页面内存', () => {
        const { store, storage } = makeStore()
        storage.removeItem('friendInfo-store')
        assert.equal(store.friendInfoMap.old.isOnline, true)
        assert.equal(store.onlineUserIds.has('old'), true)
        store.$dispose()
    })
    await t.test('收到空列表立即离线，并保存正确状态及保留会话缓存', async () => {
        const { store, storage, receive } = makeStore()
        receive({ friendIdList: [] })
        assert.equal(store.friendInfoMap.old.isOnline, false)
        assert.equal(store.onlineUserIds.size, 0)
        await nextTick()
        const saved = JSON.parse(storage.getItem('friendInfo-store'))
        assert.equal(saved.friendInfoMap.old.isOnline, false)
        assert.deepEqual(saved.onlineUserIds, [])
        assert.equal(storage.getItem('conversation-store'), '已有会话缓存')
        store.$dispose()
    })
    await t.test('新完整列表同时清除旧在线好友并设置当前在线好友', () => {
        const { store, receive } = makeStore()
        store.setFriendMap('new', { friendId: 'new', isOnline: false })
        receive({ friendIdList: ['new'] })
        assert.equal(store.friendInfoMap.old.isOnline, false)
        assert.equal(store.friendInfoMap.new.isOnline, true)
        assert.equal(store.onlineUserIds.has('old'), false)
        store.$dispose()
    })
    await t.test('联系人晚加载时，按最新在线列表恢复上线和离线状态', () => {
        const { store, receive } = makeStore()
        receive({ friendIdList: ['late'] })
        store.setFriendMap('late', { friendId: 'late', isOnline: false })
        store.setFriendMap('offline', { friendId: 'offline', isOnline: true })
        store.restoreOnlineStatus()
        assert.equal(store.friendInfoMap.late.isOnline, true)
        assert.equal(store.friendInfoMap.offline.isOnline, false)
        store.$dispose()
    })
    await t.test('上线通知早于联系人加载时保留状态，并兼容数字 ID', () => {
        const { store } = makeStore()
        store.addUserOnline(200)
        store.setFriendMap('200', { friendId: '200' })
        store.restoreOnlineStatus()
        assert.equal(store.friendInfoMap['200'].isOnline, true)
        store.removeUserOnline(200)
        assert.equal(store.friendInfoMap['200'].isOnline, false)
        store.$dispose()
    })
})
