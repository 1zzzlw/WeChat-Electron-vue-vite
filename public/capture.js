const source = document.querySelector('.source')
const mask = document.querySelector('.mask')
const selection = document.querySelector('.selection')
const size = document.querySelector('.size')
const tool = document.querySelector('.tool')
const hint = document.querySelector('.hint')
const confirmButton = document.querySelector('.confirm-btn')
let ready = false
let saving = false
let start = null
let rect = null
let frame = 0
let previewUrl = null
let originalSize = null

window.chatToolApi.getCapturePngBuffer('window:get-capture-pngBuffer', ({ pngBuffer, imageSize }) => {
  originalSize = imageSize
  previewUrl = URL.createObjectURL(new Blob([pngBuffer], { type: 'image/png' }))
  source.onload = () => {
    ready = true
    hint.textContent = '拖动选择区域 · Enter 完成 · Esc / 右键取消'
    window.chatToolApi.captureReady()
    URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
  source.onerror = () => window.chatToolApi.captureError()
  source.src = previewUrl
})

function point(event) {
  return { x: Math.max(0, Math.min(innerWidth, event.clientX)),
    y: Math.max(0, Math.min(innerHeight, event.clientY)) }
}

function updateRect(event) {
  const end = point(event)
  rect = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) }
}

function paint() {
  frame = 0
  const valid = rect && rect.width >= 1 && rect.height >= 1
  selection.hidden = !valid
  size.hidden = !valid
  mask.hidden = !!valid
  if (!valid) return
  Object.assign(selection.style, { left: rect.x + 'px', top: rect.y + 'px',
    width: rect.width + 'px', height: rect.height + 'px' })
  size.textContent = Math.round(rect.width * originalSize.width / innerWidth) + ' × ' + Math.round(rect.height * originalSize.height / innerHeight)
  size.style.left = Math.min(rect.x, Math.max(0, innerWidth - 160)) + 'px'
  size.style.top = Math.max(0, rect.y - 36) + 'px'
}

document.addEventListener('pointerdown', event => {
  if (!ready || saving || event.button !== 0 || tool.contains(event.target)) return
  start = point(event)
  rect = null
  tool.hidden = true
  paint()
  document.body.setPointerCapture(event.pointerId)
})
document.addEventListener('pointermove', event => {
  if (!start) return
  updateRect(event)
  if (!frame) frame = requestAnimationFrame(paint)
})
document.addEventListener('pointerup', event => {
  if (!start) return
  updateRect(event)
  start = null
  if (frame) cancelAnimationFrame(frame)
  paint()
  if (document.body.hasPointerCapture(event.pointerId)) document.body.releasePointerCapture(event.pointerId)
  if (!rect || rect.width < 1 || rect.height < 1) return
  tool.hidden = false
  tool.style.left = Math.max(8, Math.min(rect.x + rect.width - tool.offsetWidth, innerWidth - tool.offsetWidth - 8)) + 'px'
  const below = rect.y + rect.height + 8
  tool.style.top = Math.max(8, below + tool.offsetHeight < innerHeight ? below : Math.min(innerHeight - tool.offsetHeight - 8, rect.y + rect.height - tool.offsetHeight - 8)) + 'px'
})
document.addEventListener('pointercancel', () => { start = null })

async function save() {
  if (!ready || saving || start || !rect || rect.width < 1 || rect.height < 1) return
  saving = true
  confirmButton.disabled = true
  hint.textContent = '正在保存截图…'
  try {
    const result = await window.chatToolApi.saveCapture({ ...rect, viewportWidth: innerWidth, viewportHeight: innerHeight })
    if (!result.ok && !result.canceled) {
      hint.textContent = result.error || '保存失败，请取消后重试'
      saving = false
      confirmButton.disabled = false
    }
  } catch (error) {
    hint.textContent = '保存失败，请重试或按 Esc 取消'
    saving = false
    confirmButton.disabled = false
  }
}
confirmButton.addEventListener('click', save)
document.querySelector('.cancel-btn').addEventListener('click', () => window.chatToolApi.closeCapture())
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') window.chatToolApi.closeCapture()
  if (event.key === 'Enter') { event.preventDefault(); save() }
})
document.addEventListener('contextmenu', event => { event.preventDefault(); window.chatToolApi.closeCapture() })
window.addEventListener('pagehide', () => {
  if (frame) cancelAnimationFrame(frame)
  if (previewUrl) URL.revokeObjectURL(previewUrl)
})
