// 真实 Chromium 合成麦克风、Vue 页面及 IPC；网络和数据库均为隔离夹具。
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const root = path.join(__dirname, '..')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
app.commandLine.appendSwitch('use-fake-device-for-media-stream')
app.commandLine.appendSwitch('use-fake-ui-for-media-stream')
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
const run = fs.mkdtemp(path.join(os.tmpdir(), 'im-voice-electron-'))
const timer = setTimeout(() => { console.error('语音页面测试超时'); app.exit(1) }, 60000)
let win
const errors = []
const sent = []
const saved = []
const rest = []
let voiceFile
let failUpload = false

app.whenReady().then(async () => {
    const output = await run
    app.setPath('userData', output)
    const source = await fs.readFile(path.join(root, 'src/main/File/voiceRecording.js'), 'utf8')
    const { saveVoiceRecording } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
    let theme = 'light'
    ipcMain.on('fixture:theme:initial', event => { event.returnValue = theme })
    ipcMain.handle('fixture:theme:get', () => theme)
    ipcMain.handle('fixture:theme:set', (_event, value) => { theme = value; nativeTheme.themeSource = value; return value })
    ipcMain.handle('fixture:voice-save', async (_event, recording) => {
        voiceFile = await saveVoiceRecording(recording, path.join(output, 'voice'))
        return voiceFile
    })
    ipcMain.handle('fixture:voice-persist', (_event, message) => { saved.push(message) })
    ipcMain.handle('fixture:voice-upload', (event, file) => {
        assert.equal(file.fileType, 4)
        // 故意先完成上传，再返回元信息及 REST 响应，验证短录音竞态。
        event.sender.send('upload-loadStatus', { fileId: file.fileId, status: failUpload ? 2 : 1 })
        return { minioFilePath: 'fixture/voice.webm', chunkCount: 1 }
    })
    ipcMain.on('fixture:voice-ws', (event, type, message) => {
        sent.push({ type, message })
        event.sender.send('fixture:voice-frame', 16, { status: 0, tempId: message.id, messageId: message.id })
    })
    win = new BrowserWindow({ width: 960, height: 880, show: false, useContentSize: true,
        webPreferences: { preload: path.join(__dirname, 'fixtures/desktopPreload.cjs'),
            partition: 'voice-fixture', offscreen: true, backgroundThrottling: false, webSecurity: false } })
    win.webContents.setAudioMuted(true)
    win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message) })
    win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(true))
    await win.webContents.session.protocol.handle('http', async request => {
        if (request.url.startsWith('http://voice.fixture/')) {
            return new Response(await fs.readFile(voiceFile.localPath), { headers: { 'Content-Type': 'audio/webm' } })
        }
        if (request.url.includes('/message/send')) {
            const message = await request.json()
            assert.equal(sent.length, rest.length, 'REST 预存完成前不能发送 WS')
            rest.push(message)
            await delay(80)
            return new Response(JSON.stringify({ code: 1, data: { ...message, remoteUrl: 'http://voice.fixture/audio.webm' } }), { headers: { 'Content-Type': 'application/json' } })
        }
        return new Response(JSON.stringify({ code: 1, data: [] }), { headers: { 'Content-Type': 'application/json' } })
    })
    const js = code => win.webContents.executeJavaScript(code, true)
    const wait = async code => {
        for (let i = 0; i < 100; i++) { if (await js(code)) return; await delay(50) }
        throw new Error('页面状态等待超时: ' + code + '\n' + await js('document.body.innerText'))
    }
    const capture = async name => {
        await js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        await fs.writeFile(path.join(output, name), (await win.webContents.capturePage()).toPNG())
    }
    await win.loadFile(path.join(root, 'out/renderer/index.html'), { hash: '/standaloneChat' })
    await wait('!!document.querySelector(\'button[title="发送语音"]\')')
    await js(`window.voiceStreams = []; window.voiceGum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async options => { const stream = await voiceGum(options); voiceStreams.push(stream); return stream };
        const input = document.querySelector('textarea'); input.value = '这段文字保留，稍后再发'; input.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('button[title="发送语音"]').click()`)
    await wait('!!document.querySelector(".voice-orb.is-recording")')
    await delay(1800)
    assert.equal(await js('voiceStreams[0].getAudioTracks()[0].readyState'), 'live')
    assert.equal(await js('document.querySelectorAll(".voice-meter i").length'), 20)
    await capture('voice-recording-light.png')
    await js("[...document.querySelectorAll('.voice-panel button')].find(button => button.textContent.includes('结束录音')).click()")
    await wait('!!document.querySelector(".voice-preview")')
    assert.equal(await js('voiceStreams[0].getAudioTracks()[0].readyState'), 'ended')
    await js('document.querySelector(".voice-preview .audio-toggle").click()')
    await wait('!document.querySelector(".voice-preview audio").paused')
    await js('document.querySelector(".voice-preview .audio-toggle").click()')
    await capture('voice-preview-light.png')
    await js(`const send = document.querySelector('.voice-panel .el-button--primary'); send.click(); send.click()`)
    await wait('!document.querySelector(".voice-panel") && !!document.querySelector(".chat-audio.is-mine")')
    assert.equal(rest.length, 1)
    assert.equal(sent.length, 1)
    assert.equal(rest[0].id, sent[0].message.id)
    assert.equal(typeof sent[0].message.id, 'string')
    assert.equal(sent[0].message.msgType, 4)
    assert.equal(sent[0].message.remotePath, 'fixture/voice.webm')
    assert.equal(sent[0].type, 1)
    assert.ok(saved.some(message => message.id === rest[0].id))
    assert.equal(await js('document.querySelector("textarea").value'), '这段文字保留，稍后再发')
    win.webContents.send('fixture:voice-frame', 2, { ...sent[0].message, id: '7520640156303511552', senderId: 'fixture-friend', localPath: '', sendStatus: 1 })
    await wait('document.querySelectorAll(".chat-audio").length === 2')
    await js('document.querySelector(".chat-audio.is-mine .audio-toggle").click()')
    await wait('!document.querySelector(".chat-audio.is-mine audio").paused')
    await js('document.querySelector(".chat-audio:not(.is-mine) .audio-toggle").click()')
    await wait('!document.querySelector(".chat-audio:not(.is-mine) audio").paused')
    assert.equal(await js('document.querySelector(".chat-audio.is-mine audio").paused'), true)
    await capture('voice-messages-light.png')
    await js('document.querySelector(".chat-audio:not(.is-mine) audio").pause(); document.documentElement.dataset.theme = "dark"')
    await capture('voice-messages-dark.png')

    await js('document.querySelector(\'button[title="发送语音"]\').click()')
    await wait('!!document.querySelector(".voice-orb.is-recording")')
    await js('document.querySelector(\'button[aria-label="关闭录音"]\').click()')
    await wait('!document.querySelector(".voice-panel")')
    assert.equal(await js('voiceStreams.at(-1).getAudioTracks()[0].readyState'), 'ended')
    assert.equal(sent.length, 1)
    // 用可控合成音源验证真实 Analyser 音量变化会驱动麦克风大小和光圈。
    await js(`window.toneContext = new AudioContext(); window.toneGain = toneContext.createGain();
        const oscillator = toneContext.createOscillator(); window.toneOutput = toneContext.createMediaStreamDestination();
        oscillator.connect(toneGain); toneGain.connect(toneOutput); toneGain.gain.value = .001; oscillator.start();
        navigator.mediaDevices.getUserMedia = async () => toneOutput.stream;
        document.querySelector('button[title="发送语音"]').click()`)
    await wait('!!document.querySelector(".voice-orb.is-recording")')
    await delay(200)
    const quiet = await js('Number(document.querySelector(".voice-panel").style.getPropertyValue("--voice-level"))')
    await js('toneGain.gain.value = .3')
    await delay(300)
    const loud = await js('Number(document.querySelector(".voice-panel").style.getPropertyValue("--voice-level"))')
    assert.ok(loud > quiet + .15, `音量动画没有响应: ${quiet} -> ${loud}`)
    win.setContentSize(480, 700)
    await delay(100)
    assert.equal(await js(`(() => { const rect = document.querySelector('.voice-panel').getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight })()`), true)
    await capture('voice-recording-dark.png')
    await js('document.querySelector(\'button[aria-label="关闭录音"]\').click(); toneContext.close()')
    win.setContentSize(960, 880)
    failUpload = true
    await js('navigator.mediaDevices.getUserMedia = voiceGum; document.querySelector(\'button[title="发送语音"]\').click()')
    await wait('!!document.querySelector(".voice-orb.is-recording")')
    await delay(1200)
    await js("[...document.querySelectorAll('.voice-panel button')].find(button => button.textContent.includes('结束录音')).click()")
    await wait('!!document.querySelector(".voice-preview")')
    await js('document.querySelector(".voice-panel .el-button--primary").click()')
    await wait('!!document.querySelector(".send-failed") && !document.querySelector(".voice-panel")')
    assert.equal(sent.length, 1)
    assert.equal(rest.length, 2)
    assert.equal(await js('document.querySelectorAll(".send-load").length'), 0)
    await js('navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("denied", "NotAllowedError")); document.querySelector(\'button[title="发送语音"]\').click()')
    await wait('document.body.innerText.includes("麦克风权限未开启")')
    await capture('voice-permission-dark.png')
    await js('document.querySelector(\'button[aria-label="关闭录音"]\').click()')
    await js(`(async () => { window.lateStream = await voiceGum({ audio: true }); navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { window.resolveVoice = resolve }); document.querySelector('button[title="发送语音"]').click() })()`)
    await wait('!!window.resolveVoice')
    await js('document.querySelector(\'button[aria-label="关闭录音"]\').click(); resolveVoice(lateStream)')
    await delay(100)
    assert.equal(await js('lateStream.getAudioTracks()[0].readyState'), 'ended')
    assert.deepEqual(errors.filter(message => /TypeError|ReferenceError|录音|语音/.test(message)), [])
    console.log(JSON.stringify({ passed: ['真实 MediaRecorder 录制/试听/取消释放', '双击只发送一次，文字草稿保留', '上传先完成仍等待 REST，同 ID 经文件 WS 发送', '双方气泡/播放互斥/浅深主题', '麦克风随真实输入音量变化，480px 宽度不溢出', '上传失败有提示且不投递 WS', '权限拒绝与迟到授权释放'], output }, null, 2))
    clearTimeout(timer)
    win.destroy()
    app.exit(0)
}).catch(error => { console.error(error, errors); clearTimeout(timer); win?.destroy(); app.exit(1) })
