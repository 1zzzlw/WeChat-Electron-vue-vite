// 隔离的 Electron 页面回归：不连接真实服务，不读写用户数据库。
const { app, BrowserWindow, ipcMain } = require('electron')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const root = path.join(__dirname, '..')
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const timeout = setTimeout(() => app.exit(1), 45000)
let win
let theme = 'light'
let style = 'ai-native'
let available = true
let failSend = false
let hasCharacter = true
const requests = []
const sent = []
const modelWrites = []
const privateConfigId = '11111111-1111-4111-8111-111111111111'
let selectedConfigId = null
const configs = [
  {
    id: privateConfigId,
    userId: 'fixture-user',
    configName: '我的聊天模型',
    providerName: 'custom',
    modelName: 'fixture-model',
    baseUrl: 'https://example.test/v1',
    modelTemperature: 1,
    isPublic: false
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    userId: 'fixture-user',
    configName: '公共模型',
    providerName: 'default',
    modelName: 'public-model',
    baseUrl: null,
    modelTemperature: 1,
    isPublic: true
  }
]
const errors = []
const checks = []
const json = (body) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

async function until(code) {
  for (let count = 0; count < 100; count++) {
    if (await win.webContents.executeJavaScript(code)) return
    await wait(30)
  }
  throw new Error('等待页面状态超时：' + code)
}
async function evaluate(code) {
  return win.webContents.executeJavaScript(code)
}
async function screenshot(output, name) {
  await evaluate(
    'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'
  )
  await fs.writeFile(path.join(output, name), (await win.webContents.capturePage()).toPNG())
}
async function typeMessage(text) {
  await evaluate(
    `(() => { const input = document.querySelector('#companion-draft'); input.value = ${JSON.stringify(text)}; input.dispatchEvent(new Event('input', { bubbles: true })); })()`
  )
}

