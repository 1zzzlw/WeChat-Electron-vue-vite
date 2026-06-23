<template>
  <div class="red-packet-card" :class="cardClass" @click="handleOpen">
    <!-- 左侧图标 -->
    <div class="rp-icon-wrap">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="2.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M2 11h20" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="2.8" fill="currentColor" opacity="0.85"/>
        <circle cx="12" cy="12" r="1.4" fill="rgba(255,90,95,0.9)"/>
      </svg>
    </div>

    <!-- 信息 -->
    <div class="rp-info">
      <div class="rp-title">{{ senderName || '红包' }}</div>
      <div class="rp-desc">{{ descText }}</div>
    </div>

    <!-- 右侧状态 -->
    <div class="rp-right">
      <!-- 未领取 & 进行中 -->
      <template v-if="isActive">
        <div class="rp-tag rp-tag-open">点击领取</div>
      </template>
      <!-- 已被自己领取 -->
      <template v-else-if="grabbed">
        <div class="rp-grabbed-amount">
          <span class="rp-unit">¥</span>{{ (grabbedAmount / 100).toFixed(2) }}
        </div>
        <div class="rp-tag rp-tag-grabbed">已领取</div>
      </template>
      <!-- 已领完 -->
      <template v-else-if="status === 1">
        <div class="rp-tag rp-tag-done">已领完</div>
      </template>
      <!-- 已过期 -->
      <template v-else-if="status === 2">
        <div class="rp-tag rp-tag-expire">已过期</div>
      </template>
      <!-- 已撤回 -->
      <template v-else-if="status === 3">
        <div class="rp-tag rp-tag-expire">已撤回</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  redPacketId: string
  amount: number
  status: number        // 0进行中 1已领完 2已过期 3已撤回
  grabbed?: boolean     // 当前用户是否已领
  grabbedAmount?: number // 当前用户领到的金额（分）
  senderName: string
  blessing?: string
  sendStatus: number
  id: string
  conversationId: string
  senderId: string | number
}>()

const emit = defineEmits<{
  open: [data: { redPacketId: string; id: string; conversationId: string }]
}>()

// 进行中且未被自己领取
const isActive = computed(() => props.status === 0 && !props.grabbed)

const cardClass = computed(() => ({
  'rp-inactive': !isActive.value
}))

const descText = computed(() => {
  if (props.grabbed) return props.blessing || '恭喜发财，大吉大利'
  if (props.status === 1) return '红包已被领完'
  if (props.status === 2) return '红包已过期'
  if (props.status === 3) return '红包已撤回'
  return props.blessing || '恭喜发财，大吉大利'
})

function handleOpen() {
  if (props.status === 1) { ElMessage.info('红包已被领完'); return }
  if (props.status === 2) { ElMessage.info('红包已过期'); return }
  if (props.status === 3) { ElMessage.info('红包已撤回'); return }
  if (props.grabbed) { ElMessage.info('你已经领取过该红包'); return }
  emit('open', { redPacketId: props.redPacketId, id: props.id, conversationId: props.conversationId })
}
</script>

<style scoped>
.red-packet-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  min-width: 210px; max-width: 270px;
  border-radius: 12px;
  cursor: pointer; user-select: none;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, rgba(200,50,50,0.22) 0%, rgba(180,30,30,0.16) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,120,120,0.28);
  box-shadow: 0 2px 12px rgba(180,30,30,0.15);
}
.red-packet-card:hover {
  background: linear-gradient(135deg, rgba(200,50,50,0.32) 0%, rgba(180,30,30,0.24) 100%);
  border-color: rgba(255,120,120,0.45);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(180,30,30,0.22);
}
.red-packet-card:active { transform: scale(0.98); }
.rp-inactive {
  opacity: 0.65;
  cursor: default;
}
.rp-inactive:hover {
  transform: none;
  box-shadow: 0 2px 12px rgba(180,30,30,0.15);
}

.rp-icon-wrap { flex-shrink: 0; color: #ffd700; display: flex; align-items: center; }

.rp-info { flex: 1; min-width: 0; }
.rp-title { font-size: 13px; font-weight: 600; color: #f0f2f5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rp-desc { font-size: 11px; color: rgba(240,242,245,0.5); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.rp-right { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }

.rp-grabbed-amount {
  font-size: 16px; font-weight: 700; color: #ffd700;
  font-variant-numeric: tabular-nums;
}
.rp-unit { font-size: 11px; }

.rp-tag {
  font-size: 10px; font-weight: 600;
  padding: 2px 7px; border-radius: 10px;
}
.rp-tag-open {
  background: rgba(255,200,0,0.18);
  border: 1px solid rgba(255,200,0,0.35);
  color: #ffd700;
}
.rp-tag-grabbed {
  background: rgba(76,217,100,0.12);
  border: 1px solid rgba(76,217,100,0.25);
  color: #4cd964;
}
.rp-tag-done, .rp-tag-expire {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(240,242,245,0.35);
}
</style>
