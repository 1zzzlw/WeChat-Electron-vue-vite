<template>
  <button type="button" class="red-packet-card" :disabled="!props.redPacketId" @click="handleOpen">
    <span class="rp-icon-wrap" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="2.5" stroke="currentColor" stroke-width="1.5" />
        <path d="M2 11h20" stroke="currentColor" stroke-width="1.5" />
        <circle cx="12" cy="12" r="2.8" fill="currentColor" />
        <circle cx="12" cy="12" r="1.2" fill="var(--color-bg-deep)" />
      </svg>
    </span>
    <span class="rp-info">
      <span class="rp-title">红包</span>
      <span class="rp-desc">恭喜发财，大吉大利</span>
    </span>
    <span class="rp-arrow" aria-hidden="true"></span>
  </button>

  <!-- 拆红包弹窗：由本组件自己管理，不再向上 emit -->
  <OpenRedPacket v-if="showDialog" :visible="showDialog" :redPacketId="props.redPacketId" :messageId="props.id"
    :conversationId="props.conversationId" @update:visible="showDialog = false" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OpenRedPacket from '@/components/OpenRedPacket.vue'

const props = defineProps<{
  redPacketId: string
  id: string
  conversationId: string
  senderId: string | number
}>()

const showDialog = ref(false)

function handleOpen() {
  if (!props.redPacketId) return
  console.log('红包ID:', props.redPacketId)
  showDialog.value = true
}
</script>

<style scoped>
.red-packet-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--spacing-md);
  width: 248px;
  max-width: 100%;
  box-sizing: border-box;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  box-shadow: var(--shadow-sm);
  text-align: start;
  transition: background-color var(--transition-fast), border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.red-packet-card:enabled:hover {
  background: var(--color-surface-2);
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-md);
}

.red-packet-card:enabled:active {
  background: var(--color-surface-3);
}

.rp-icon-wrap {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-danger) 8%, var(--color-bg-deep));
  color: var(--color-danger);
}

.rp-info {
  display: grid;
  gap: 2px;
}

.rp-title,
.rp-desc {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.rp-title {
  color: var(--color-text-strong);
  font-size: 14px;
  font-weight: 600;
}

.rp-desc {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.rp-arrow {
  width: 6px;
  height: 6px;
  margin-inline-end: var(--spacing-xs);
  border-top: 1.5px solid currentColor;
  border-right: 1.5px solid currentColor;
  color: var(--color-text-secondary);
  transform: rotate(45deg);
}

@media (prefers-reduced-motion: reduce) {
  .red-packet-card {
    transition: none;
  }
}
</style>
