<template>
  <Teleport to="body">
    <Transition name="rp-fade">
      <div v-if="visible" class="rp-overlay" @click.self="handleClose">
        <div class="rp-dialog" role="dialog" aria-modal="true" aria-label="红包">
          <button type="button" class="rp-close" aria-label="关闭红包" @click="handleClose">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <!-- 加载中 -->
          <div v-if="loading" class="rp-cover">
            <div class="rp-loading" role="status">加载中...</div>
          </div>

          <!-- 未打开（封面） -->
          <div v-else-if="!isOpened" class="rp-cover">
            <div class="rp-cover-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="2.5" stroke="currentColor" stroke-width="1.5" />
                <path d="M2 11h20" stroke="currentColor" stroke-width="1.5" />
                <circle cx="12" cy="12" r="3.2" fill="currentColor" />
                <circle cx="12" cy="12" r="1.6" fill="var(--color-bg-deep)" />
              </svg>
            </div>
            <div class="rp-cover-sender">{{ detail?.senderName || '好友' }} 的红包</div>
            <div class="rp-cover-blessing">{{ detail?.greeting || '恭喜发财，大吉大利' }}</div>
            <button class="rp-open-btn" @click="handleOpen" :disabled="isOpening || !canGrab">
              <span v-if="isOpening" class="rp-spinner"></span>
              <span v-if="isOpening">拆开中...</span>
              <span v-else-if="!canGrab">已领取</span>
              <span v-else>开</span>
            </button>
          </div>

          <!-- 已打开结果 -->
          <div v-else class="rp-result">
            <div class="rp-result-icon" :class="{ 'is-success': amount > 0 }" aria-hidden="true">
              <component :is="amount > 0 ? CircleCheck : InfoFilled" />
            </div>
            <div class="rp-result-header">{{ amount > 0 ? '红包已打开' : '手慢了' }}</div>
            <div class="rp-result-amount" v-if="amount > 0">
              <span class="rp-result-unit">¥</span>
              <span class="rp-result-value" ref="amountRef">{{ (amount / 100).toFixed(2) }}</span>
            </div>
            <div class="rp-result-sub">{{ amount > 0 ? `来自 ${detail?.senderName || '好友'}，已存入钱包` : '红包已被抢完' }}</div>

            <!-- 查看领取记录按钮 -->
            <button type="button" class="rp-detail-btn" :aria-expanded="showDetail" :disabled="detailLoading" @click="loadDetail">
              {{ detailLoading ? '加载中...' : showDetail ? '收起记录' : '查看领取记录' }}
            </button>

            <!-- 领取记录列表 -->
            <Transition name="detail-slide">
              <div v-if="showDetail && records" class="rp-detail">
                <div class="rp-detail-header">
                  <span>{{ records.length }} 人已领取</span>
                  <span class="rp-detail-remain" v-if="detail?.status === 0">
                    还剩 {{ detail?.remainCount }} 个 · ¥{{ detail?.remainAmount }}
                  </span>
                  <span class="rp-detail-remain" v-else>
                    {{ statusText(detail?.status) }}
                  </span>
                </div>
                <div class="rp-detail-list">
                  <div class="rp-detail-item" v-for="r in records" :key="r.userId">
                    <img v-if="r.avatar" :src="r.avatar" alt="" class="rp-detail-avatar" />
                    <div v-else class="rp-detail-avatar-placeholder">{{ (r.username || '?')[0] }}</div>
                    <div class="rp-detail-user">
                      <span class="rp-detail-name">{{ r.username || '用户' }}</span>
                      <span class="rp-detail-time">{{ formatTime(r.createdAt) }}</span>
                    </div>
                    <span class="rp-detail-amount">¥{{ Number(r.amount).toFixed(2) }}</span>
                  </div>
                  <div class="rp-detail-empty" v-if="!records.length">暂无领取记录</div>
                </div>
              </div>
            </Transition>

            <button class="rp-result-btn" @click="handleClose">我知道了</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { CircleCheck, InfoFilled } from '@element-plus/icons-vue'
import { grabRedPacketApi, getRedPacketDetailApi } from '@/api/RedPacket'
import dayjs from 'dayjs'

