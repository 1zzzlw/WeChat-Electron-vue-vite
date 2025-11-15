<template>
  <div class="chat-count">
    <div class="chat-title">聊天窗口: {{ route.query.friendId }}</div>
    <div class="chat-content">
      <el-scrollbar>
        <div class="chat-message" v-for="item in 100" :key="item">
          <div class="chat-list-left">
            <img src="../../assets/image/1.jpg" class="list-image" />
            <div class="left-msg">aaadwqwfwewefwefwefawefqewfewtrfwertgwedgerf wefwefwefwaa</div>
          </div>
          <div class="chat-list-right">
            <img src="../../assets/image/2.jpg" class="list-image" />
            <div class="right-msg">bbbbbb</div>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <div class="chat-tool">
      <el-button :icon="Eleme" size="large" square></el-button>
      <el-button :icon="Folder" size="large" square></el-button>
      <el-button :icon="Scissor" size="large" square></el-button>
      <el-button :icon="VideoCamera" size="large" square></el-button>
    </div>
    <div class="chat-input">
      <el-input v-model="message" placeholder="请输入消息" clearable />
      <el-button type="primary" @click="sendMessage">发送</el-button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Eleme, Folder, Scissor, VideoCamera } from '@element-plus/icons-vue'

const route = useRoute()
const friendId = ref('')

onMounted(() => {
  friendId.value = route.query.friendId
})
</script>

<style scoped>
.chat-count {
  /* 设置宽度和高度，确保有足够空间展示居中效果 */
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-color: #2b3e49;
  -webkit-app-region: no-drag;
}

.chat-title {
  height: 70px;
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #ffffff;
  -webkit-app-region: drag;
}

.chat-content {
  flex: 1;
  overflow: hidden;
}

img {
  width: 50px;
  height: 50px;
  border-radius: 10px;
}

.chat-list-left {
  padding: 20px;
  display: flex;
  flex-direction: row;
}

.chat-list-right {
  padding: 20px;
  display: flex;
  flex-direction: row-reverse;
}

.chat-tool {
  height: 30px;
  display: flex;
  align-items: center;
  border-top: 1px solid #ffffff;
  overflow: hidden;
}

.chat-tool button {
  width: 30px;
  height: 30px;
  margin: 0;
  font-size: 20px;
  background-color: transparent;
  border: none;
}

.chat-input {
  height: 100px;
  display: flex;
  align-items: center;
}
</style>
