<template>
  <Teleport to="body">
    <Transition name="rp-fade">
      <div v-if="visible" class="rp-overlay" @click.self="handleClose">
        <div class="rp-dialog" :class="{ 'is-opening': isOpening, 'is-opened': isOpened }">
          <!-- 关闭按钮 -->
          <button class="rp-close" @click="handleClose">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <!-- 未打开状态 -->
          <div v-if="!isOpened" class="rp-cover">
            <div class="rp-cover-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="1.5" />
                <path d="M2 11h20" stroke="currentColor" stroke-width="1.5" />
                <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.85" />
                <circle cx="12" cy="12" r="1.5" fill="#fff" />
              </svg>
            </div>
            <div class="rp-cover-sender">{{ senderName }}的红包</div>
            <div class="rp-cover-blessing">恭喜发财，大吉大利</div>
            <button class="rp-open-btn" :class="{ 'is-loading': isOpening }" @click="handleOpen" :disabled="isOpening">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" v-if="!isOpening">
                <circle cx="12" cy="12" r="10" />
                <text x="12" y="16" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">&yen;</text>
              </svg>
              <span v-else class="rp-spinner"></span>
              <span>{{ isOpening ? '拆开中...' : '开' }}</span>
            </button>
          </div>

          <!-- 已打开状态 -->
          <div v-else class="rp-result">
            <div class="rp-result-header">红包已打开</div>
            <div class="rp-result-amount">
              <span class="rp-result-unit">&yen;</span>
              <span class="rp-result-value" ref="amountRef">{{ (amount / 100).toFixed(2) }}</span>
            </div>
            <div class="rp-result-sender">来自 {{ senderName }}</div>
            <div class="rp-result-tip" v-if="amount > 0">
              已存入钱包余额
            </div>
            <div class="rp-result-tip" v-else>
              手慢了，红包已被抢完
            </div>
            <button class="rp-result-btn" @click="handleClose">我知道了</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { openRedPacketApi } from '../api/RedPacket'

const props = defineProps<{
  visible: boolean
  redPacketId: string
  messageId: string
  conversationId: string
  senderName: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  opened: [data: { redPacketId: string; amount: number; messageId: string }]
}>()

const isOpening = ref(false)
const isOpened = ref(false)
const amount = ref(0)
const amountRef = ref<HTMLElement | null>(null)

// 金币掉落粒子效果
const spawnCoins = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const colors = ['#ffd700', '#ffaa00', '#ff6600', '#ff4444', '#ffcc00']

  for (let i = 0; i < 15; i++) {
    const coin = document.createElement('div')
    coin.textContent = '🪙'
    coin.style.cssText = `
      position: fixed;
      left: ${cx}px;
      top: ${cy}px;
      font-size: ${16 + Math.random() * 16}px;
      pointer-events: none;
      z-index: 99999;
      transition: all ${0.6 + Math.random() * 0.8}s cubic-bezier(0.25, 0, 0, 1);
      opacity: 1;
    `
    document.body.appendChild(coin)

    requestAnimationFrame(() => {
      coin.style.transform = `translate(${(Math.random() - 0.5) * 200}px, ${-80 - Math.random() * 150}px) rotate(${(Math.random() - 0.5) * 720}deg)`
      coin.style.opacity = '0'
    })

    setTimeout(() => coin.remove(), 1500)
  }
}

const handleOpen = async () => {
  if (isOpening.value) return
  isOpening.value = true
  try {
    const res = await openRedPacketApi(props.redPacketId)
    const data = res?.data
    if (data && data.amount !== undefined) {
      amount.value = data.amount
    } else {
      amount.value = 0
    }
  } catch {
    amount.value = 0
  } finally {
    isOpening.value = false
    isOpened.value = true
    setTimeout(() => {
      if (amountRef.value && amount.value > 0) {
        spawnCoins(amountRef.value)
      }
      emit('opened', {
        redPacketId: props.redPacketId,
        amount: amount.value,
        messageId: props.messageId
      })
    }, 400)
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

watch(() => props.visible, (val) => {
  if (!val) {
    isOpened.value = false
    amount.value = 0
  }
})
</script>

<style scoped>
.rp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.rp-fade-enter-active,
.rp-fade-leave-active {
  transition: opacity 0.25s ease;
}
.rp-fade-enter-from,
.rp-fade-leave-to {
  opacity: 0;
}

.rp-dialog {
  position: relative;
  width: 320px;
  min-height: 360px;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(200, 55, 60, 0.25);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 140, 140, 0.35);
  box-shadow: 0 20px 60px rgba(180, 30, 30, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.rp-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: rgba(240, 242, 245, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 2;
}
.rp-close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #f0f2f5;
}

/* ---- 未打开封面 ---- */
.rp-cover {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 30px;
}
.rp-cover-icon {
  color: #ffd700;
  animation: rp-float 2s ease-in-out infinite;
}
@keyframes rp-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.rp-cover-sender {
  font-size: 16px;
  font-weight: 600;
  color: #f0f2f5;
}
.rp-cover-blessing {
  font-size: 13px;
  color: rgba(240, 242, 245, 0.55);
}
.rp-open-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 10px 32px;
  border: none;
  border-radius: 24px;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #6b2100;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(255, 180, 0, 0.35);
}
.rp-open-btn:hover:not(:disabled) {
  transform: scale(1.06);
  box-shadow: 0 6px 22px rgba(255, 180, 0, 0.5);
}
.rp-open-btn:active:not(:disabled) {
  transform: scale(0.96);
}
.rp-open-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.rp-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(107, 33, 0, 0.3);
  border-top-color: #6b2100;
  border-radius: 50%;
  animation: rp-spin 0.6s linear infinite;
}
@keyframes rp-spin {
  to { transform: rotate(360deg); }
}

/* ---- 已打开结果 ---- */
.rp-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 30px;
  animation: rp-pop 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
@keyframes rp-pop {
  from { transform: scale(0.7); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.rp-result-header {
  font-size: 14px;
  color: rgba(240, 242, 245, 0.6);
}
.rp-result-amount {
  font-size: 36px;
  font-weight: 800;
  color: #ffd700;
  display: flex;
  align-items: baseline;
}
.rp-result-unit {
  font-size: 20px;
  margin-right: 2px;
}
.rp-result-sender {
  font-size: 13px;
  color: rgba(240, 242, 245, 0.5);
}
.rp-result-tip {
  font-size: 12px;
  color: rgba(240, 242, 245, 0.4);
}
.rp-result-btn {
  margin-top: 16px;
  padding: 8px 28px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
  color: #f0f2f5;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.rp-result-btn:hover {
  background: rgba(255, 255, 255, 0.16);
}
</style>
