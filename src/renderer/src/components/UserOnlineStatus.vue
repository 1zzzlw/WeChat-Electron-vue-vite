<template>
  <span
    class="user-online-status"
    :class="{ connected: isConnected }"
    role="status"
    :aria-label="connectionLabel"
    :title="connectionLabel"
  ></span>
  <span class="mobile-online-status" role="status">
    <span v-if="mobileOnline">手机端在线</span>
  </span>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useConnectionStatus } from '@/composables/useConnectionStatus'

const { isConnected, connectionLabel } = useConnectionStatus()
const mobileOnline = ref(false)
let unsubscribe: (() => void) | undefined
let receivedUpdate = false
let disposed = false

onMounted(async () => {
  const api = (window as any).wsApi
  unsubscribe = api.onMobileOnline((online: boolean) => {
    receivedUpdate = true
    mobileOnline.value = online
  })
  const initial = await api.getMobileOnline()
  if (!disposed && !receivedUpdate) mobileOnline.value = initial
})

onUnmounted(() => {
  disposed = true
  unsubscribe?.()
})
</script>

<style scoped>
.user-online-status {
  position: absolute;
  top: 58px;
  left: 58px;
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-nav-surface);
  border-radius: 50%;
  background: var(--color-text-muted);
  transition: background-color 0.18s ease;
}
.user-online-status.connected {
  background: var(--color-success);
}
.mobile-online-status {
  margin-top: -9px;
  margin-bottom: 5px;
  min-height: 16px;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}
</style>
