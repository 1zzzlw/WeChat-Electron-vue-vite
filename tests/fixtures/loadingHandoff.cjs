const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

// 在测试窗口/数据库边界上运行实际 IPC 源码，Node 和 Electron 测试共用。
function loadHandoff(context) {
    const scope = vm.createContext({ console, setTimeout, clearTimeout, os: require('node:os'), ...context })
    for (const name of ['initDataIPC.js', 'windowToolIPC.js']) {
        const source = fs.readFileSync(path.join(__dirname, '../../src/main/IPC', name), 'utf8')
            .replace(/^import .*\r?\n/gm, '')
            .replace('export function', 'function')
            .replace(/export\s*\{[\s\S]*?\}\s*$/, '')
        vm.runInContext(source, scope, { filename: name })
    }
    return vm.runInContext('({ enterMain, finishLoadingWindow })', scope)
}

module.exports = { loadHandoff }
