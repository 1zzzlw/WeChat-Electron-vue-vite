<template>
  <div class="main-count">
    <div class="main-count-left">
      <div class="main-count-left-top">
        <img :src="avatarUrl" alt="头像" class="main-count-left-top-img" />
        <router-link tag="div" to="/messageList" class="left-icon">
          <el-icon size="30"><ChatRound /></el-icon>
        </router-link>
        <router-link tag="div" to="/list" class="left-icon">
          <el-icon size="30"><UserFilled /></el-icon>
        </router-link>
        <router-link tag="div" to="/collect" class="left-icon">
          <el-icon size="30"><Star /></el-icon>
        </router-link>
      </div>
      <div class="main-count-left-bottom">
        <router-link tag="div" to="" class="left-icon">
          <el-icon size="30"><MoreFilled /></el-icon>
        </router-link>
      </div>
    </div>
    <div class="main-count-right">
      <router-view></router-view>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { mainAvatarApi } from '../../api/User'

const avatarUrl = ref('')

onMounted(async () => {
  // const result = await mainAvatarApi()
  // const status = result.code
  // if (status === 1) {
  //   avatarUrl.value = result.data
  // }
  // 从本地存储中获取头像
  avatarUrl.value = await window.api.storeGetAvatar()
})
</script>

<style scoped>
.main-count {
  display: flex;
  width: 100%;
  height: 100%;
  background-color: #fff;
}

.main-count-left {
  display: flex;
  /*垂直方向布局*/
  flex-direction: column;
  justify-content: space-between;
  width: 80px;
  background: #242424;
}

.main-count-left-top {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.main-count-left-bottom {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.main-count-left-top-img {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  margin: 15px;
}

.left-icon {
  margin-bottom: 10px;
  /*鼠标移动到这里时变成手*/
  cursor: pointer;
}

.left-icon:hover {
  opacity: 0.5;
}

.main-count-right {
  flex: 1;
  background: red;
}
</style>
