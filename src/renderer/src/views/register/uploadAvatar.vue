<template>
  <div class="uploadAvatar-count">
    <span></span>
    <div class="register-top">
      <h1 class="title">注册</h1>
    </div>
    <div class="uploadAvatar-top">
      <div class="title">上传头像</div>
    </div>
    <div class="uploadAvatar-mid">
      <img v-if="imageUrl" :src="imageUrl" class="avatar" alt="头像" />
      <el-icon v-else class="avatar-uploader-icon" @click="handleClick">
        <Plus />
      </el-icon>
    </div>
    <div class="uploadAvatar-bottom">
      <el-button type="primary" @click="returnStep">返回</el-button>
      <el-button type="primary" @click="submitForm">完成</el-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { registerApi } from '../../api/Register'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRegisterInfoStore } from '../../stores/RegisterInfoStore'

interface UserInfo {
  username: string
  phone: string
  password: string
  gender: string
  // 缓存选中的文件对象
  avatar: string
}

const registerInfoStore = useRegisterInfoStore()
const router = useRouter()
const route = useRoute()
// 存储预览图片的临时URL
const imageUrl = ref('')

const userInfo = reactive<UserInfo>({
  username: '',
  phone: '',
  password: '',
  gender: '',
  // 缓存选中的文件对象（用于后续上传）
  avatar: ''
})

const handleClick = async () => {
  const filePath = await window.api.selectFile('avatar')
  console.log(filePath)
  if (filePath) {
    // 预览选中的图片
    imageUrl.value = filePath
    console.log(imageUrl.value)
    // 缓存文件对象，后续上传时使用
    userInfo.avatar = filePath
  }
}

const submitForm = () => {
  // 检查是否有文件选中
  if (!userInfo.avatar) {
    ElMessage.warning('请选择照片')
    return
  }
  // 调用注册接口
  registerApi(userInfo).then((res) => {
    if (res.code === 1) {
      console.info('注册成功:', res)
      ElMessage.success('注册成功')
      // 注册成功后，将用户头像和用户id存储到本地
      window.userInfoApi.storeSetUserInfo('avatar', userInfo.avatar)
      window.userInfoApi.storeSetUserInfo('userId', res.data)

      // 清空缓存的注册信息
      registerInfoStore.$reset()

      router.push('/main')
      window.api.resizeWindow('main')
    } else {
      ElMessage.error('注册失败')
    }
  })
}

const returnStep = () => {
  router.push({
    path: '/registerUserInfo',
    query: { username: userInfo.username, phone: userInfo.phone }
  })
}

onMounted(() => {
  userInfo.username = (route.query?.username as string) || ''
  userInfo.phone = (route.query?.phone as string) || ''
  userInfo.password = (route.query?.password as string) || ''
  userInfo.gender = (route.query?.gender as string) || ''
})
</script>

<style scoped>
@import '../../css/account.css';

.title {
  text-align: center;
  color: #fff; /* 适配深色背景的白色文字 */
}

/* 上传区域：调整尺寸+hover效果 */
.uploadAvatar-mid {
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-app-region: no-drag;
  width: 180px; /* 适配头像显示尺寸 */
  height: 180px;
  margin: 30px auto;
}

/* 已上传头像：加圆角+hover放大 */
.avatar {
  width: 100%;
  height: 100%;
  border-radius: 8px; /* 轻微圆角更精致 */
  transition: transform 0.2s ease;
}
.avatar:hover {
  transform: scale(1.03); /* 头像hover轻微放大 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); /* 增强阴影 */
}

/* 上传图标：调整样式+hover效果 */
.avatar-uploader-icon {
  font-size: 40px;
  color: rgba(255, 255, 255, 0.7); /* 浅白图标适配背景 */
  cursor: pointer;
  transition: color 0.2s ease;
}

.avatar-uploader-icon:hover {
  color: #ff76e0; /* 注册页粉紫调hover色 */
}

/* 底部按钮：hover效果 */
.uploadAvatar-bottom {
  display: flex;
  margin-top: 30px;
  -webkit-app-region: no-drag;
  justify-content: space-around;
}

/* 给el-button加hover效果 */
:deep(.el-button) {
  transition: all 0.2s ease;
}

:deep(.el-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
}
</style>
