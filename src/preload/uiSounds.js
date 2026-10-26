const SOUNDS = {
  hover: ['menu_hover.mp3', 0.045],
  click: ['menu_click.mp3', 0.14],
  select: ['item_pick.mp3', 0.12],
  delete: ['item_delete.mp3', 0.10],
  capture: ['snapshot_capture.mp3', 0.18]
}

const CONTROLS = 'button, a[href], summary, select, label, input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], [role="button"], [role="menuitem"], [role="tab"], [role="option"], [role="switch"], [role="checkbox"], [role="radio"], [data-ui-sound]'

function findControl(target) {
  if (!(target instanceof Element) || target.closest('[inert], [disabled], [aria-disabled="true"], .is-disabled, [data-ui-sound="off"]')) return null
  let control = target.closest(CONTROLS)
  if (control?.matches('label')) {
    if (!control.control?.matches('input[type="checkbox"], input[type="radio"]') || control.control.disabled) return null
  } else if (control?.matches('input[type="checkbox"], input[type="radio"]')) {
    control = control.closest('label') || control
  }
  if (control) return control

  // 历史页面中用 div/span 实现的操作入口也复用同一套反馈。
  for (let element = target; element && element !== document.body; element = element.parentElement) {
    if (/(?:^|,)\s*pointer\s*$/.test(getComputedStyle(element).cursor)) control = element
    else if (control) break
  }
  return control
}

function soundFor(control) {
  const explicit = control.dataset.uiSound
  if (explicit && Object.hasOwn(SOUNDS, explicit)) return explicit
  if (control.matches('.el-button--danger, [data-danger="true"]')) return 'delete'
  if (control.matches('select, input[type="checkbox"], input[type="radio"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"], [role="option"], .theme-options button, .bill-tab, .preset-btn') || control.matches('label')) return 'select'
  return 'click'
}

export function installUiSounds() {
  const players = new Map(Object.entries(SOUNDS).map(([kind, [file, volume]]) => {
    const player = new Audio(new URL(`./audios/sfx/${file}`, document.baseURI).href)
    player.preload = 'auto'
    player.volume = volume
    player.load()
    return [kind, player]
  }))
  let active = null
  let armed = false
  let hoverTarget = null
  let hoverTimer = null
  let lastPlayedAt = -Infinity
  let lastActionAt = -Infinity
  let lastPointerControl = null
  let lastPointerAt = -Infinity

  const cancelHover = () => {
    clearTimeout(hoverTimer)
    hoverTimer = null
    hoverTarget = null
  }
  const play = kind => {
    const now = performance.now()
    if (kind === 'hover' ? now - lastPlayedAt < 140 || now - lastActionAt < 220 : now - lastActionAt < 45) return
    lastPlayedAt = now
    if (kind !== 'hover') lastActionAt = now
    // 任意时刻最多一条界面音效，点击会立即替换悬停声。
    try {
      if (active) active.pause()
      active = players.get(kind)
      active.currentTime = 0
      active.play().catch(() => {})
    } catch {
      // 音频设备不可用或播放被阻止时，不影响按钮行为。
    }
  }
  const onPress = event => {
    if (!event.isTrusted || event.button !== 0) return
    cancelHover()
    const control = findControl(event.target)
    if (!control) return
    armed = true
    lastPointerControl = control
    lastPointerAt = performance.now()
    play(soundFor(control))
  }
  const onClick = event => {
    // 键盘/辅助技术生成的原生 click 没有指针按下事件。
    if (!event.isTrusted || event.detail !== 0) return
    const control = findControl(event.target)
    if (!control) return
    if (control === lastPointerControl && event.target === control.control && performance.now() - lastPointerAt < 1000) return
    cancelHover()
    armed = true
    play(soundFor(control))
  }
  const onHover = event => {
    if (!armed || !event.isTrusted || event.pointerType !== 'mouse') return
    const control = findControl(event.target)
    if (!control || control === hoverTarget) return
    cancelHover()
    hoverTarget = control
    hoverTimer = setTimeout(() => {
      if (control.isConnected && findControl(control) === control) play('hover')
    }, 70)
  }
  const onOut = event => {
    if (hoverTarget && (!(event.relatedTarget instanceof Node) || !hoverTarget.contains(event.relatedTarget))) cancelHover()
  }
  const dispose = () => {
    cancelHover()
    document.removeEventListener('pointerdown', onPress, true)
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('pointerover', onHover, true)
    document.removeEventListener('pointerout', onOut, true)
    window.removeEventListener('blur', cancelHover)
    window.removeEventListener('pagehide', dispose)
    for (const player of players.values()) {
      player.pause()
      player.removeAttribute('src')
      player.load()
    }
  }
  document.addEventListener('pointerdown', onPress, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('pointerover', onHover, true)
  document.addEventListener('pointerout', onOut, true)
  window.addEventListener('blur', cancelHover)
  window.addEventListener('pagehide', dispose, { once: true })
  return dispose
}
