<template>
  <div class="red-packet-card" @click="handleOpen">
    <!-- 左侧图标 -->
    <div class="rp-icon-wrap">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="2.5" stroke="currentColor" stroke-width="1.5" />
        <path d="M2 11h20" stroke="currentColor" stroke-width="1.5" />
        <circle cx="12" cy="12" r="2.8" fill="currentColor" opacity="0.85" />
        <circle cx="12" cy="12" r="1.4" fill="rgba(255,90,95,0.9)" />
      </svg>
    </div>

    <!-- 信息 -->
    <div class="rp-info">
      <div class="rp-title">红包</div>
      <div class="rp-desc">恭喜发财，大吉大利</div>
    </div>

    <!-- 右侧 -->
    <div class="rp-right">
      <div class="rp-tag rp-tag-open">红包</div>
    </div>
  </div>

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
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  min-width: 210px;
  max-width: 270px;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, rgba(200, 50, 50, 0.22) 0%, rgba(180, 30, 30, 0.16) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 120, 120, 0.28);
  box-shadow: 0 2px 12px rgba(180, 30, 30, 0.15);
}

.red-packet-card:hover {
  background: linear-gradient(135deg, rgba(200, 50, 50, 0.32) 0%, rgba(180, 30, 30, 0.24) 100%);
  border-color: rgba(255, 120, 120, 0.45);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(180, 30, 30, 0.22);
}

.red-packet-card:active {
  transform: scale(0.98);
}

.rp-icon-wrap {
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
  font-size: 13px;
  font-weight: 600;
  color: #f0f2f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rp-desc {
  font-size: 11px;
  color: rgba(240, 242, 245, 0.5);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rp-right {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.rp-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
}

.rp-tag-open {
  background: rgba(255, 200, 0, 0.18);
  border: 1px solid rgba(255, 200, 0, 0.35);
  color: #ffd700;
}
</style>
