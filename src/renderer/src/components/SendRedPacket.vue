<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="srp-overlay" @click.self="$emit('update:visible', false)">
        <div class="srp-dialog">
          <div class="srp-header">
            <span>发红包</span>
            <button class="srp-close" @click="$emit('update:visible', false)">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="srp-body">
            <!-- 金额 -->
            <div class="srp-field">
              <label class="srp-label">单个金额</label>
              <div class="srp-input-wrap">
                <span class="srp-prefix">&yen;</span>
                <input type="number" v-model="form.amount" class="srp-input" placeholder="0.00" min="0.01" step="0.01" />
              </div>
            </div>

            <!-- 个数 -->
            <div class="srp-field">
              <label class="srp-label">红包个数</label>
              <div class="srp-input-wrap">
                <input type="number" v-model="form.count" class="srp-input" placeholder="1" min="1" max="100" step="1" />
                <span class="srp-suffix">个</span>
              </div>
            </div>

            <!-- 总金额显示 -->
            <div class="srp-total" v-if="form.amount > 0 && form.count > 0">
              总金额：<strong>&yen;{{ (form.amount * form.count).toFixed(2) }}</strong>
            </div>

            <!-- 祝福语 -->
            <div class="srp-field">
              <label class="srp-label">祝福语</label>
              <input type="text" v-model="form.blessing" class="srp-input-text" maxlength="30"
                placeholder="恭喜发财，大吉大利" />
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

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  send: [data: { amount: number; count: number; blessing: string }]
}>()

const form = reactive({
  amount: 0,
  count: 1,
  blessing: ''
})

const canSend = computed(() => {
  return form.amount > 0 && form.count >= 1 && form.count <= 100
})

const handleSend = () => {
  if (form.amount <= 0) {
    ElMessage.warning('请输入红包金额')
    return
  }
  if (form.count < 1 || form.count > 100) {
    ElMessage.warning('红包个数为1-100个')
    return
  }
  emit('send', {
    amount: Math.round(form.amount * 100), // 转为分
    count: form.count,
    blessing: form.blessing || '恭喜发财，大吉大利'
  })
  emit('update:visible', false)
}

watch(() => props.visible, (val) => {
  if (val) {
    form.amount = 0
    form.count = 1
    form.blessing = ''
  }
})
</script>

<style scoped>
.srp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.dialog-fade-enter-active,
.dialog-fade-leave-active { transition: opacity 0.2s ease; }
.dialog-fade-enter-from,
.dialog-fade-leave-to { opacity: 0; }

.srp-dialog {
  width: 360px;
  border-radius: 14px;
  background: rgba(20, 30, 48, 0.85);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 1px solid rgba(255, 150, 150, 0.25);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  color: #f0f2f5;
}

.srp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  font-size: 15px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.srp-close {
  width: 28px; height: 28px;
  border: none; background: rgba(255,255,255,0.08);
  border-radius: 50%; color: rgba(240,242,245,0.6);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.srp-close:hover { background: rgba(255,255,255,0.16); color: #f0f2f5; }

.srp-body {
  padding: 20px;
  display: flex; flex-direction: column; gap: 16px;
}

.srp-field {
  display: flex; flex-direction: column; gap: 6px;
}
.srp-label {
  font-size: 12px; color: rgba(240,242,245,0.5); font-weight: 500;
}

.srp-input-wrap {
  display: flex; align-items: center;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.srp-input-wrap:focus-within {
  border-color: rgba(255,120,120,0.4);
}
.srp-prefix, .srp-suffix {
  padding: 0 10px;
  font-size: 14px;
  color: rgba(240,242,245,0.4);
}
.srp-input {
  flex: 1;
  border: none; background: none;
  color: #f0f2f5; font-size: 16px;
  padding: 10px 0;
  outline: none;
  /* 隐藏 number 输入框的上下箭头 */
  -moz-appearance: textfield;
}
.srp-input::-webkit-outer-spin-button,
.srp-input::-webkit-inner-spin-button {
  -webkit-appearance: none; margin: 0;
}

.srp-input-text {
  width: 100%;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.06);
  color: #f0f2f5; font-size: 13px;
  padding: 10px 12px; border-radius: 8px;
  outline: none; transition: border-color 0.2s;
  box-sizing: border-box;
}
.srp-input-text:focus {
  border-color: rgba(255,120,120,0.4);
}
.srp-input-text::placeholder {
  color: rgba(240,242,245,0.25);
}

.srp-total {
  text-align: center;
  font-size: 14px;
  color: rgba(240,242,245,0.5);
  padding: 8px;
  background: rgba(255,120,120,0.08);
  border-radius: 8px;
}
.srp-total strong {
  color: #ff8a80;
  font-size: 16px;
}

.srp-footer {
  display: flex; gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.srp-cancel {
  flex: 1;
  padding: 10px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05);
  color: #f0f2f5; font-size: 14px; cursor: pointer;
  transition: all 0.2s;
}
.srp-cancel:hover { background: rgba(255,255,255,0.1); }
.srp-send {
  flex: 2;
  padding: 10px; border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #ff5a5f, #d9393e);
  color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(217, 57, 62, 0.3);
}
.srp-send:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(217, 57, 62, 0.4);
}
.srp-send:disabled {
  opacity: 0.4; cursor: not-allowed;
}
</style>
