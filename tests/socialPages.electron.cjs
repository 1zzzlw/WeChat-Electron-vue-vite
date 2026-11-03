// 离线验证添加好友、聊天资料和频道瀑布流；仅使用合成账号与请求。
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const root = path.join(__dirname, '..')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const windows = [],
  errors = [],
  results = [],
  pages = [],
  opened = []
const profile = {
  id: 'fixture-user',
  username: '天空',
  account: 'fixture',
  gender: 1,
  email: 'sky@example.test',
  phone: '13800000000',
  birthday: '2000-01-01',
  address: '杭州',
  avatar: ''
}
const profileWrites = [],
  applyActions = []
let style = 'ai-native',
  theme = 'light',
  applications = 0,
  failPage = false,
  hotDelay = 0
const timeout = setTimeout(() => {
  console.error('社交界面验证超时', results)
  app.exit(1)
}, 60000)
app.setPath(
  'userData',
  require('node:fs').mkdtempSync(path.join(os.tmpdir(), 'easychat-social-data-'))
)
const evaluate = (win, code) => win.webContents.executeJavaScript(code)
async function waitFor(win, code) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(win, code)) return
    await delay(30)
  }
  throw new Error(
    '等待失败: ' + code + '\n' + (await evaluate(win, 'document.body.innerText.slice(0, 700)'))
  )
}
function createWindow(width, height) {
  const win = new BrowserWindow({
    width,
    height,
    useContentSize: true,
    show: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'fixtures/desktopPreload.cjs'),
      partition: 'easychat-social-fixture',
      offscreen: true,
      backgroundThrottling: false,
      webSecurity: false
    }
  })
  windows.push(win)
  win.webContents.on('console-message', (event) => {
    if (event.level === 'error') errors.push(event.message)
  })
  return win
}
let routeVersion = 0
const route = (win, hash, query) =>
  win.loadFile(path.join(root, 'out/renderer/index.html'), {
    hash: '/' + hash,
    query: { ...query, fixturePage: String(++routeVersion) }
  })
