<template>
  <div class="red-packet-card" @click="handleOpen">
    <div class="rp-icon">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="1.5" />
        <path d="M2 11h20" stroke="currentColor" stroke-width="1.5" />
        <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.85" />
        <circle cx="12" cy="12" r="1.5" fill="#fff" />
      </svg>
    </div>
    <div class="rp-info">
      <div class="rp-title">{{ senderName || '红包' }}</div>
      <div class="rp-desc">
        <template v-if="status === 2">已被领完</template>
        <template v-else-if="status === 1">已领取</template>
        <template v-else>恭喜发财，大吉大利</template>
      </div>
    </div>
    <div class="rp-amount" v-if="status !== 2">
      <span class="rp-unit">&yen;</span>{{ (amount / 100).toFixed(2) }}
    </div>
    <div class="rp-opened" v-else>
      <span>已抢完</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'

const props = defineProps<{
  redPacketId: string
  amount: number
  status: number
  senderName: string
  sendStatus: number
  id: string
  conversationId: string
  senderId: string | number
}>()

const emit = defineEmits<{
  open: [data: { redPacketId: string; id: string; conversationId: string }]
}>()

const handleOpen = () => {
  if (props.status === 2) {
    ElMessage.info('红包已被领完')
    return
  }
  if (props.status === 1) {
    ElMessage.info('你已经领取过该红包')
    return
  }
  emit('open', {
    redPacketId: props.redPacketId,
    id: props.id,
    conversationId: props.conversationId
  })
}
</script>

<style scoped>
.red-packet-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  min-width: 220px;
  max-width: 280px;
  border-radius: 10px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  background: rgba(255, 90, 95, 0.18);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 120, 120, 0.3);
}
.red-packet-card:hover {
  background: rgba(255, 90, 95, 0.28);
  border-color: rgba(255, 120, 120, 0.5);
  transform: scale(1.02);
}
.red-packet-card:active {
  transform: scale(0.98);
}
.rp-icon {
  flex-shrink: 0;
  color: #ffd700;
  display: flex;
  align-items: center;
}
.rp-info {
  flex: 1;
  min-width: 0;
}
.rp-title {
  font-size: 14px;
  font-weight: 600;
  color: #f0f2f5;
}
.rp-desc {
  font-size: 11px;
  color: rgba(240, 242, 245, 0.6);
  margin-top: 2px;
}
.rp-amount {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 700;
  color: #ffd700;
}
.rp-unit {
  font-size: 12px;
}
.rp-opened {
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(240, 242, 245, 0.4);
}
</style>