app
  .whenReady()
  .then(async () => {
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'imagent-companion-'))
    ipcMain.on('fixture:style:initial', (event) => {
      event.returnValue = style
    })
    ipcMain.handle('fixture:style:get', () => style)
    ipcMain.handle('fixture:style:set', (_event, value) => {
      style = value
      win.webContents.send('fixture:style:changed', value)
      return value
    })
    ipcMain.on('fixture:theme:initial', (event) => {
      event.returnValue = theme
    })
    ipcMain.handle('fixture:theme:get', () => theme)
    ipcMain.handle('fixture:theme:set', (_event, value) => {
      theme = value
      win.webContents.send('fixture:theme:changed', value)
      return value
    })
    win = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,
      frame: false,
      useContentSize: true,
      webPreferences: {
        preload: path.join(__dirname, 'fixtures/desktopPreload.cjs'),
        offscreen: true,
        backgroundThrottling: false,
        partition: 'imagent-companion-test',
        contextIsolation: true,
        webSecurity: false
      }
    })
    win.webContents.on('console-message', (event) => {
      if (event.level === 'error') errors.push(event.message)
    })
    await win.webContents.session.protocol.handle('http', async (request) => {
      const url = new URL(request.url)
      requests.push(url.pathname)
      if (url.pathname.endsWith('/ai-message/status')) return json({ available })
      if (url.pathname.endsWith('/ai-message/person'))
        return json({
          exists: hasCharacter,
          name: hasCharacter ? '林夏' : undefined,
          status: '在线',
          worldId: 'current-chat'
        })
      if (url.pathname.endsWith('/person/candidates'))
        return json({
          candidates: [
            {
              id: 'candidate-1',
              name: '林夏',
              introduction: '住在海边城市的学生',
              appearance: '短发，常带着一本速写本'
            },
            {
              id: 'candidate-2',
              name: '南栀',
              introduction: '刚来到这座城市的插画师',
              appearance: '喜欢穿浅色外套'
            }
          ]
        })
      if (url.pathname.endsWith('/person/select')) {
        hasCharacter = true
        return json({ worldId: 'current-chat' })
      }
      if (url.pathname.endsWith('/person/settings'))
        return json({
          lifeWindowMinutes: 30,
          presenceVisibility: { online: true, read: true, typing: true },
          notifications: { muted: false }
        })
      if (url.pathname.endsWith('/person/bindings')) return json({})
      if (url.pathname.endsWith('/person/credential')) return json({ success: true })
      if (url.pathname.endsWith('/person/moments'))
        return json([
          {
            id: 'post-1',
            name: '林夏',
            publishedAt: '2026-11-03T10:00:00Z',
            parts: { parts: [{ type: 'text', text: '今天画完了海边的云。' }] },
            liked: false,
            interactions: [
              { id: 'npc-comment', name: '阿宁', kind: 'comment', content: '下次一起去！' }
            ]
          }
        ])
      if (url.pathname.includes('/interactions')) return json({ success: true })
      if (url.pathname.endsWith('/config/getConfig'))
        return json(
          configs.map((config) => ({ ...config, isActive: config.id === selectedConfigId }))
        )
      if (url.pathname.endsWith('/config/switchModel')) {
        const payload = await request.json()
        selectedConfigId = payload.configId
        modelWrites.push(payload)
        return json({ success: true })
      }
      if (url.pathname.endsWith('/config/updateModel')) {
        modelWrites.push(await request.json())
        return json({ success: true })
      }
      if (url.pathname.endsWith('/loadMessage'))
        return json([
          {
            id: 'old-message',
            conversationId: 'old-chat',
            role: 'user',
            content: '其他旧会话不应该合并',
            createdAt: '2026-11-02T10:00:00Z'
          },
          {
            id: 'current-message',
            conversationId: 'current-chat',
            role: 'assistant',
            content: '慢慢聊，今天想说些什么？',
            createdAt: '2026-11-03T10:00:00Z'
          }
        ])
      if (url.pathname.endsWith('/sendMessage')) {
        sent.push(await request.json())
        if (failSend)
          return new Response(
            JSON.stringify({
              detail: { code: 'PERSON_AGENT_NOT_READY', message: '聊天服务暂未开放，请稍后再来。' }
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
        const events = [
          ['run.started', { conversationId: 'current-chat', clientMessageId: sent.at(-1).id }],
          ['message.reasoning.delta', { delta: 'INTERNAL_SECRET_REASONING' }],
          ['tool.request', { operation: 'command', workspaceName: 'PRIVATE_WORKSPACE' }],
          ['plan.created', { steps: [{ title: 'INTERNAL_SECRET_PLAN' }] }],
          ['message.delta', { delta: '好呀，' }],
          [
            'message.completed',
            {
              messageId: 'reply',
              content: '好呀，慢慢说。',
              reasoningContent: 'INTERNAL_SECRET_REASONING'
            }
          ],
          ['done', {}]
        ]
        return new Response(
          events
            .map(([event, data]) => 'event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n')
            .join(''),
          { headers: { 'Content-Type': 'text/event-stream' } }
        )
      }
      return json({ code: 1, data: [] })
    })
    await win.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/aiWorkspace' })
    await until(
      "!!document.querySelector('#companion-draft') && document.body.innerText.includes('慢慢聊')"
    )
    assert.equal(await evaluate("document.body.innerText.includes('其他旧会话')"), false)
    assert.equal(
      await evaluate(
        "!!document.querySelector('.new-task-button,.workspace-selector,.think-mode-switch,.tool-step-list,.message-reasoning')"
      ),
      false
    )
    assert.equal(
      await evaluate('!!document.querySelector(\'a[aria-label="AI 伙伴"] svg path\')'),
      true
    )
    checks.push('唯一长期窗口，不合并其他旧会话；移除任务、工作区和推理入口；爱心气泡图标存在')
    await screenshot(output, 'chat-light.png')

    await evaluate("document.querySelector('.sidebar-settings').click()")
    await until("document.querySelectorAll('.model-row').length === 3")
    assert.equal(
      await evaluate(
        "document.querySelectorAll('.model-row')[2].querySelector('.model-actions') === null"
      ),
      true
    )
    await evaluate("document.querySelectorAll('.model-choice')[1].click()")
    await until("document.querySelectorAll('.model-row')[1].classList.contains('is-selected')")
    assert.equal(modelWrites.at(-1).configId, privateConfigId)
    await evaluate("document.querySelector('.companion-nav button').click()")

    await typeMessage('今天有件小事')
    await evaluate(
      "document.querySelector('#companion-draft').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }))"
    )
    await wait(60)
    assert.equal(sent.length, 0)
    await evaluate(
      "document.querySelector('#companion-draft').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))"
    )
    await until("document.body.innerText.includes('好呀，慢慢说。')")
    assert.equal(sent.length, 1)
    assert.equal(sent[0].conversationId, 'current-chat')
    assert.match(sent[0].id, /^[0-9a-f-]{36}$/)
    assert.equal(sent[0].config.configId, privateConfigId)
    for (const field of ['mode', 'workspaceName', 'branch']) assert.equal(field in sent[0], false)
    for (const marker of ['INTERNAL_SECRET', 'PRIVATE_WORKSPACE'])
      assert.equal(
        await evaluate(`document.body.innerText.includes(${JSON.stringify(marker)})`),
        false
      )
    assert.equal(
      requests.some((url) => /workspace|conversation\//.test(url)),
      false
    )
    checks.push('中文输入法回车不误发；只发送聊天字段；内部推理和工具事件不会展示或执行')

    await evaluate('document.querySelector(\'[aria-label="搜索已加载的消息"]\').click()')
    await until("!!document.querySelector('.chat-search input')")
    await evaluate(
      "const search = document.querySelector('.chat-search input'); search.value = '不匹配'; search.dispatchEvent(new Event('input', { bubbles: true }))"
    )
    await until("document.body.innerText.includes('没有找到匹配')")
    await evaluate('document.querySelector(\'[aria-label="关闭搜索"]\').click()')
    checks.push('搜索作用于已加载的聊天消息并提供空结果')

    failSend = true
    await typeMessage('请保留失败的草稿')
    await evaluate("document.querySelector('.send-button').click()")
    await until("!!document.querySelector('.send-failed')")
    assert.equal(
      await evaluate("document.querySelector('#companion-draft').value"),
      '请保留失败的草稿'
    )
    assert.equal(await evaluate("document.querySelector('.send-button').disabled"), true)
    assert.equal(
      await evaluate("document.querySelectorAll('.chat-message:not(.is-user)').length"),
      2
    )
    checks.push('503 保留草稿、标记用户消息未发送，不伪造 AI 回复，也不显示服务可用')

    await evaluate("window.themeApi.setTheme('dark')")
    await until("document.documentElement.dataset.theme === 'dark'")
    await screenshot(output, 'chat-dark.png')
    await evaluate("document.querySelector('.companion-nav button:nth-child(2)').click()")
    await until("document.body.innerText.includes('今天画完了海边的云。')")
    await screenshot(output, 'moments-dark.png')
    assert.equal(await evaluate("document.body.innerText.includes('下次一起去！')"), true)
    checks.push('朋友圈展示服务端可见动态和伙伴评论，提供点赞评论入口')

    await evaluate("document.querySelector('.sidebar-settings').click()")
    await until("document.body.innerText.includes('选择聊天使用的模型')")
    assert.equal(await evaluate("document.body.innerText.includes('由管理员处理')"), true)
    await screenshot(output, 'settings-dark.png')
    await evaluate(
      'const edit = document.querySelector(\'[aria-label="编辑我的聊天模型"]\'); edit.focus(); edit.click()'
    )
    await until("!!document.querySelector('.model-config-dialog input')")
    assert.equal(
      await evaluate(
        "document.activeElement === document.querySelector('.model-config-dialog input')"
      ),
      true
    )
    await evaluate(
      "document.querySelector('.model-config-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))"
    )
    await until("!document.querySelector('.model-config-dialog')")
    assert.equal(modelWrites.at(-1).configId, privateConfigId)
    await until("document.activeElement.getAttribute('aria-label') === '编辑我的聊天模型'")
    checks.push('模型 UUID 字符串贯穿选择、发送和编辑；公共配置不显示编辑入口；弹窗管理焦点')

    for (const [width, height] of [
      [1200, 800],
      [800, 620],
      [460, 760]
    ]) {
      win.setContentSize(width, height)
      await wait(80)
      assert.equal(
        await evaluate(
          "document.documentElement.scrollWidth <= innerWidth && document.querySelector('.companion-main').getBoundingClientRect().right <= innerWidth + 1"
        ),
        true
      )
    }
    await screenshot(output, 'settings-narrow.png')
    checks.push('明暗主题与窄窗口无横向溢出，模型设置不提供人格修改')

    hasCharacter = false
    failSend = false
    win.setContentSize(1200, 800)
    await win.reload()
    await until("!!document.querySelector('.creation textarea')")
    await evaluate(
      "const wish=document.querySelector('.creation textarea');wish.value='一个有自己生活的人';wish.dispatchEvent(new Event('input',{bubbles:true}))"
    )
    await until("document.querySelector('.creation > button').disabled === false")
    await evaluate("document.querySelector('.creation > button').click()")
    await until("document.querySelectorAll('.candidate-list article').length === 2")
    await screenshot(output, 'character-candidates.png')
    assert.equal(
      await evaluate("document.querySelector('.creation').innerText.includes('性格')"),
      false
    )
    await evaluate("document.querySelector('.candidate-list article button').click()")
    await until("!document.querySelector('.creation') && document.body.innerText.includes('林夏')")
    checks.push('首次创建展示表面候选，确认后进入同一人物长期窗口')

    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ passed: checks, screenshots: output }, null, 2))
  })
  .then(() => {
    clearTimeout(timeout)
    win?.destroy()
    app.quit()
  })
  .catch((error) => {
    console.error(error)
    clearTimeout(timeout)
    win?.destroy()
    app.exit(1)
  })
