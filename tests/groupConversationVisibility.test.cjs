const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const { DatabaseSync } = require('node:sqlite')
const { createPinia } = require('pinia')

const root = path.join(__dirname, '..')

test('隐藏群会话后仍能从联系人找到并重新打开', async () => {
    const storePath = 'src/renderer/src/stores/modules/ConversationStore.ts'
    const { transformWithEsbuild } = await import('vite')
    const source = fs.readFileSync(path.join(root, storePath), 'utf8')
    const { code } = await transformWithEsbuild(source, storePath, { loader: 'ts', format: 'cjs' })
    const module = { exports: {} }
    vm.runInNewContext(code, {
        module, exports: module.exports, localStorage: {},
        require: name => name === '@/utils/cache' ? { checkCache: () => true } : require(name)
    })
    const store = module.exports.conversationInfo(createPinia())
    const db = new DatabaseSync(':memory:')
    try {
        db.exec(`create table conversation (id text, user_id integer, type integer, status integer);
            insert into conversation values ('group', 100, 1, 1), ('private', 100, 0, 0), ('other-group', 200, 1, 1)`)
        const selectSource = fs.readFileSync(path.join(root, 'src/main/DB/select.js'), 'utf8')
            .replace(/^import[^\n]*\n/gm, '').replace(/export\s*\{[\s\S]*\}\s*$/, '')
        const queryConversation = vm.runInNewContext(selectSource + '\nqueryConversation', {
            console: { log() {} },
            queryAll: (sql, userId) => db.prepare(sql).all(userId)
        })
        store.setConversationMap('group', { type: 1, status: 1, unreadCount: 2 })
        store.hideConversation('group')
        assert.equal(store.conversationMap.group?.status, 0)
        assert.equal(store.totalUnreadCount, 0)
        assert.equal(store.getGroupConversationList()[0]?.id, 'group')

        db.exec("update conversation set status = 0 where id = 'group'")
        const rows = queryConversation(100)
        assert.equal(rows.length, 1)
        assert.equal(rows[0].id, 'group')
        assert.equal(rows[0].status, 0)

        store.setConversationMap('group', { status: 1 })
        assert.equal(store.getGroupConversationList()[0].status, 1)
        assert.equal(store.totalUnreadCount, 2)
        store.deleteConversation('group')
        assert.equal(store.getGroupConversationList().length, 0)
    } finally {
        db.close()
        store.$dispose()
    }
})
