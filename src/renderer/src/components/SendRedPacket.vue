<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="srp-overlay" @click.self="$emit('update:visible', false)">
        <div class="srp-dialog">
          <!-- 顶部红色装饰 -->
          <div class="srp-top-bar">
            <div class="srp-top-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M2 11h20" stroke="currentColor" stroke-width="1.5"/>
                <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity="0.9"/>
                <circle cx="12" cy="12" r="1.2" fill="#ff5a5f"/>
              </svg>
            </div>
            <span class="srp-top-title">发红包</span>
            <button class="srp-close" @click="$emit('update:visible', false)">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- 类型切换 -->
          <div class="srp-type-tabs">
            <button
              class="srp-type-tab" :class="{ active: form.type === 0 }"
              @click="form.type = 0"
            >🎲 拼手气红包</button>
            <button
              class="srp-type-tab" :class="{ active: form.type === 1 }"
              @click="form.type = 1"
            >💰 普通红包</button>
          </div>

          <div class="srp-body">
            <!-- 拼手气：总金额 + 个数 -->
            <template v-if="form.type === 0">
              <div class="srp-field">
                <label class="srp-label">红包总金额</label>
                <div class="srp-input-wrap">
                  <span class="srp-prefix">¥</span>
                  <input type="number" v-model="form.totalAmount" class="srp-input"
                    placeholder="0.00" min="0.01" step="0.01" />
                </div>
              </div>
              <div class="srp-field">
                <label class="srp-label">红包个数</label>
                <div class="srp-input-wrap">
                  <input type="number" v-model="form.count" class="srp-input"
                    placeholder="1" min="1" max="100" step="1" />
                  <span class="srp-suffix">个</span>
                </div>
              </div>
              <div class="srp-hint" v-if="form.totalAmount > 0 && form.count > 0">
                共 <strong>{{ form.count }}</strong> 个红包，总额
                <strong>¥{{ Number(form.totalAmount).toFixed(2) }}</strong>，随机分配
              </div>
            </template>

            <!-- 普通：单个金额 + 个数 -->
            <template v-else>
              <div class="srp-field">
                <label class="srp-label">单个金额</label>
                <div class="srp-input-wrap">
                  <span class="srp-prefix">¥</span>
                  <input type="number" v-model="form.singleAmount" class="srp-input"
                    placeholder="0.00" min="0.01" step="0.01" />
                </div>
              </div>
              <div class="srp-field">
                <label class="srp-label">红包个数</label>
                <div class="srp-input-wrap">
                  <input type="number" v-model="form.count" class="srp-input"
                    placeholder="1" min="1" max="100" step="1" />
                  <span class="srp-suffix">个</span>
                </div>
              </div>
              <div class="srp-hint" v-if="form.singleAmount > 0 && form.count > 0">
                共 <strong>{{ form.count }}</strong> 个，总额
                <strong>¥{{ (form.singleAmount * form.count).toFixed(2) }}</strong>，每人均等
              </div>
            </template>

            <!-- 祝福语 -->
            <div class="srp-field">
              <label class="srp-label">祝福语</label>
              <input type="text" v-model="form.blessing" class="srp-input-text"
                maxlength="30" placeholder="恭喜发财，大吉大利" />
            </div>
          </div>

          <div class="srp-footer">
            <button class="srp-cancel" @click="$emit('update:visible', false)">取消</button>
            <button class="srp-send" :disabled="!canSend" @click="handleSend">
              塞钱进红包
            </button>
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
  type: 0,        // 0=拼手气 1=普通
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
  const totalYuan = form.type === 0
    ? Number(form.totalAmount)
    : Number(form.singleAmount) * form.count

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

watch(() => props.visible, (val) => {
  if (val) {
    form.type = 0
    form.totalAmount = 0
    form.singleAmount = 0
    form.count = 1
    form.blessing = ''
  }
})
</script>

