<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="srp-overlay" @click.self="$emit('update:visible', false)">
        <div class="srp-dialog" role="dialog" aria-modal="true" aria-labelledby="red-packet-title">
          <!-- 顶部红色装饰 -->
          <div class="srp-top-bar">
            <div class="srp-top-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                <rect
                  x="2"
                  y="4"
                  width="20"
                  height="16"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <path d="M2 11h20" stroke="currentColor" stroke-width="1.5" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity="0.9" />
                <circle cx="12" cy="12" r="1.2" fill="var(--color-bg-deep)" />
              </svg>
            </div>
            <span id="red-packet-title" class="srp-top-title">发红包</span>
            <button
              class="srp-close"
              aria-label="关闭发红包"
              @click="$emit('update:visible', false)"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                stroke="currentColor"
                stroke-width="2.5"
                fill="none"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- 类型切换 -->
          <div class="srp-type-tabs">
            <button
              class="srp-type-tab"
              :aria-pressed="form.type === 0"
              :class="{ active: form.type === 0 }"
              @click="form.type = 0"
            >
              拼手气红包
            </button>
            <button
              class="srp-type-tab"
              :class="{ active: form.type === 1 }"
              @click="form.type = 1"
            >
              普通红包
            </button>
          </div>

          <div class="srp-body">
            <!-- 拼手气：总金额 + 个数 -->
            <template v-if="form.type === 0">
              <div class="srp-field">
                <label class="srp-label">红包总金额</label>
                <div class="srp-input-wrap">
                  <span class="srp-prefix">¥</span>
                  <input
                    type="number"
                    v-model="form.totalAmount"
                    class="srp-input"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>
              <div class="srp-field">
                <label class="srp-label">红包个数</label>
                <div class="srp-input-wrap">
                  <input
                    type="number"
                    v-model="form.count"
                    class="srp-input"
                    placeholder="1"
                    min="1"
                    max="100"
                    step="1"
                  />
                  <span class="srp-suffix">个</span>
                </div>
              </div>
              <div class="srp-hint" v-if="form.totalAmount > 0 && form.count > 0">
                共 <strong>{{ form.count }}</strong> 个红包，总额
                <strong>¥{{ Number(form.totalAmount).toFixed(2) }}</strong
                >，随机分配
              </div>
            </template>

            <!-- 普通：单个金额 + 个数 -->
            <template v-else>
              <div class="srp-field">
                <label class="srp-label">单个金额</label>
                <div class="srp-input-wrap">
                  <span class="srp-prefix">¥</span>
                  <input
                    type="number"
                    v-model="form.singleAmount"
                    class="srp-input"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>
              <div class="srp-field">
                <label class="srp-label">红包个数</label>
                <div class="srp-input-wrap">
                  <input
                    type="number"
                    v-model="form.count"
                    class="srp-input"
                    placeholder="1"
                    min="1"
                    max="100"
                    step="1"
                  />
                  <span class="srp-suffix">个</span>
                </div>
              </div>
              <div class="srp-hint" v-if="form.singleAmount > 0 && form.count > 0">
                共 <strong>{{ form.count }}</strong> 个，总额
                <strong>¥{{ (form.singleAmount * form.count).toFixed(2) }}</strong
                >，每人均等
              </div>
            </template>

            <!-- 祝福语 -->
            <div class="srp-field">
              <label class="srp-label">祝福语</label>
              <input
                type="text"
                v-model="form.blessing"
                class="srp-input-text"
                maxlength="30"
                placeholder="恭喜发财，大吉大利"
              />
            </div>
          </div>

          <div class="srp-footer">
            <button class="srp-cancel" @click="$emit('update:visible', false)">取消</button>
            <button class="srp-send" :disabled="!canSend" @click="handleSend">塞钱进红包</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  send: [data: { amount: number; count: number; blessing: string; type: number }]
}>()

