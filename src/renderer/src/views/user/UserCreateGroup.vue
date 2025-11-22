<template>
  <div class="createGroup-count">
    <div class="count-left">
      <div class="title">联系人</div>
      <div class="contact-list">
        <el-scrollbar>
          <div v-for="item in 100" :key="item" class="scrollbar-demo-item">{{ item }}</div>
        </el-scrollbar>
      </div>
    </div>
    <div class="count-right">
      <div class="title">选择联系人: {{ count }}</div>
      <div class="contact-list">
        <el-scrollbar>
          <div v-for="item in 100" :key="item" class="scrollbar-demo-item">{{ item }}</div>
        </el-scrollbar>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<style scoped>
.title {
  -webkit-app-region: drag;
}

.createGroup-count {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  background-color: #2b3e49;
}

.count-left {
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  border-right: 1px solid #ffffff;
}

.contact-list {
  width: 85%;
  height: 85%;
  background-color: #67c23a;
  border-radius: 5px;
  margin-bottom: 30px;
  overflow: hidden;
}

.count-right {
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}
</style>
