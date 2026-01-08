<template>
  <div class="setting-store-location">
    <div class="location-count">
      <div class="location-title">存储位置</div>
      <div class="change">
        <span class="context">{{ location }}</span>
        <el-icon @click="choose" class="icon"><More /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

const location = ref('')

const choose = () => {
  console.info('选择存储位置')
  window.api.selectFile('storeLocation').then((filePath) => {
    if (filePath) {
      location.value = filePath
      console.info('选择的存储位置:', filePath)
      // 将选择的路径保存到本地
      window.userInfoApi.storeSetUserInfo('storeLocation', filePath)
      console.info('存储位置已保存')
    }
  })
}

onMounted(async () => {
  location.value = (await window.userInfoApi.storeGetUserInfo('storeLocation')) || ''
})
</script>

<style scoped>
.setting-store-location {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  -webkit-app-region: no-drag;
}

.location-count {
  width: 200px;
  height: 100px;
  position: relative;
  background-color: #8c939d;
  border-radius: 20px;
  display: flex;
  align-items: center;
}

.location-title {
  position: absolute;
  top: 5px;
  left: 5px;
  font-weight: bold;
  color: #fff;
}

.change {
  width: 100%;
  height: 100%;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
}

.context {
  width: 160px;
  font-size: 16px;
  color: #74859c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon {
  font-size: 20px;
  transition: all 0.3s ease-in-out;
}

.icon:hover {
  color: #fff;
  cursor: pointer;
}
</style>
