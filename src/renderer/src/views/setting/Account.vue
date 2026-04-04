<template>
  <div class="account-count">
    <div class="account-info">
      <img class="avatar" :src="avatarUrl" alt="" />
      <div class="account-info-item">
        <div>
          账号: {{ account }}
        </div>
        <div>
          邮箱: {{ email }}
        </div>
        <div>
          手机号: {{ phone }}
        </div>
        <div>
          生日: {{ birthday }}
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
      <el-form label-width="auto" style="max-width: 600px">
        <el-form-item label="账号">
          <el-input v-model="accountTemp" clearable />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="emailTemp" clearable />
        </el-form-item>
        <el-form-item label="生日">
          <el-col>
            <el-date-picker value-format="YYYY-MM-DD" v-model="birthdayTemp" type="date" placeholder="选择生日"
              style="width: 100%" />
          </el-col>
        </el-form-item>
        <el-form-item class="button">
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
const imagePath = ref(new URL('/wallpaper/1.jpg', import.meta.url).href)

const imageList = ref([
  new URL('/wallpaper/1.jpg', import.meta.url).href,
  new URL('/wallpaper/2.jpg', import.meta.url).href,
  new URL('/wallpaper/3.jpg', import.meta.url).href,
  new URL('/wallpaper/4.jpg', import.meta.url).href,
  new URL('/wallpaper/5.jpg', import.meta.url).href,
  new URL('/wallpaper/6.jpg', import.meta.url).href,
])

const account = ref()
const email = ref('无')
const phone = ref()
const birthday = ref('无')

const accountTemp = ref()
const emailTemp = ref()
const birthdayTemp = ref()

const showLinkDialog = ref(false)

const onSubmit = () => {
  account.value = accountTemp.value
  email.value = emailTemp.value
  birthday.value = birthdayTemp.value

  const data = {
    account: accountTemp.value,
    email: emailTemp.value,
    birthday: birthdayTemp.value
  }
}

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
  padding: 30px 0;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.3);
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.account-info-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  margin-left: 30px;
  gap: 14px;
  font-size: 17px;
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  line-height: 1.4;
}

.account-info-item>div:hover {
  color: #a0c8ff;
  text-decoration: none;
  transition: all 0.2s ease;
}

.account-info-item a {
  color: #a0c8ff;
  text-decoration: none;
  font-size: 16px;
  margin-top: 6px;
  transition: all 0.2s ease;
}

.account-info-item a:hover {
  color: #c6e0ff;
  text-decoration: underline;
  transform: translateY(-1px);
}

.wallpaper {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px 0 40px;
  box-sizing: border-box;
}

.preview {
  width: 100%;
  height: 250px;
  margin-bottom: 20px;
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
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.el-button) {
  background-color: rgba(107, 124, 140, 0.9);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 12px 36px;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
}

:deep(.el-button:hover) {
  background-color: rgba(90, 106, 122, 0.95);
  color: #ffffff;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.25);
  transform: translateY(-2px);
}

:deep(.el-button:active) {
  background-color: rgba(78, 92, 106, 0.95);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transform: translateY(0);
}

:deep(.el-form-item__content) {
  display: flex;
  justify-content: center;
  align-items: center;
}

.button {
  padding-top: 20px;
}

:deep(.el-dialog) {
  background: rgba(28, 38, 50, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(66, 153, 225, 0.3);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid rgba(66, 153, 225, 0.2);
  padding: 16px 20px;
  margin: 0;
}

:deep(.el-dialog__title) {
  color: #f0f0f0;
  font-size: 18px;
  font-weight: 500;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #f0f0f0;
  font-size: 18px;
  transition: color 0.2s ease;
}

:deep(.el-dialog__headerbtn .el-dialog__close:hover) {
  color: #ffffff;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-form-item__label) {
  color: #f0f0f0;
  font-size: 14px;
  font-weight: 400;
  line-height: 48px;
}

:deep(.el-dialog .el-input__wrapper) {
  background: rgba(20, 25, 35, 0.8);
  border: 1px solid rgba(66, 153, 225, 0.4);
  border-radius: 8px;
  box-shadow: none;
  padding: 0 16px;
  height: 48px;
}

:deep(.el-dialog .el-input__inner) {
  color: #f0f0f0;
  font-size: 16px;
  background: transparent;
  border: none;
}

:deep(.el-dialog .el-input__placeholder) {
  color: rgba(240, 240, 240, 0.5);
}

:deep(.el-dialog .el-input__wrapper:focus-within) {
  border-color: rgba(66, 153, 225, 0.8);
  box-shadow: 0 0 10px rgba(66, 153, 225, 0.2);
}

:deep(.el-dialog .el-date-picker) {
  width: 100%;
}

:deep(.el-dialog .el-date-picker__wrapper) {
  background: rgba(20, 25, 35, 0.8);
  border: 1px solid rgba(66, 153, 225, 0.4);
  border-radius: 8px;
  height: 48px;
}

:deep(.el-dialog .el-date-picker__input) {
  color: #f0f0f0;
  font-size: 16px;
}

:deep(.el-dialog .el-date-picker__placeholder) {
  color: rgba(240, 240, 240, 0.5);
}

:deep(.el-dialog .el-date-picker__wrapper:focus-within) {
  border-color: rgba(66, 153, 225, 0.8);
  box-shadow: 0 0 10px rgba(66, 153, 225, 0.2);
}

:deep(.el-dialog__footer) {
  border-top: 1px solid rgba(66, 153, 225, 0.2);
  padding: 12px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-dialog__footer .el-button) {
  padding: 8px 20px;
  border: 1px solid rgba(66, 153, 225, 0.3);
  background: rgba(35, 45, 60, 0.7);
  color: #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

:deep(.el-dialog__footer .el-button:hover) {
  background: rgba(66, 153, 225, 0.2);
  border-color: rgba(66, 153, 225, 0.5);
  transform: translateY(-1px);
  color: #f0f0f0;
}

:deep(.el-dialog__footer .el-button--primary) {
  background: rgba(66, 153, 225, 0.4);
  border-color: rgba(66, 153, 225, 0.6);
  color: #fff;
}

:deep(.el-dialog__footer .el-button--primary:hover) {
  background: rgba(66, 153, 225, 0.6);
  border-color: rgba(66, 153, 225, 0.8);
  color: #fff;
}
</style>
