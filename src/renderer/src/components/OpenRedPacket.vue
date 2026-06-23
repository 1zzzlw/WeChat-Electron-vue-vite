<template>
  <Teleport to="body">
    <Transition name="rp-fade">
      <div v-if="visible" class="rp-overlay" @click.self="handleClose">
        <div class="rp-dialog">
          <button class="rp-close" @click="handleClose">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          <!-- 未打开 -->
          <div v-if="!isOpened" class="rp-cover">
            <div class="rp-cover-glow"></div>
            <div class="rp-cover-icon">
              <svg viewBox="0 0 24 24" width="56" height="56" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="2.5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M2 11h20" stroke="currentColor" stroke-width="1.5"/>
                <circle cx="12" cy="12" r="3.2" fill="currentColor" opacity="0.85"/>
                <circle cx="12" cy="12" r="1.6" fill="#ff5a5f"/>
              </svg>
            </div>
            <div class="rp-cover-sender">{{ senderName }} 的红包</div>
            <div class="rp-cover-blessing">{{ blessing || '恭喜发财，大吉大利' }}</div>
            <button class="rp-open-btn" @click="handleOpen" :disabled="isOpening">
              <span v-if="isOpening" class="rp-spinner"></span>
              <span>{{ isOpening ? '拆开中...' : '开' }}</span>
            </button>
          </div>

          <!-- 已打开结果 -->
          <div v-else class="rp-result">
            <div class="rp-result-glow" :class="amount > 0 ? 'glow-gold' : 'glow-gray'"></div>
            <div class="rp-result-icon" :class="amount > 0 ? 'icon-gold' : 'icon-gray'">
              {{ amount > 0 ? '🎉' : '😢' }}
            </div>
            <div class="rp-result-header">{{ amount > 0 ? '红包已打开' : '手慢了' }}</div>
            <div class="rp-result-amount" v-if="amount > 0">
              <span class="rp-result-unit">¥</span>
              <span class="rp-result-value" ref="amountRef">{{ (amount / 100).toFixed(2) }}</span>
            </div>
            <div class="rp-result-sub">{{ amount > 0 ? `来自 ${senderName}，已存入钱包` : '红包已被抢完' }}</div>

            <!-- 查看领取记录按钮 -->
            <button class="rp-detail-btn" @click="loadDetail" :class="{ loading: detailLoading }">
              {{ detailLoading ? '加载中...' : showDetail ? '收起记录' : '查看领取记录' }}
            </button>

            <!-- 领取记录列表 -->
            <Transition name="detail-slide">
              <div v-if="showDetail && detail" class="rp-detail">
                <div class="rp-detail-header">
                  <span>{{ detail.records?.length || 0 }} 人已领取</span>
                  <span class="rp-detail-remain" v-if="detail.status === 0">
                    还剩 {{ detail.remainCount }} 个 · ¥{{ detail.remainAmount }}
                  </span>
                  <span class="rp-detail-remain" v-else>
                    {{ statusText(detail.status) }}
                  </span>
                </div>
                <div class="rp-detail-list">
                  <div class="rp-detail-item" v-for="r in detail.records" :key="r.userId">
                    <img v-if="r.avatar" :src="r.avatar" class="rp-detail-avatar" />
                    <div v-else class="rp-detail-avatar-placeholder">{{ (r.username || '?')[0] }}</div>
                    <div class="rp-detail-user">
                      <span class="rp-detail-name">{{ r.username || '用户' }}</span>
                      <span class="rp-detail-time">{{ formatTime(r.createdAt) }}</span>
                    </div>
                    <span class="rp-detail-amount">¥{{ Number(r.amount).toFixed(2) }}</span>
                  </div>
                  <div class="rp-detail-empty" v-if="!detail.records?.length">暂无领取记录</div>
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
import { grabRedPacketApi, getRedPacketDetailApi } from '../api/RedPacket'
import dayjs from 'dayjs'

const props = defineProps<{
  visible: boolean
  redPacketId: string
  messageId: string
  conversationId: string
  senderName: string
  blessing?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  opened: [data: { redPacketId: string; amount: number; messageId: string }]
}>()

