<template>
  <div class="chat-count">
    <div class="chat-title">聊天窗口: {{ route.query.friendId }}</div>
    <div class="chat-content">
      <el-scrollbar>
        <div class="chat-message" v-for="(item, index) in arr.list" :key="index">
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
      <el-input
        v-model="message"
        type="textarea"
        :rows="4"
        resize="none"
        placeholder="请输入消息"
        spellcheck="false"
        clearable
      />
    </div>
    <div class="sendButton">
      <el-button type="success" @click="sendMessage">发送</el-button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { sendMessageApi, getMessageListApi } from '../../api/Message'
import { Eleme, Folder, Scissor, VideoCamera } from '@element-plus/icons-vue'

const route = useRoute()
const message = ref('')
const arr = reactive({ list: [] })

const sendMessage = () => {
  console.info('接收消息用户的ID:', route.query.friendId, '消息内容:', message.value)
  sendMessageApi({ receiverId: route.query.friendId, content: message.value }).then((res) => {
    console.info('发送消息成功', res)
    message.value = ''
  })
}

const getList = () => {
  getMessageListApi({ receiverId: route.query.friendId }).then((res) => {
    console.info('获取消息列表成功', res)
    arr.list = res.data
  })
}

onMounted(() => {
  getList()
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
  margin: 0 auto;
  height: 120px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
}

.chat-input :deep(.el-textarea__inner) {
  background-color: #2b3e49;
  color: #ffffff;
  box-shadow: none; /* 移除可能的阴影 */
}

.sendButton {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.el-button {
  width: 100px;
  margin: 0 10px 5px 0;
}
</style>
