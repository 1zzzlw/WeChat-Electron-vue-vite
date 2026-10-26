<template>
  <Teleport to="body">
    <Transition name="agent-dialog-fade">
      <div v-if="modelValue" class="agent-dialog-mask" role="presentation" @mousedown.self="handleCancel">
        <section
          class="agent-action-dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          @mousedown.stop
        >
          <header class="agent-dialog-header">
            <div>
              <span class="agent-dialog-kicker">IM AGENT</span>
              <h2 :id="titleId">{{ title }}</h2>
            </div>
            <button type="button" aria-label="关闭对话框" @click="handleCancel">
              <el-icon><Close /></el-icon>
            </button>
          </header>

          <div class="agent-dialog-body">
            <p>{{ description }}</p>
            <input
              v-if="mode === 'prompt'"
              ref="inputRef"
              v-model="inputValue"
              type="text"
              :placeholder="placeholder"
              maxlength="40"
              @keydown.enter.prevent="handleConfirm"
            />
            <p v-if="mode === 'prompt'" class="agent-dialog-tip">最多 40 个字符</p>
          </div>

          <footer class="agent-dialog-footer">
            <button class="agent-dialog-cancel" type="button" @click="handleCancel">取消</button>
            <button
              :class="['agent-dialog-confirm', { 'is-danger': danger }]"
              type="button"
              :disabled="mode === 'prompt' && !inputValue.trim()"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue'
import { Close } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  mode: {
    type: String as PropType<'confirm' | 'prompt'>,
    default: 'confirm'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: '确定'
  },
  initialValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  danger: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits({
  'update:modelValue': (value: boolean) => typeof value === 'boolean',
  confirm: (value: string) => typeof value === 'string',
  cancel: () => true
})

const titleId = `agent-dialog-title-${Math.random().toString(36).slice(2, 8)}`
const inputRef = ref<HTMLInputElement | null>(null)
const inputValue = ref('')

watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    inputValue.value = props.initialValue
    await nextTick()
    inputRef.value?.focus()
    inputRef.value?.select()
  }
)

const closeDialog = () => {
  emit('update:modelValue', false)
}

const handleCancel = () => {
  closeDialog()
  emit('cancel')
}

const handleConfirm = () => {
  if (props.mode === 'prompt' && !inputValue.value.trim()) return
  emit('confirm', inputValue.value.trim())
  closeDialog()
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (props.modelValue && event.key === 'Escape') handleCancel()
}

onMounted(() => document.addEventListener('keydown', handleKeyDown))
onBeforeUnmount(() => document.removeEventListener('keydown', handleKeyDown))
</script>

<style scoped>
.agent-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 4300;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(var(--color-surface-rgb), 0.55);
  backdrop-filter: blur(7px);
}

.agent-action-dialog {
  box-sizing: border-box;
  width: min(430px, calc(100vw - 40px));
  overflow: hidden;
  color: var(--color-text-primary);
  background: var(--color-bg-deep);
  border: 1px solid var(--color-border-subtle);
  border-radius: 14px;
  box-shadow: 0 28px 80px rgba(4, 8, 13, 0.48), inset 0 1px rgba(255, 255, 255, 0.035);
}

.agent-dialog-header {
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 13px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.agent-dialog-kicker {
  color: rgba(111, 228, 239, 0.56);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.agent-dialog-header h2 {
  margin-top: 3px;
  font-size: 16px;
  font-weight: 620;
  letter-spacing: -0.01em;
}

.agent-dialog-header button {
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  color: var(--color-text-muted);
  font-size: 14px;
  background: transparent;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
}

.agent-dialog-header button:hover {
  color: var(--color-text-primary);
  background: rgba(var(--color-surface-rgb), 0.4);
}

.agent-dialog-body {
  padding: 18px;
}

.agent-dialog-body > p:first-child {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.65;
}

.agent-dialog-body input {
  box-sizing: border-box;
  width: 100%;
  height: 39px;
  margin-top: 14px;
  padding: 0 11px;
  color: var(--color-text-primary);
  font: inherit;
  font-size: 12px;
  background: rgba(var(--color-surface-rgb), 0.58);
  border: 1px solid var(--color-border-subtle);
  border-radius: 8px;
  outline: 0;
  user-select: text;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
}

.agent-dialog-body input:focus {
  background: rgba(var(--color-surface-rgb), 0.72);
  border-color: rgba(111, 228, 239, 0.36);
  box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb), 0.055);
}

.agent-dialog-body input::placeholder {
  color: var(--color-text-muted);
}

.agent-dialog-tip {
  margin-top: 6px;
  color: var(--color-text-muted);
  font-size: 8px;
}

.agent-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 13px 18px 16px;
  border-top: 1px solid var(--color-border-subtle);
}

.agent-dialog-footer button {
  height: 32px;
  padding: 0 14px;
  font: inherit;
  font-size: 10px;
  border-radius: 7px;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.agent-dialog-cancel {
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border-subtle);
}

.agent-dialog-cancel:hover {
  color: var(--color-text-primary);
  background: rgba(var(--color-surface-rgb), 0.4);
}

.agent-dialog-confirm {
  color: #142128;
  background: rgba(111, 228, 239, 0.88);
  border: 1px solid transparent;
}

.agent-dialog-confirm:hover {
  background: #7ceaf4;
}

.agent-dialog-confirm.is-danger {
  color: var(--color-text-primary);
  background: rgba(218, 82, 82, 0.82);
}

.agent-dialog-confirm.is-danger:hover {
  background: rgba(232, 92, 92, 0.94);
}

.agent-dialog-confirm:disabled {
  color: var(--color-text-muted);
  background: rgba(var(--color-surface-rgb), 0.4);
  cursor: default;
}

.agent-dialog-fade-enter-active,
.agent-dialog-fade-leave-active {
  transition: opacity 0.16s ease;
}

.agent-dialog-fade-enter-active .agent-action-dialog,
.agent-dialog-fade-leave-active .agent-action-dialog {
  transition: transform 0.16s ease, opacity 0.16s ease;
}

.agent-dialog-fade-enter-from,
.agent-dialog-fade-leave-to {
  opacity: 0;
}

.agent-dialog-fade-enter-from .agent-action-dialog,
.agent-dialog-fade-leave-to .agent-action-dialog {
  opacity: 0;
  transform: translateY(6px) scale(0.985);
}
</style>