const isOpening = ref(false)
const isOpened = ref(false)
const amount = ref(0)
const amountRef = ref<HTMLElement | null>(null)
const showDetail = ref(false)
const detailLoading = ref(false)
const detail = ref<any>(null)

function spawnCoins(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  for (let i = 0; i < 16; i++) {
    const coin = document.createElement('div')
    coin.textContent = '🪙'
    coin.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;font-size:${14+Math.random()*14}px;pointer-events:none;z-index:99999;transition:all ${0.5+Math.random()*0.9}s cubic-bezier(0.25,0,0,1);opacity:1;`
    document.body.appendChild(coin)
    requestAnimationFrame(() => {
      coin.style.transform = `translate(${(Math.random()-0.5)*220}px,${-70-Math.random()*160}px) rotate(${(Math.random()-0.5)*720}deg)`
      coin.style.opacity = '0'
    })
    setTimeout(() => coin.remove(), 1500)
  }
}

async function handleOpen() {
  if (isOpening.value) return
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
  if (showDetail.value && detail.value) {
    showDetail.value = false
    return
  }
  detailLoading.value = true
  try {
    const res = await getRedPacketDetailApi(props.redPacketId)
    detail.value = res?.data
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
  if (!val) {
    isOpened.value = false
    amount.value = 0
    showDetail.value = false
    detail.value = null
  }
})
</script>

<style scoped>
.rp-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 10000;
}
.rp-fade-enter-active, .rp-fade-leave-active { transition: opacity 0.25s ease; }
.rp-fade-enter-from, .rp-fade-leave-to { opacity: 0; }

.rp-dialog {
  position: relative;
  width: 320px;
  max-height: 80vh;
  border-radius: 18px;
  overflow-y: auto;
  overflow-x: hidden;
  background: rgba(150, 30, 35, 0.3);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255,140,140,0.3);
  box-shadow: 0 24px 64px rgba(150,20,20,0.35);
  display: flex; flex-direction: column; align-items: center;
  scrollbar-width: none;
}
.rp-dialog::-webkit-scrollbar { display: none; }

.rp-close {
  position: absolute; top: 12px; right: 12px;
  width: 30px; height: 30px; border-radius: 50%;
  border: none; background: rgba(255,255,255,0.12);
  color: rgba(240,242,245,0.6); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; z-index: 2;
}
.rp-close:hover { background: rgba(255,255,255,0.2); color: #f0f2f5; }

/* ---- 封面 ---- */
.rp-cover {
  position: relative;
  display: flex; flex-direction: column;
  align-items: center; gap: 14px;
  padding: 44px 30px 36px;
  width: 100%; box-sizing: border-box;
}
.rp-cover-glow {
  position: absolute; top: -20px; left: 50%;
  transform: translateX(-50%);
  width: 200px; height: 200px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,120,80,0.15) 0%, transparent 70%);
  pointer-events: none;
}
.rp-cover-icon { color: #ffd700; animation: rp-float 2.2s ease-in-out infinite; }
@keyframes rp-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
.rp-cover-sender { font-size: 17px; font-weight: 700; color: #f0f2f5; }
.rp-cover-blessing { font-size: 13px; color: rgba(240,242,245,0.5); }

.rp-open-btn {
  display: flex; align-items: center; gap: 8px;
  margin-top: 10px; padding: 11px 40px;
  border: none; border-radius: 26px;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #6b2100; font-size: 16px; font-weight: 800;
  cursor: pointer; transition: all 0.2s;
  box-shadow: 0 4px 18px rgba(255,180,0,0.4);
}
.rp-open-btn:hover:not(:disabled) { transform: scale(1.07); box-shadow: 0 6px 24px rgba(255,180,0,0.55); }
.rp-open-btn:active:not(:disabled) { transform: scale(0.96); }
.rp-open-btn:disabled { opacity: 0.65; cursor: not-allowed; }

.rp-spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(107,33,0,0.3);
  border-top-color: #6b2100;
  border-radius: 50%;
  animation: rp-spin 0.6s linear infinite;
  display: inline-block;
}
@keyframes rp-spin { to { transform: rotate(360deg); } }

/* ---- 结果 ---- */
.rp-result {
  position: relative;
  display: flex; flex-direction: column;
  align-items: center; gap: 10px;
  padding: 36px 24px 24px;
  width: 100%; box-sizing: border-box;
  animation: rp-pop 0.4s cubic-bezier(0.18,0.89,0.32,1.28);
}
@keyframes rp-pop { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
.rp-result-glow {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 160px; height: 160px; border-radius: 50%;
  pointer-events: none;
}
.glow-gold { background: radial-gradient(circle, rgba(255,200,0,0.12) 0%, transparent 70%); }
.glow-gray { background: radial-gradient(circle, rgba(150,150,150,0.08) 0%, transparent 70%); }
.rp-result-icon { font-size: 40px; position: relative; z-index: 1; }
.rp-result-header { font-size: 14px; color: rgba(240,242,245,0.55); }
.rp-result-amount {
  display: flex; align-items: baseline;
  font-weight: 800; color: #ffd700;
}
.rp-result-unit { font-size: 22px; margin-right: 2px; }
.rp-result-value { font-size: 42px; text-shadow: 0 0 20px rgba(255,200,0,0.4); }
.rp-result-sub { font-size: 12px; color: rgba(240,242,245,0.4); }

.rp-detail-btn {
  margin-top: 4px;
  padding: 7px 20px;
  border-radius: 20px;
  border: 1px solid rgba(255,140,140,0.25);
  background: rgba(255,255,255,0.06);
  color: rgba(240,242,245,0.6); font-size: 12px; cursor: pointer;
  transition: all 0.2s;
}
.rp-detail-btn:hover:not(.loading) { border-color: rgba(255,140,140,0.45); color: #f0f2f5; }
.rp-detail-btn.loading { opacity: 0.5; cursor: not-allowed; }

/* 领取记录 */
.detail-slide-enter-active, .detail-slide-leave-active { transition: all 0.3s ease; }
.detail-slide-enter-from, .detail-slide-leave-to { opacity: 0; transform: translateY(-6px); }

.rp-detail {
  width: 100%;
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  border: 1px solid rgba(255,140,140,0.15);
  overflow: hidden;
}
.rp-detail-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px;
  font-size: 12px; color: rgba(240,242,245,0.5);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.rp-detail-remain { color: rgba(255,200,80,0.6); }
.rp-detail-list { max-height: 180px; overflow-y: auto; }
.rp-detail-list::-webkit-scrollbar { width: 3px; }
.rp-detail-list::-webkit-scrollbar-thumb { background: rgba(255,140,140,0.2); border-radius: 2px; }

.rp-detail-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 14px;
  transition: background 0.15s;
}
.rp-detail-item:hover { background: rgba(255,255,255,0.04); }

.rp-detail-avatar {
  width: 30px; height: 30px; border-radius: 8px;
  object-fit: cover; flex-shrink: 0;
  border: 1px solid rgba(255,140,140,0.2);
}
.rp-detail-avatar-placeholder {
  width: 30px; height: 30px; border-radius: 8px;
  background: rgba(255,90,95,0.2); color: #ff8a80;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600; flex-shrink: 0;
}
.rp-detail-user { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.rp-detail-name { font-size: 12px; color: rgba(240,242,245,0.8); }
.rp-detail-time { font-size: 10px; color: rgba(240,242,245,0.3); }
.rp-detail-amount { font-size: 14px; font-weight: 600; color: #ffd700; flex-shrink: 0; }
.rp-detail-empty { padding: 16px; text-align: center; font-size: 12px; color: rgba(240,242,245,0.3); }

.rp-result-btn {
  margin-top: 8px;
  padding: 9px 32px; border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.07);
  color: #f0f2f5; font-size: 13px; cursor: pointer;
  transition: all 0.2s;
}
.rp-result-btn:hover { background: rgba(255,255,255,0.14); }
</style>
