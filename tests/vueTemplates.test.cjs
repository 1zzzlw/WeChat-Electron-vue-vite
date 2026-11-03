const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { parse, compileTemplate } = require('vue/compiler-sfc')

test('所有 Vue 模板可编译，防止多行事件表达式在格式化后破坏开发页面', () => {
  const root = path.join(__dirname, '../src/renderer/src')
  const files = fs.readdirSync(root, { recursive: true }).filter(file => file.endsWith('.vue'))
  for (const file of files) {
    const { descriptor, errors } = parse(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file })
    assert.deepEqual(errors, [], file)
    if (!descriptor.template) continue
    const result = compileTemplate({ source: descriptor.template.content, filename: file, id: 'syntax-check', compilerOptions: { expressionPlugins: ['typescript'] } })
    assert.deepEqual(result.errors, [], file)
  }
})
