const canvas = document.querySelector('canvas')
const context = canvas.getContext('2d')
const motion = matchMedia('(prefers-reduced-motion: reduce)')
const button = document.querySelector('.continue')
let frame = 0
let complete = false
let failed = false
let width = 360
let height = 240

function resize() {
  const bounds = canvas.getBoundingClientRect()
  width = bounds.width
  height = bounds.height
  const ratio = Math.min(devicePixelRatio || 1, 2)
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
}

// 延续原有 I → M 四笔的逐笔填充，完成后仍保留 IM 字形。
const strokes = [
  [[-108, 64], [-80, -64]],
  [[-37, 64], [-10, -64]],
  [[-10, -64], [22, 64]],
  [[22, 64], [56, -64]],
  [[56, -64], [91, 64]]
]
const startedAt = performance.now()
function draw(time) {
  frame = 0
  const t = (time - startedAt) / 1000
  context.clearRect(0, 0, width, height)
  const cx = width / 2
  const cy = height / 2
  const glow = context.createRadialGradient(cx, cy, 10, cx, cy, 140)
  glow.addColorStop(0, '#86c9f333')
  glow.addColorStop(1, '#86c9f300')
  context.fillStyle = glow
  context.fillRect(0, 0, width, height)
  context.save()
  context.translate(cx, cy)
  context.scale(Math.min(1, width / 300), 1)
  context.lineWidth = 13
  context.lineCap = 'round'
  const gradient = context.createLinearGradient(0, -64, 0, 64)
  gradient.addColorStop(0, failed ? '#e5b690' : '#a4d8f7')
  gradient.addColorStop(1, failed ? '#c28b66' : '#5b9ed9')
  for (let index = 0; index < strokes.length; index++) {
    const [start, end] = strokes[index]
    context.beginPath()
    context.moveTo(...start)
    context.lineTo(...end)
    context.strokeStyle = '#70a7cf18'
    context.stroke()
    const progress = motion.matches ? 1 : Math.min(1, Math.max(0, (t - index * 1.5) / 1.5))
    if (!progress) continue
    context.beginPath()
    context.moveTo(...start)
    context.lineTo(start[0] + (end[0] - start[0]) * progress, start[1] + (end[1] - start[1]) * progress)
    context.strokeStyle = gradient
    context.shadowColor = '#73b8e488'
    context.shadowBlur = complete || motion.matches ? 8 : 10 + Math.sin(t * 2) * 4
    context.stroke()
    context.shadowBlur = 0
  }
  context.restore()
  if (!document.hidden && !motion.matches && !(complete && t >= 7.5)) frame = requestAnimationFrame(draw)
}

function restart() {
  if (frame) cancelAnimationFrame(frame)
  if (!document.hidden) { resize(); draw(performance.now()) }
}
window.addEventListener('resize', restart)
document.addEventListener('visibilitychange', restart)
motion.addEventListener('change', restart)
button.addEventListener('click', () => {
  button.disabled = true
  window.loadApi.loadFinish()
})
const removeListener = window.loadApi.dataInitSuccessAndSkip(result => {
  complete = true
  failed = result?.ok === false
  document.querySelector('h1').textContent = failed ? '暂时未能完成同步' : '一切就绪，开始对话'
  document.querySelector('.description').textContent = failed ? '网络暂不可用，你可以先进入聊天，稍后重试同步。' : '会话与联系人已同步完成'
  document.querySelector('.working').hidden = true
  button.hidden = false
  restart()
})
window.addEventListener('pagehide', () => {
  if (frame) cancelAnimationFrame(frame)
  removeListener()
})
restart()