const form = reactive({
  type: 0, // 0=拼手气 1=普通
  totalAmount: 0, // 拼手气用
  singleAmount: 0, // 普通用
  count: 1,
  blessing: ''
})

const canSend = computed(() => {
  if (form.count < 1 || form.count > 100) return false
  if (form.type === 0) return form.totalAmount > 0
  return form.singleAmount > 0
})

const handleSend = () => {
  if (form.count < 1 || form.count > 100) {
    ElMessage.warning('红包个数为 1-100 个')
    return
  }
  // amount 统一用「总金额的分」传出去，type 字段让 ChatBase 传给后端
  const totalYuan =
    form.type === 0 ? Number(form.totalAmount) : Number(form.singleAmount) * form.count

  if (totalYuan <= 0) {
    ElMessage.warning('请输入正确的金额')
    return
  }
  emit('send', {
    amount: Math.round(totalYuan * 100), // 分
    count: form.count,
    blessing: form.blessing || '恭喜发财，大吉大利',
    type: form.type
  })
  emit('update:visible', false)
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      form.type = 0
      form.totalAmount = 0
      form.singleAmount = 0
      form.count = 1
      form.blessing = ''
    }
  }
)
</script>

<style scoped>
.srp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  -webkit-app-region: no-drag;
}
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.18s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
.srp-dialog {
  width: 380px;
  max-width: 100%;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  background: var(--color-bg-deep);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}
.srp-top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 24px;
  border-bottom: 1px solid var(--color-border-subtle);
}
.srp-top-icon {
  display: flex;
  color: var(--color-accent);
}
.srp-top-title {
  flex: 1;
  color: var(--color-text-strong);
  font-size: 18px;
  font-weight: 600;
}
.srp-close {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.srp-close:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}
.srp-type-tabs {
  display: flex;
  gap: 6px;
  margin: 20px 24px 0;
  padding: 4px;
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
}
.srp-type-tab {
  flex: 1;
  min-height: 36px;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.18s ease;
}
.srp-type-tab.active {
  background: var(--color-bg-deep);
  border-color: var(--color-border-subtle);
  color: var(--color-text-accent);
  font-weight: 600;
}
.srp-body {
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.srp-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.srp-label {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
}
.srp-input-wrap {
  display: flex;
  align-items: center;
  background: var(--color-input-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: 0 12px;
  transition: border-color 0.18s ease;
}
.srp-input-wrap:focus-within,
.srp-input-text:focus {
  border-color: var(--color-border-hover);
}
.srp-prefix,
.srp-suffix {
  color: var(--color-text-secondary);
  font-size: 15px;
}
.srp-prefix {
  margin-right: 10px;
}
.srp-input {
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  color: var(--color-text-strong);
  padding: 12px 0;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  outline: none;
  -moz-appearance: textfield;
}
.srp-input::-webkit-outer-spin-button,
.srp-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.srp-input-text {
  width: 100%;
  padding: 12px;
  background: var(--color-input-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;
}
.srp-input-text::placeholder,
.srp-input::placeholder {
  color: var(--color-text-muted);
}
.srp-hint {
  padding: 10px 12px;
  color: var(--color-text-secondary);
  background: var(--color-surface-1);
  border-radius: var(--radius-md);
  font-size: 11px;
  line-height: 1.7;
}
.srp-hint strong {
  color: var(--color-text-primary);
  font-weight: 600;
}
.srp-footer {
  display: flex;
  gap: 10px;
  padding: 18px 24px;
  border-top: 1px solid var(--color-border-subtle);
}
.srp-cancel,
.srp-send {
  min-height: 38px;
  padding: 10px;
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
}
.srp-cancel {
  flex: 1;
  color: var(--color-text-primary);
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-subtle);
}
.srp-send {
  flex: 2;
  color: var(--color-on-accent);
  background: var(--color-accent);
  font-weight: 600;
}
.srp-send:hover:not(:disabled) {
  filter: brightness(0.94);
}
.srp-send:disabled {
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  cursor: not-allowed;
}
</style>