const props = defineProps<{
  visible: boolean
  redPacketId: string
  messageId: string
  conversationId: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  opened: [data: { redPacketId: string; amount: number; messageId: string }]
}>()

const loading = ref(false)
const isOpening = ref(false)
const isOpened = ref(false)
const amount = ref(0)
const amountRef = ref<HTMLElement | null>(null)
const showDetail = ref(false)
const detailLoading = ref(false)
const detail = ref<any>(null)
const records = ref<any[]>([])

// 是否能抢：状态为进行中(0) 且 当前用户未领取
const canGrab = ref(false)

async function loadRedPacketDetail() {
  loading.value = true
  try {
    const res = await getRedPacketDetailApi(props.redPacketId)
    detail.value = res?.data
    if (detail.value) {
      canGrab.value = detail.value.status === 0 && !detail.value.grabbed
      records.value = detail.value.records || []
      // 如果已经抢过或已结束，可以直接展示结果
      if (detail.value.grabbed) {
        amount.value = Math.round((detail.value.grabbedAmount || 0) * 100)
        isOpened.value = true
      }
      if (!canGrab.value && !detail.value.grabbed) {
        // 已领完/已过期/已撤回，展示结果（金额为0）
        isOpened.value = true
        amount.value = 0
      }
    }
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
}

function spawnCoins(el: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  for (let i = 0; i < 16; i++) {
    const coin = document.createElement('div')
    coin.textContent = '🪙'
    coin.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;font-size:${14 + Math.random() * 14}px;pointer-events:none;z-index:99999;transition:all ${0.5 + Math.random() * 0.9}s cubic-bezier(0.25,0,0,1);opacity:1;`
    document.body.appendChild(coin)
    requestAnimationFrame(() => {
      coin.style.transform = `translate(${(Math.random() - 0.5) * 220}px,${-70 - Math.random() * 160}px) rotate(${(Math.random() - 0.5) * 720}deg)`
      coin.style.opacity = '0'
    })
    setTimeout(() => coin.remove(), 1500)
  }
}

async function handleOpen() {
  if (isOpening.value || !canGrab.value) return
  isOpening.value = true
  try {
    const res = await grabRedPacketApi(props.redPacketId)
    const grabbed = res?.data
    amount.value = (grabbed != null) ? Math.round(Number(grabbed) * 100) : 0
  } catch {
    amount.value = 0
  } finally {
    isOpening.value = false
    isOpened.value = true
    setTimeout(() => {
      if (amountRef.value && amount.value > 0) spawnCoins(amountRef.value)
      emit('opened', { redPacketId: props.redPacketId, amount: amount.value, messageId: props.messageId })
    }, 350)
  }
}

async function loadDetail() {
  if (showDetail.value) {
    showDetail.value = false
    return
  }
  detailLoading.value = true
  try {
    const res = await getRedPacketDetailApi(props.redPacketId)
    const d = res?.data
    if (d) {
      detail.value = d
      records.value = d.records || []
    }
    showDetail.value = true
  } catch { /* ignore */ } finally {
    detailLoading.value = false
  }
}

function statusText(s: number) {
  if (s === 1) return '已领完'
  if (s === 2) return '已过期'
  if (s === 3) return '已撤回'
  return ''
}

function formatTime(t: string) {
  return t ? dayjs(t).format('MM-DD HH:mm') : ''
}

function handleClose() {
  emit('update:visible', false)
}

watch(() => props.visible, (val) => {
  if (val) {
    isOpened.value = false
    amount.value = 0
    showDetail.value = false
    detail.value = null
    records.value = []
    canGrab.value = false
    loadRedPacketDetail()
  }
}, { immediate: true, deep: true })
</script>

<style scoped>
.rp-overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: var(--spacing-lg);
  box-sizing: border-box;
  background: rgb(0 0 0 / 48%);
  z-index: 10000;
}

.rp-dialog {
  position: relative;
  width: min(360px, 100%);
  max-height: calc(100vh - 2 * var(--spacing-lg));
  overflow-y: auto;
  box-sizing: border-box;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-bg-deep);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-lg);
}

.rp-close {
  position: absolute;
  inset-block-start: var(--spacing-md);
  inset-inline-end: var(--spacing-md);
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--color-surface-1);
  color: var(--color-text-secondary);
}

.rp-close:hover {
  background: var(--color-surface-2);
  color: var(--color-text-strong);
}

.rp-cover,
.rp-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 44px var(--spacing-xl) var(--spacing-xl);
  text-align: center;
}

.rp-loading,
.rp-cover-blessing,
.rp-result-sub {
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.rp-cover-icon,
.rp-result-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-bottom: var(--spacing-xs);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  color: var(--color-text-secondary);
}

.rp-cover-icon {
  background: color-mix(in srgb, var(--color-danger) 8%, var(--color-bg-deep));
  color: var(--color-danger);
}

.rp-result-icon.is-success {
  background: color-mix(in srgb, var(--color-success) 10%, var(--color-bg-deep));
  color: var(--color-success);
}

.rp-result-icon svg {
  width: 27px;
  height: 27px;
}

.rp-cover-sender,
.rp-result-header {
  color: var(--color-text-strong);
  font-size: 16px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.rp-result-sub,
.rp-cover-blessing {
  overflow-wrap: anywhere;
}

.rp-result-amount {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-xs);
  color: var(--color-text-strong);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1.1;
}

.rp-result-unit {
  font-size: 20px;
}

.rp-result-value {
  font-size: 42px;
}

.rp-open-btn,
.rp-result-btn,
.rp-detail-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.rp-open-btn,
.rp-result-btn {
  min-width: 128px;
  margin-top: var(--spacing-sm);
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-on-accent);
}

.rp-open-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-sm);
}

.rp-open-btn:enabled:hover,
.rp-result-btn:hover {
  border-color: var(--color-border-hover);
}

.rp-detail-btn {
  margin-top: var(--spacing-xs);
  background: var(--color-surface-1);
  color: var(--color-text-primary);
}

.rp-detail-btn:enabled:hover {
  background: var(--color-surface-2);
  border-color: var(--color-border-hover);
}

.rp-open-btn:disabled,
.rp-detail-btn:disabled {
  background: var(--color-surface-2);
  border-color: var(--color-border-subtle);
  color: var(--color-text-muted);
}

.rp-spinner {
  width: 14px;
  height: 14px;
  box-sizing: border-box;
  border: 2px solid var(--color-border-subtle);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: rp-spin 0.6s linear infinite;
}

@keyframes rp-spin {
  to { transform: rotate(360deg); }
}

.rp-detail {
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  text-align: start;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
}

.rp-detail-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--spacing-xs) var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border-subtle);
  color: var(--color-text-secondary);
  font-size: 12px;
}

.rp-detail-list {
  max-height: 180px;
  overflow-y: auto;
}

.rp-detail-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
}

.rp-detail-item + .rp-detail-item {
  border-top: 1px solid var(--color-border-subtle);
}

.rp-detail-avatar,
.rp-detail-avatar-placeholder {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
}

.rp-detail-avatar {
  object-fit: cover;
}

.rp-detail-avatar-placeholder {
  display: grid;
  place-items: center;
  background: var(--color-accent-soft);
  color: var(--color-text-accent);
  font-size: 13px;
  font-weight: 600;
}

.rp-detail-user {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
}

.rp-detail-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-size: 13px;
}

.rp-detail-time,
.rp-detail-empty {
  color: var(--color-text-muted);
  font-size: 12px;
}

.rp-detail-amount {
  color: var(--color-text-strong);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.rp-detail-empty {
  padding: var(--spacing-lg);
  text-align: center;
}

.rp-fade-enter-active,
.rp-fade-leave-active,
.detail-slide-enter-active,
.detail-slide-leave-active {
  transition: opacity var(--transition-fast);
}

.rp-fade-enter-from,
.rp-fade-leave-to,
.detail-slide-enter-from,
.detail-slide-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .rp-overlay,
  .rp-detail,
  .rp-open-btn,
  .rp-result-btn,
  .rp-detail-btn {
    transition: none;
  }
  .rp-spinner {
    animation: none;
  }
}
</style>
