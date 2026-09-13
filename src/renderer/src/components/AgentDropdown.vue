<template>
  <button
    ref="triggerRef"
    v-bind="$attrs"
    :class="['agent-dropdown-trigger', { 'is-compact': compact }]"
    type="button"
    :aria-expanded="isOpen"
    :disabled="disabled"
    @click.stop="toggleMenu"
  >
    <slot name="trigger" :open="isOpen"></slot>
  </button>

  <Teleport to="body">
    <Transition name="agent-dropdown-fade">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="agent-dropdown-menu"
        role="menu"
        :style="menuStyle"
        @click.stop
      >
        <button
          v-for="item in items"
          :key="item.value"
          :class="[
            'agent-dropdown-item',
            {
              'is-danger': item.danger,
              'is-divided': item.divided,
              'is-selected': item.value === selectedValue
            }
          ]"
          type="button"
          role="menuitem"
          :disabled="item.disabled"
          @click="selectItem(item)"
        >
          <span v-if="item.icon" class="agent-dropdown-item-icon">
            <el-icon><component :is="item.icon" /></el-icon>
          </span>
          <span class="agent-dropdown-item-copy">
            <strong>{{ item.label }}</strong>
            <small v-if="item.description">{{ item.description }}</small>
          </span>
          <span v-if="item.value === selectedValue" class="agent-dropdown-check">✓</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  type CSSProperties,
  type PropType
} from 'vue'
import type { AgentDropdownItem, AgentDropdownPlacement } from '@/types'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  items: {
    type: Array as PropType<AgentDropdownItem[]>,
    required: true
  },
  placement: {
    type: String as PropType<AgentDropdownPlacement>,
    default: 'bottom-start'
  },
  minWidth: {
    type: Number,
    default: 180
  },
  selectedValue: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits({
  select: (value: string) => typeof value === 'string'
})

const triggerRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const menuReady = ref(false)
const menuTop = ref(0)
const menuLeft = ref(0)

const menuStyle = computed<CSSProperties>(() => ({
  top: `${menuTop.value}px`,
  left: `${menuLeft.value}px`,
  minWidth: `${props.minWidth}px`,
  visibility: menuReady.value ? 'visible' : 'hidden'
}))

const updatePosition = () => {
  const trigger = triggerRef.value
  const menu = menuRef.value
  if (!trigger || !menu) return

  const gap = 7
  const viewportPadding = 10
  const triggerRect = trigger.getBoundingClientRect()
  const menuRect = menu.getBoundingClientRect()
  const isTop = props.placement.startsWith('top')
  const isEnd = props.placement.endsWith('end')

  let top = isTop ? triggerRect.top - menuRect.height - gap : triggerRect.bottom + gap
  let left = isEnd ? triggerRect.right - menuRect.width : triggerRect.left

  if (top < viewportPadding) top = triggerRect.bottom + gap
  if (top + menuRect.height > window.innerHeight - viewportPadding) {
    top = Math.max(viewportPadding, triggerRect.top - menuRect.height - gap)
  }

  left = Math.min(
    Math.max(viewportPadding, left),
    Math.max(viewportPadding, window.innerWidth - menuRect.width - viewportPadding)
  )

  menuTop.value = Math.round(top)
  menuLeft.value = Math.round(left)
  menuReady.value = true
}

const openMenu = async () => {
  if (props.disabled) return
  isOpen.value = true
  menuReady.value = false
  await nextTick()
  updatePosition()
}

const closeMenu = () => {
  isOpen.value = false
  menuReady.value = false
}

const toggleMenu = () => {
  if (isOpen.value) closeMenu()
  else void openMenu()
}

const selectItem = (item: AgentDropdownItem) => {
  if (item.disabled) return
  emit('select', item.value)
  closeMenu()
}

const handlePointerDown = (event: PointerEvent) => {
  const target = event.target as Node
  if (triggerRef.value?.contains(target) || menuRef.value?.contains(target)) return
  closeMenu()
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closeMenu()
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown)
  document.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown)
  document.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
})
</script>

<style scoped>
.agent-dropdown-trigger {
  margin: 0;
  padding: 0;
  color: inherit;
  font: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.agent-dropdown-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.agent-dropdown-trigger.is-compact {
  display: inline-flex;
  max-width: 126px;
  height: 25px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 5px;
  overflow: hidden;
  color: rgba(174, 182, 193, 0.68);
  font-family: 'Segoe UI Variable Text', 'Microsoft YaHei UI', sans-serif;
  font-size: 9px !important;
  font-weight: 300 !important;
  line-height: 1 !important;
  letter-spacing: 0 !important;
  border: 1px solid transparent;
  border-radius: 6px;
}

.agent-dropdown-trigger.is-compact > span:not(.branch-dot):not(.mode-indicator) {
  overflow: hidden;
  font-size: inherit !important;
  font-weight: inherit !important;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.agent-dropdown-trigger.is-compact > .el-icon {
  width: 8px;
  flex: 0 0 auto;
  font-size: 8px !important;
}

.agent-dropdown-trigger.is-compact:hover,
.agent-dropdown-trigger.is-compact[aria-expanded='true'] {
  color: rgba(205, 212, 221, 0.82);
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

.agent-dropdown-menu {
  position: fixed;
  z-index: 4200;
  display: flex;
  max-width: min(320px, calc(100vw - 20px));
  padding: 6px;
  flex-direction: column;
  background: rgba(47, 58, 72, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 11px;
  box-shadow: 0 18px 46px rgba(7, 12, 18, 0.38), inset 0 1px rgba(255, 255, 255, 0.035);
  backdrop-filter: blur(22px);
}

.agent-dropdown-item {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 34px;
  align-items: center;
  gap: 9px;
  padding: 7px 9px;
  color: rgba(239, 244, 250, 0.82);
  font: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.agent-dropdown-item:hover,
.agent-dropdown-item.is-selected {
  color: rgba(250, 252, 255, 0.98);
  background: rgba(255, 255, 255, 0.075);
}

.agent-dropdown-item.is-divided {
  margin-top: 5px;
}

.agent-dropdown-item.is-divided::before {
  position: absolute;
  right: 4px;
  bottom: calc(100% + 2px);
  left: 4px;
  height: 1px;
  background: rgba(255, 255, 255, 0.09);
  content: '';
}

.agent-dropdown-item.is-danger {
  color: rgba(255, 152, 152, 0.9);
}

.agent-dropdown-item.is-danger:hover {
  color: #ffb1b1;
  background: rgba(255, 92, 92, 0.1);
}

.agent-dropdown-item:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.agent-dropdown-item-icon {
  display: grid;
  width: 20px;
  flex: 0 0 auto;
  place-items: center;
  color: rgba(111, 228, 239, 0.78);
  font-size: 14px;
}

.agent-dropdown-item-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.agent-dropdown-item-copy strong {
  overflow: hidden;
  font-size: 11px;
  font-weight: 560;
  line-height: 1.55;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.agent-dropdown-item-copy small {
  margin-top: 1px;
  overflow: hidden;
  color: rgba(204, 214, 226, 0.46);
  font-size: 9px;
  line-height: 1.45;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.agent-dropdown-check {
  flex: 0 0 auto;
  color: #6fe4ef;
  font-size: 11px;
}

.agent-dropdown-fade-enter-active,
.agent-dropdown-fade-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
  transform-origin: center top;
}

.agent-dropdown-fade-enter-from,
.agent-dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-3px) scale(0.985);
}
</style>
