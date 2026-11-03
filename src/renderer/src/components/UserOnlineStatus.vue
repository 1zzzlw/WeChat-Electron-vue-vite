<template>
  <span
    class="user-online-status"
    :class="{ connected: isConnected }"
    role="status"
    :aria-label="connectionLabel"
    :title="connectionLabel"
  ></span>
</template>

<script setup lang="ts">
import { useConnectionStatus } from '@/composables/useConnectionStatus'
const { isConnected, connectionLabel } = useConnectionStatus()
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
</style>
