const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

test('Lumina 改名保留旧数据、新安装使用新名称，并尊重自定义数据目录', async () => {
    const { transformWithEsbuild } = await import('vite')
    const code = (await transformWithEsbuild(fs.readFileSync(path.join(__dirname, '../src/main/shared.js'), 'utf8'), 'shared.js', { format: 'cjs' })).code
    const appData = path.join('fixture', 'Roaming')
    for (const [folder, legacyExists, expected] of [['Lumina', true, 'zzz-im-web'], ['lumina-agent', true, 'zzz-im-web'], ['Lumina', false, 'Lumina'], ['isolated-test', true, 'isolated-test']]) {
        let dataPath = path.join(appData, folder), name, storeOptions
        const app = { getPath: key => key === 'appData' ? appData : dataPath, setPath: (_key, value) => { dataPath = value }, setName: value => { name = value } }
        const module = { exports: {} }
        vm.runInNewContext(code, { module, exports: module.exports, process: { platform: 'win32' }, require: dependency => ({ electron: { app }, path, 'node:fs': { existsSync: () => legacyExists }, 'electron-store': class { constructor(options) { storeOptions = options } } })[dependency] })
        assert.equal(name, 'Lumina')
        assert.equal(dataPath, path.join(appData, expected))
        assert.equal(storeOptions.cwd, path.join(appData, expected, 'store'))
    }
})