const search = async (win, value) => {
  await evaluate(
    win,
    "(() => { const input = document.querySelector('#friend-search'); input.value = " +
      JSON.stringify(value) +
      "; input.dispatchEvent(new Event('input', { bubbles: true })) })()"
  )
  await delay(10)
  await evaluate(win, "document.querySelector('form').requestSubmit()")
}
app
  .whenReady()
  .then(async () => {
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'easychat-social-'))
    const save = async (win, file) => {
      await delay(350)
      await fs.writeFile(
        path.join(output, file + '.png'),
        (await win.webContents.capturePage()).toPNG()
      )
    }
    ipcMain.on('fixture:style:initial', (event) => {
      event.returnValue = style
    })
    ipcMain.on('fixture:theme:initial', (event) => {
      event.returnValue = theme
    })
    ipcMain.handle('fixture:style:get', () => style)
    ipcMain.handle('fixture:theme:get', () => theme)
    ipcMain.on('fixture:profile:set', (_event, key, value) => profileWrites.push({ key, value }))
    ipcMain.on('fixture:new-window', (_event, type, data) => opened.push({ type, data }))
    const friend = createWindow(400, 640),
      chat = createWindow(1100, 700)
    await friend.webContents.session.protocol.handle('http', async (request) => {
      const url = new URL(request.url)
      let response = { code: 1, data: [] }
      if (url.pathname === '/user/me') response = { code: 1, data: profile }
      if (url.pathname === '/user/updateInfo') {
        Object.assign(profile, await request.json())
        await delay(80)
        response = { code: 1, data: profile }
      }
      if (url.pathname === '/apply/list')
        response = {
          code: 1,
          data: [
            {
              applyId: 'friend-apply',
              fromUserId: '100',
              username: '新的朋友',
              account: 'new-friend',
              gender: 1,
              address: '杭州',
              applyMsg: '你好，我是项目组的同事。',
              isDealt: 0,
              dealResult: 0
            }
          ]
        }
      if (url.pathname === '/apply/deal') {
        applyActions.push(await request.json())
        await delay(80)
        response = { code: 1, data: { isOnline: 0, conversationId: 'new-friend-chat' } }
      }
      if (url.pathname === '/apply/groupApplyList')
        response = {
          code: 1,
          data: [
            {
              id: 'group-apply',
              conversationId: 'fixture-group',
              userId: '100',
              groupName: '设计交流组',
              status: 1
            }
          ]
        }
      if (url.pathname === '/apply/groupApply/deal') {
        applyActions.push({ type: 'group' })
        await delay(80)
        response = { code: 1, data: { id: 'fixture-group', name: '设计交流组', type: 1 } }
      }
      if (url.pathname.includes('/groupDetail/'))
        response = {
          code: 1,
          data: {
            id: 'fixture-group',
            groupName: '设计交流组',
            ownerId: '100',
            memberCount: 2,
            groupDesc: '在这里交流日常设计灵感。'
          }
        }
      if (url.pathname.includes('/groupMemberList/'))
        response = {
          code: 1,
          data: [
            { userId: '100', username: '林小满', role: 2, avatar: '' },
            { userId: '101', username: '周安', role: 0, avatar: '' }
          ]
        }
      if (url.pathname === '/user/search') {
        const keyword = url.searchParams.get('number')
        if (keyword === 'slow') await delay(180)
        response =
          keyword === 'missing'
            ? { code: 0, msg: '没有找到这个账号' }
            : {
                code: 1,
                data: {
                  id: '100',
                  username: keyword === 'friend' ? '晴空' : keyword,
                  account: 'qingkong01',
                  address: '杭州',
                  avatar: '',
                  isFriend: keyword === 'friend' ? 1 : 0
                }
              }
      }
      if (url.pathname === '/apply/send') {
        applications++
        await delay(100)
        response = { code: 1, data: 'fixture-apply' }
      }
      if (url.pathname === '/moments/list/hot') {
        const page = Number(url.searchParams.get('page'))
        pages.push(page)
        await delay(hotDelay)
        response =
          failPage && page === 2
            ? { code: 0, data: null }
            : {
                code: 1,
                data: {
                  data:
                    page > 10
                      ? []
                      : Array.from({ length: 20 }, (_, index) => {
                          const id = (page - 1) * 20 + index + 1
                          return {
                            id,
                            userId: '100',
                            username: '创作伙伴 ' + id,
                            avatar: '',
                            content:
                              '<p>第 ' +
                              id +
                              ' 条动态：' +
                              '把日常灵感留在这里。'.repeat((index % 4) + 1) +
                              '</p><img src="http://fixture.test/fixture-image/' +
                              id +
                              '" width="240" height="140">',
                            publishTime: '2026-11-03T10:00:00',
                            liked: false,
                            likeCount: 0,
                            commentCount: 0,
                            rewardAmount: 0,
                            isFollowed: false
                          }
                        })
                }
              }
      }
      if (url.pathname === '/moments/list/new')
        response = {
          code: 1,
          data:
            url.searchParams.get('lastId') === '0'
              ? [
                  {
                    id: 9001,
                    userId: '100',
                    username: '最新动态',
                    avatar: '',
                    content: '<p>新的排序结果</p>',
                    publishTime: '2026-11-03T10:00:00',
                    liked: false,
                    likeCount: 0,
                    commentCount: 0,
                    rewardAmount: 0,
                    isFollowed: true
                  }
                ]
              : []
        }
      if (url.pathname.startsWith('/fixture-image/'))
        return new Response(
          '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="140"><rect width="240" height="140" fill="#d8d8df"/><path d="M0 140L90 30L170 140" fill="#898994"/></svg>',
          { headers: { 'Content-Type': 'image/svg+xml' } }
        )
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      })
    })
    const styles = process.argv.includes('--moments-only') ? [] : ['ai-native', 'swiss']
    for (const nextStyle of styles)
      for (const nextTheme of ['light', 'dark']) {
        style = nextStyle
        theme = nextTheme
        nativeTheme.themeSource = theme
        for (const win of windows) {
          win.webContents.send('fixture:style:changed', style)
          win.webContents.send('fixture:theme:changed', theme)
        }
        const label = style + '-' + theme
        await route(friend, 'friendAdd')
        await waitFor(friend, "!!document.querySelector('#friend-search')")
        assert.ok(await evaluate(friend, "document.querySelector('form button').disabled"))
        await search(friend, 'new-person')
        await waitFor(friend, "!!document.querySelector('#apply-message')")
        assert.ok(
          await evaluate(
            friend,
            "document.querySelector('.primary-action').getBoundingClientRect().bottom < innerHeight - 20"
          )
        )
        await save(friend, label + '-add-friend')
        await evaluate(
          friend,
          "document.querySelector('.primary-action').click(); document.querySelector('.primary-action').click()"
        )
        await waitFor(
          friend,
          "document.querySelector('.primary-action').textContent.includes('申请已发送')"
        )
        assert.ok(await evaluate(friend, "document.querySelector('.primary-action').disabled"))
        await search(friend, 'friend')
        await waitFor(friend, "!!document.querySelector('.friend-hint')")
        await evaluate(friend, "document.querySelector('.primary-action').click()")
        await delay(100)
        assert.equal(opened.at(-1)?.type, 'standaloneChat')
        await search(friend, 'slow')
        await search(friend, 'missing')
        await waitFor(
          friend,
          "document.querySelector('.add-state')?.textContent.includes('没有找到这个账号')"
        )
        await delay(220)
        assert.equal(await evaluate(friend, "!!document.querySelector('.found-person')"), false)
        await route(chat, 'standaloneChat')
        await waitFor(chat, "!!document.querySelector('.details-button')")
        assert.ok(
          await evaluate(
            chat,
            "document.querySelector('.chat-subtitle').textContent.includes('消息会为你保留')"
          )
        )
        await save(chat, label + '-header')
        await evaluate(chat, "document.querySelector('.details-button').click()")
        await waitFor(chat, "!!document.querySelector('.drawer-profile')")
        await delay(330)
        const drawer = await evaluate(
          chat,
          "(() => { const e = document.querySelector('.chat-details-drawer'); const s = getComputedStyle(e); return { background: s.backgroundColor, width: e.getBoundingClientRect().width, parent: e.parentElement.parentElement.tagName } })()"
        )
        assert.ok(/^rgb\(/.test(drawer.background), JSON.stringify(drawer))
        assert.equal(Math.round(drawer.width), 400)
        await save(chat, label + '-chat-details')
        await evaluate(chat, "document.querySelector('.drawer-danger button').click()")
        await waitFor(chat, "!!document.querySelector('.el-message-box')")
        await evaluate(chat, "document.querySelector('.el-message-box__btns button').click()")
        await route(chat, 'standaloneChat', { group: '1' })
        await waitFor(
          chat,
          "document.querySelector('.chat-title')?.textContent.includes('设计讨论组')"
        )
        await evaluate(chat, "document.querySelector('.details-button').click()")
        await waitFor(chat, "!!document.querySelector('.group-drawer-content')")
        assert.ok(
          await evaluate(
            chat,
            "getComputedStyle(document.querySelector('.chat-details-drawer')).backgroundColor.startsWith('rgb(')"
          )
        )
        await save(chat, label + '-group-details')
        await route(chat, 'friendApply?applyId=friend-apply')
        await waitFor(
          chat,
          "document.querySelector('.detail-heading h1')?.textContent === '新的朋友'"
        )
        assert.ok(
          await evaluate(
            chat,
            "document.querySelector('.detail-message').textContent.includes('项目组')"
          )
        )
        await save(chat, label + '-friend-application')
        await evaluate(
          chat,
          "document.querySelector('.detail-actions button').click(); document.querySelector('.detail-actions button').click()"
        )
        await waitFor(chat, "document.querySelector('.detail-status')?.textContent === '已拒绝'")
        assert.equal(
          await evaluate(chat, "document.querySelectorAll('.detail-actions button').length"),
          0
        )
        await route(chat, 'groupApply?applyId=group-apply')
        await waitFor(
          chat,
          "document.querySelector('.detail-heading h1')?.textContent === '设计交流组'"
        )
        await save(chat, label + '-group-application')
        await evaluate(
          chat,
          "document.querySelector('.detail-actions button').click(); document.querySelector('.detail-actions button').click()"
        )
        await waitFor(chat, "document.querySelector('.detail-status')?.textContent === '已拒绝'")
        await route(chat, 'groupInfo?conversationId=fixture-group')
        await waitFor(
          chat,
          "document.querySelector('.detail-message')?.textContent.includes('日常设计灵感')"
        )
        assert.ok(
          await evaluate(
            chat,
            "document.querySelector('.detail-grid')?.textContent.includes('2 人')"
          )
        )
        await save(chat, label + '-group-profile')
        await evaluate(chat, "document.querySelector('.member-section-title button').click()")
        await waitFor(chat, "document.querySelectorAll('.member-item').length === 2")
        await save(chat, label + '-group-members')
        await route(chat, 'account')
        await waitFor(
          chat,
          "document.querySelector('.account-details')?.textContent.includes('杭州')"
        )
        await save(chat, label + '-account-profile')
        await evaluate(chat, "document.querySelector('.account-info button').click()")
        await waitFor(chat, "!!document.querySelector('.profile-form-grid')")
        assert.equal(
          await evaluate(
            chat,
            "[...document.querySelectorAll('.el-dialog input')].filter(input => input.readOnly && input.value === '13800000000').length"
          ),
          1
        )
        await save(chat, label + '-account-edit')
        if (style === 'ai-native' && theme === 'light') {
          await evaluate(
            chat,
            "(() => { const values = [['你的名字', '微光伙伴'], ['选填', 'new@example.test']]; for (const [placeholder, value] of values) { const input = document.querySelector('.el-dialog input[placeholder=\"' + placeholder + '\"]'); input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })) }; const address = [...document.querySelectorAll('.el-dialog input[placeholder=选填]')][1]; address.value = '杭州 · 西湖'; address.dispatchEvent(new Event('input', { bubbles: true })) })()"
          )
          await evaluate(chat, "document.querySelector('.el-dialog .el-select__wrapper').click()")
          await waitFor(
            chat,
            "[...document.querySelectorAll('.el-select-dropdown__item')].some(item => item.textContent === '女')"
          )
          await evaluate(
            chat,
            "[...document.querySelectorAll('.el-select-dropdown__item')].find(item => item.textContent === '女').click()"
          )
          await evaluate(
            chat,
            "document.querySelectorAll('.el-dialog__footer button')[1].click(); document.querySelectorAll('.el-dialog__footer button')[1].click()"
          )
          await waitFor(
            chat,
            "!document.querySelector('.profile-form-grid')?.getClientRects().length"
          )
          await waitFor(
            chat,
            "document.querySelector('.account-info h1')?.textContent === '微光伙伴'"
          )
          assert.ok(
            profileWrites.some((field) => field.key === 'address' && field.value === '杭州 · 西湖')
          )
          assert.ok(profileWrites.some((field) => field.key === 'gender' && field.value === 0))
        } else await evaluate(chat, "document.querySelector('.el-dialog__footer button').click()")
        await route(chat, 'standaloneChat')
        await waitFor(chat, "!!document.querySelector('.red-packet-btn')")
        await evaluate(chat, "document.querySelector('.red-packet-btn').click()")
        await waitFor(chat, "!!document.querySelector('.srp-dialog')")
        const packet = await evaluate(
          chat,
          "({ background: getComputedStyle(document.querySelector('.srp-dialog')).backgroundColor, labelColor: getComputedStyle(document.querySelector('.srp-label')).color, labelBackground: getComputedStyle(document.querySelector('.srp-dialog')).backgroundColor, disabled: document.querySelector('.srp-send').disabled })"
        )
        assert.ok(packet.background.startsWith('rgb('))
        assert.ok(packet.disabled)
        await save(chat, label + '-red-packet')
        await evaluate(chat, "document.querySelector('.srp-close').click()")
        results.push(label + '：申请处理、群资料与成员、账号资料及编辑、红包弹窗通过')
        results.push(
          label + '：好友搜索、申请防重复、过期响应忽略、打开私聊、资料抽屉与清空确认通过'
        )
      }
    assert.equal(applications, styles.length * 2)
    theme = 'light'
    style = 'ai-native'
    await route(chat, 'moments')
    await waitFor(chat, "document.querySelectorAll('.post-item').length === 20")
    await delay(850)
    assert.equal(
      await evaluate(
        chat,
        "document.querySelector('.user-online-status').getAttribute('aria-label')"
      ),
      '离线'
    )
    chat.webContents.send('fixture:ws-status', 1)
    await waitFor(
      chat,
      "document.querySelector('.user-online-status')?.classList.contains('connected')"
    )
    chat.webContents.send('fixture:ws-status', 3)
    await waitFor(
      chat,
      "!document.querySelector('.user-online-status')?.classList.contains('connected')"
    )
    const lazy = await evaluate(
      chat,
      "({ total: document.querySelectorAll('.post-text-wrapper img').length, deferred: document.querySelectorAll('.post-text-wrapper img[data-src]').length, animation: getComputedStyle(document.querySelector('.post-card')).animationName, outerAnimation: getComputedStyle(document.querySelector('.post-item')).animationName })"
    )
    assert.equal(lazy.total, 20)
    assert.ok(lazy.deferred > 0 && lazy.deferred < 20, JSON.stringify(lazy))
    assert.match(lazy.animation, /^cardEnter/)
    assert.equal(lazy.outerAnimation, 'none')
    await evaluate(
      chat,
      "window.styleWrites = 0; window.styleObserver = new MutationObserver(records => { window.styleWrites += records.filter(r => r.target.matches('.post-item, .post-list')).length }); window.styleObserver.observe(document.querySelector('.post-list'), { subtree: true, attributes: true, attributeFilter: ['style'] }); document.querySelector('.post-actions .action-item').click()"
    )
    await delay(350)
    assert.equal(await evaluate(chat, 'window.styleWrites'), 0, '点赞不能重排整份瀑布流')
    await evaluate(chat, 'window.styleObserver.disconnect()')
    await save(chat, 'moments-lazy')
    const noOverlap =
      "(() => { const cards = [...document.querySelectorAll('.post-item')].map(e => e.getBoundingClientRect()); return cards.every((a, i) => cards.slice(i + 1).every(b => a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1)) })()"
    assert.ok(await evaluate(chat, noOverlap), '图片解码后卡片不能重叠')
    chat.setContentSize(930, 700)
    await delay(500)
    assert.ok(await evaluate(chat, noOverlap), '窗口缩窄后卡片不能重叠')
    failPage = true
    const bottom =
      "document.querySelector('.moments-content .el-scrollbar__wrap').scrollTop = 999999"
    await evaluate(chat, bottom)
    await waitFor(
      chat,
      "document.querySelector('.load-more-trigger')?.textContent.includes('点击重试')"
    )
    assert.deepEqual(pages, [1, 2])
    failPage = false
    await evaluate(chat, "document.querySelector('.load-more-trigger button').click()")
    await waitFor(chat, "document.querySelectorAll('.post-item').length === 40")
    assert.deepEqual(pages.slice(0, 3), [1, 2, 2], '失败重试不能跳页')
    for (let page = 3; page <= 11; page++) {
      await delay(400)
      await evaluate(chat, bottom)
      await waitFor(
        chat,
        "document.querySelectorAll('.post-item').length >= " +
          Math.min(page * 20, 150) +
          (page === 11
            ? " && document.querySelector('.no-more-status') !== null"
            : " && Number(document.querySelector('.post-item:last-child')?.dataset.postId) >= " +
              page * 20)
      )
    }
    await delay(450)
    assert.equal(await evaluate(chat, "document.querySelectorAll('.post-item').length"), 150)
    assert.ok(await evaluate(chat, noOverlap), '连续翻页和裁剪后卡片不能重叠')
    const eofCount = pages.length
    await evaluate(chat, bottom)
    await delay(250)
    assert.equal(pages.length, eofCount, '空结果后不再重复请求')
    results.push(
      '瀑布流：图片按视口懒加载、点赞无布局样式写入、缩放无重叠、失败原页重试、连续翻页限制150张卡片、空页停止请求通过'
    )
    hotDelay = 250
    await evaluate(chat, "document.querySelector('.el-select__wrapper').click()")
    await waitFor(chat, "!!document.querySelector('.el-select-dropdown__item')")
    await evaluate(
      chat,
      "[...document.querySelectorAll('.el-select-dropdown__item')].find(e => e.textContent.includes('最新')).click()"
    )
    await waitFor(chat, "document.querySelector('.post-item')?.dataset.postId === '9001'")
    await delay(350)
    assert.equal(await evaluate(chat, "document.querySelectorAll('.post-item').length"), 1)
    await save(chat, 'moments-latest')
    chat.webContents.debugger.attach('1.3')
    await chat.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
    })
    assert.equal(
      await evaluate(chat, "getComputedStyle(document.querySelector('.post-card')).animationName"),
      'none'
    )
    chat.webContents.debugger.detach()
    results.push('排序切换保持新结果，减少动态效果设置关闭入场动画')
    assert.deepEqual(
      errors.filter((message) => /TypeError|ReferenceError/.test(message)),
      []
    )
    console.log(JSON.stringify({ results, lazy, pages, output }, null, 2))
    clearTimeout(timeout)
    windows.forEach((win) => win.destroy())
    app.exit(0)
  })
  .catch((error) => {
    console.error(error, errors)
    clearTimeout(timeout)
    windows.forEach((win) => {
      if (!win.isDestroyed()) win.destroy()
    })
    app.exit(1)
  })
