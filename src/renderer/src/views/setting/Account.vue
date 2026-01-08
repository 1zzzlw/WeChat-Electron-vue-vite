<template>
  <div class="account-count">
    <div class="account-info">
      <img class="avatar" :src="imageUrl" alt="" />
      <div class="account-info-item">
        <div>
          账号:
          <input type="text" />
        </div>
        <div>
          密码:
          <input type="password" />
        </div>
        <div>
          手机号:
          <input type="text" />
        </div>
        <div>
          生日:
          <input type="date" />
        </div>
      </div>
    </div>
    <div class="wallpaper">
      <div>当前壁纸预览</div>
      <div>切换壁纸</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

const imageUrl = ref('')

onMounted(async () => {
  imageUrl.value = await window.userInfoApi.storeGetUserInfo('avatar')
})
</script>

<style scoped>
.account-count {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 100%;
  -webkit-app-region: no-drag;
}

.account-info {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 250px;
  padding: 60px;
  border-bottom: 1px solid #eee;
}

.avatar {
  width: 150px;
  height: 150px;
  border-radius: 50%;
}

.account-info-item {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: 100%;
  margin-left: 20px;
  gap: 10px;
}

.wallpaper {
  flex: 1;
}
</style>
