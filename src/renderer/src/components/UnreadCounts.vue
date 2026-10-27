<template>
  <span v-if="unreadCounts > 0" class="unread-count" :aria-label="`${unreadCounts} 条未读消息`">
    {{ unreadCounts <= 99 ? unreadCounts : '99+' }}
  </span>
</template>

<script setup lang="ts">
defineProps({
  unreadCounts: {
    type: Number,
    default: 0
  }
})
</script>

<style scoped>
.unread-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  box-sizing: border-box;
  border-radius: 999px;
  background-color: #ff4d4f;
  box-shadow: 0 0 0 2px var(--color-sidebar-surface);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: #fff;
  line-height: 1;
  white-space: nowrap;
}
</style>
