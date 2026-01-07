<template>
  <div class="notification" v-if="isOnline">
    <div class="notification-title">好友上线</div>
    <div class="notification-content">
      <img src="../assets/image/2.jpg" alt="" class="notification-avatar" />
      <div class="notification-text">
        <span>张三</span>
        <span>上线了</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import emitter from '../utils/mitt'
import { ref } from 'vue'

const isOnline = ref(false)

// 监听好友上线事件
emitter.on('friendOnline', (data: any) => {
  isOnline.value = true
  console.info('好友上线:', data)

  // 3秒后关闭通知
  setTimeout(() => {
    isOnline.value = false
  }, 3000)
})
</script>

<style scoped>
.notification {
  width: 280px;
  position: absolute;
  top: 30px;
  right: 10px;
  background: #fff;
  border-radius: 10px;
}

.notification-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.notification-content {
  display: flex;
  align-items: center;
  padding: 10px;
}

.notification-avatar {
  width: 40px;
  height: 40px;
}

.notification-text {
  margin-left: 10px;
}
</style>