<style scoped>
.srp-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 10000;
}
.dialog-fade-enter-active, .dialog-fade-leave-active { transition: opacity 0.2s ease; }
.dialog-fade-enter-from, .dialog-fade-leave-to { opacity: 0; }

.srp-dialog {
  width: 360px;
  border-radius: 16px;
  background: rgba(18, 26, 42, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,120,120,0.2);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,90,95,0.08);
  overflow: hidden;
  color: #f0f2f5;
}

/* 顶部装饰栏 */
.srp-top-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 18px 20px 14px;
  background: linear-gradient(135deg, rgba(200,50,55,0.25) 0%, rgba(180,30,30,0.15) 100%);
  border-bottom: 1px solid rgba(255,100,100,0.12);
  position: relative;
}
.srp-top-icon { color: #ffd700; display: flex; align-items: center; }
.srp-top-title { font-size: 16px; font-weight: 700; color: #f0f2f5; flex: 1; }
.srp-close {
  width: 26px; height: 26px; border-radius: 50%;
  border: none; background: rgba(255,255,255,0.1);
  color: rgba(240,242,245,0.5); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.srp-close:hover { background: rgba(255,255,255,0.18); color: #f0f2f5; }

/* 类型切换 */
.srp-type-tabs {
  display: flex;
  padding: 12px 20px 0;
  gap: 8px;
}
.srp-type-tab {
  flex: 1; padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: rgba(240,242,245,0.5);
  font-size: 13px; cursor: pointer;
  transition: all 0.2s;
}
.srp-type-tab:hover { border-color: rgba(255,120,120,0.25); color: rgba(240,242,245,0.8); }
.srp-type-tab.active {
  background: rgba(255,90,95,0.15);
  border-color: rgba(255,90,95,0.4);
  color: #ff8a80;
  font-weight: 600;
}

.srp-body {
  padding: 16px 20px 14px;
  display: flex; flex-direction: column; gap: 14px;
}

.srp-field { display: flex; flex-direction: column; gap: 5px; }
.srp-label { font-size: 11px; color: rgba(240,242,245,0.4); font-weight: 500; }

.srp-input-wrap {
  display: flex; align-items: center;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; overflow: hidden;
  transition: border-color 0.2s;
}
.srp-input-wrap:focus-within { border-color: rgba(255,120,120,0.4); }
.srp-prefix, .srp-suffix { padding: 0 10px; font-size: 14px; color: rgba(240,242,245,0.35); }
.srp-input {
  flex: 1; border: none; background: none;
  color: #f0f2f5; font-size: 16px; padding: 10px 0; outline: none;
  -moz-appearance: textfield;
}
.srp-input::-webkit-outer-spin-button,
.srp-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

.srp-input-text {
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.06);
  color: #f0f2f5; font-size: 13px;
  padding: 10px 12px; border-radius: 8px;
  outline: none; transition: border-color 0.2s;
  box-sizing: border-box; width: 100%;
}
.srp-input-text:focus { border-color: rgba(255,120,120,0.4); }
.srp-input-text::placeholder { color: rgba(240,242,245,0.2); }

.srp-hint {
  text-align: center; font-size: 12px;
  color: rgba(240,242,245,0.4);
  padding: 7px 10px;
  background: rgba(255,90,95,0.08);
  border-radius: 8px;
}
.srp-hint strong { color: #ff8a80; }

.srp-footer {
  display: flex; gap: 10px;
  padding: 12px 20px 16px;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.srp-cancel {
  flex: 1; padding: 10px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: rgba(240,242,245,0.55); font-size: 14px; cursor: pointer;
  transition: all 0.2s;
}
.srp-cancel:hover { background: rgba(255,255,255,0.09); color: #f0f2f5; }
.srp-send {
  flex: 2; padding: 10px; border-radius: 8px; border: none;
  background: linear-gradient(135deg, #ff5a5f, #d9393e);
  color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(217,57,62,0.35);
}
.srp-send:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(217,57,62,0.45);
}
.srp-send:disabled { opacity: 0.38; cursor: not-allowed; }
</style>
