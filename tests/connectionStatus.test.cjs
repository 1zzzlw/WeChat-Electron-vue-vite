const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { ref, computed } = require('vue')

test('头像状态只随真实连接变化，迟到的初始查询不覆盖新事件，卸载取消监听', async () => {
  const { transformWithEsbuild } = await import('vite')
  const code = (
    await transformWithEsbuild(
      fs.readFileSync(
        path.join(__dirname, '../src/renderer/src/composables/useConnectionStatus.ts'),
        'utf8'
      ),
      'useConnectionStatus.ts',
      { format: 'cjs' }
    )
  ).code
  let mounted,
    cleanup,
    listener,
    initialResolve,
    unsubscribed = 0
  const initial = new Promise((resolve) => {
    initialResolve = resolve
  })
  const module = { exports: {} }
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: () => ({
      ref,
      computed,
      onMounted: (fn) => {
        mounted = fn
      },
      onUnmounted: (fn) => {
        cleanup = fn
      }
    }),
    window: {
      wsApi: {
        getConnectionStatus: () => initial,
        onConnectionStatus: (fn) => {
          listener = fn
          return () => unsubscribed++
        }
      }
    }
  })
  const status = module.exports.useConnectionStatus()
  assert.equal(status.isConnected.value, false)
  const pending = mounted()
  listener(1)
  assert.equal(status.isConnected.value, true)
  initialResolve(3)
  await pending
  assert.equal(status.isConnected.value, true)
  listener(3)
  assert.equal(status.connectionLabel.value, '离线')
  listener(0)
  assert.equal(status.isConnected.value, false)
  listener(1)
  assert.equal(status.connectionLabel.value, '在线')
  cleanup()
  assert.equal(unsubscribed, 1)
})
