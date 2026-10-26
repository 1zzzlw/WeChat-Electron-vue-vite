const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const { ESLint } = require('eslint')

const root = path.join(__dirname, '..')
const execute = promisify(execFile)

async function typecheck(...args) {
    try {
        const result = await execute(process.execPath, [
            path.join(root, 'node_modules/vue-tsc/bin/vue-tsc.js'), ...args, '--pretty', 'false'
        ], { cwd: root, windowsHide: true, maxBuffer: 8 * 1024 * 1024 })
        return { code: 0, output: result.stdout }
    } catch (error) {
        if (typeof error.code !== 'number') throw error
        return { code: error.code, output: error.stdout + error.stderr }
    }
}

function sourceFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name)
        return entry.isDirectory() ? sourceFiles(file) : /\.(ts|vue)$/.test(file) ? [file] : []
    })
}

async function run() {
    const eslint = new ESLint({ cwd: root })
    const results = []
    const check = async (name, scenario) => {
        try {
            await scenario()
            results.push({ name, status: 'PASS' })
        } catch (error) {
            results.push({ name, status: 'FAIL', error: error.stack })
        }
    }
    const lint = async (source, extension) => (await eslint.lintText(source, {
        filePath: path.join(root, 'src/renderer/src/__quality_probe__.' + extension)
    }))[0]

    await check('ESLint 能解析 TypeScript，而非忽略文件', async () => {
        const result = await lint('export const count: number = 1', 'ts')
        assert.equal(result.errorCount, 0, JSON.stringify(result.messages))
        assert.equal(result.warningCount, 0, JSON.stringify(result.messages))
    })
    await check('ESLint 能解析 Vue 中的 TypeScript', async () => {
        const result = await lint('<script setup lang="ts">const count: Record<string, number> = { value: 1 }</script><template>{{ count.value }}</template>', 'vue')
        assert.equal(result.errorCount, 0, JSON.stringify(result.messages))
        assert.equal(result.warningCount, 0, JSON.stringify(result.messages))
    })
    await check('ESLint 仍会阻止 JS 及 Vue JS 引用未定义变量', async () => {
        for (const [extension, source] of [
            ['js', 'console.log(missingQualityValue)'],
            ['vue', '<script setup>console.log(missingQualityValue)</script><template><div/></template>']
        ]) {
            const result = await lint(source, extension)
            assert.ok(result.messages.some(message => message.ruleId === 'no-undef' && message.severity === 2))
        }
    })
    await check('ESLint 仍会阻止 async Promise 执行器', async () => {
        const result = await lint('new Promise(async resolve => { resolve(1) })', 'js')
        assert.ok(result.messages.some(message => message.ruleId === 'no-async-promise-executor' && message.severity === 2))
    })
    await check('全部渲染进程 TS 和 Vue 文件都在类型检查范围中', async () => {
        const result = await typecheck('-p', 'tsconfig.json', '--listFilesOnly')
        assert.equal(result.code, 0, result.output)
        const normalize = file => path.resolve(file).replaceAll('\\', '/').toLowerCase()
        const included = new Set(result.output.trim().split(/\r?\n/).map(normalize))
        for (const file of sourceFiles(path.join(root, 'src/renderer/src'))) {
            assert.ok(included.has(normalize(file)), '类型检查漏掉文件：' + file)
        }
    })
    await check('错误的 TS、Vue 脚本及模板都会使类型检查失败', async () => {
        const result = await typecheck('--noEmit', '-p', 'tests/fixtures/typecheck/tsconfig.json')
        assert.notEqual(result.code, 0)
        assert.match(result.output, /invalid\.ts[^\n]*TS2322/)
        assert.match(result.output, /invalid\.vue[^\n]*TS2322/)
        assert.match(result.output, /invalid\.vue[^\n]*TS2339[^\n]*missingQualityProperty/)
    })
    if (results.some(result => result.status === 'FAIL')) {
        const error = new Error('检查工具回归失败')
        error.results = results
        throw error
    }
    return results
}

module.exports = { run }
if (require.main === module) {
    run().then(results => console.log('检查工具回归：' + results.length + '项通过'))
        .catch(error => { console.error(error.results || error); process.exitCode = 1 })
}
