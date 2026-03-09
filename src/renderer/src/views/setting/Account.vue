<template>
  <div class="account-count">
    <div class="account-info">
      <img class="avatar" :src="avatarUrl" alt="" />
      <div class="account-info-item">
        <div>
          账号: {{ account }}
        </div>
        <div>
          邮箱: {{ }}
        </div>
        <div>
          手机号: {{ phone }}
        </div>
        <div>
          生日: {{ }}
        </div>
        <a @click="showLinkDialog = true">修改账号信息</a>
      </div>
    </div>
    <div class="wallpaper">
      <div class="preview">
        <el-carousel type="card" height="220px" trigger="click" :autoplay="false" @change="selectWallpaper">
          <el-carousel-item v-for="item in imageList" :key="item">
            <img :src=item alt="">
          </el-carousel-item>
        </el-carousel>
      </div>
      <div style="display: flex; justify-content: center;">
        <el-button @click="changeWallpaper">切换壁纸</el-button>
      </div>
    </div>
    <el-dialog v-model="showLinkDialog" title="修改账号信息" width="400px">
      <el-form :inline="true" label-width="auto" style="max-width: 600px">
        <el-form-item label="账号">
          <el-input clearable />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input clearable />
        </el-form-item>
        <el-form-item label="生日">
          <el-col :span="11">
            <el-date-picker type="date" placeholder="Pick a date" style="width: 100%" />
          </el-col>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSubmit">保存</el-button>
          <el-button>取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

const avatarUrl = ref('')
const imagePath = ref('/wallpaper/1.jpg')

const imageList = ref([
  '/wallpaper/1.jpg',
  '/wallpaper/2.jpg',
  '/wallpaper/3.jpg',
  '/wallpaper/4.jpg',
  '/wallpaper/5.jpg',
  '/wallpaper/6.jpg',
])

const account = ref()
const email = ref()
const phone = ref()
const birthday = ref()

const showLinkDialog = ref(false)

const selectWallpaper = (current, prev) => {
  imagePath.value = imageList.value[current]
}

const changeWallpaper = () => {
  console.log(imagePath.value)
  document.body.style.backgroundImage = `url(${imagePath.value})`
  window.windowToolApi.sendWindowWallpaper(imagePath.value)
}

onMounted(async () => {
  avatarUrl.value = await window.userInfoApi.storeGetUserInfo('avatar')
  account.value = await window.userInfoApi.storeGetUserInfo('account')
  phone.value = await window.userInfoApi.storeGetUserInfo('phone')
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.avatar {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
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
  width: 100%;
}

.preview {
  width: 100%;
  height: 250px;
}

:deep(.el-carousel__indicators) {
  display: none
}

:deep(.el-carousel__item) {
  background-color: transparent;
}

:deep(.el-carousel__item--card) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.el-carousel__mask) {
  display: none;
}

.preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:deep(.el-button) {
  background-color: #6b7c8c;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: none;
}

:deep(.el-button:hover) {
  background-color: #5a6a7a;
  color: #ffffff;
}

:deep(.el-button:active) {
  background-color: #4e5c6a;
  color: #ffffff;
}
</style>
