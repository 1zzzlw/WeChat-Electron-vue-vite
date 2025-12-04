<template>
  <div class="unread-count">
    <div class="count-dot" v-if="unreadCounts > 0">{{ unreadCounts }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps({
  unreadCounts: {
    type: Number,
    default: 1
  }
})
</script>

<style scoped>
.unread-count {
  position: relative;
  top: 10px;
  left: 40px;
}

.count-dot {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background-color: #ff4d4f;
  /* 基础过渡：让hover效果丝滑 */
  transition: all 0.2s ease;
  /* 可选：加轻微阴影，默认更立体 */
  box-shadow: 0 0 2px rgba(255, 77, 79, 0.5);
  cursor: pointer;

  font-size: 10px;
  color: #fff;
  text-align: center;
  line-height: 15px;
}

.count-dot:hover {
  /* 轻微放大 */
  transform: scale(1.15);
  /* 外发光光晕，强化视觉焦点 */
  box-shadow: 0 0 8px rgba(255, 77, 79, 0.8);
  /* 可选：加深背景色，增强对比 */
  background-color: #ff2e2f;
}
</style>
