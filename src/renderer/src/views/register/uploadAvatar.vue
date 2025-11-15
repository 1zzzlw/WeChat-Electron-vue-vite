<template>
  <div class="uploadAvatar-count">
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

const router = useRouter()
const route = useRoute()
// 存储预览图片的临时URL
const imageUrl = ref('')

const userInfo = reactive({
  username: '',
  phone: '',
  password: '',
  gender: '',
  // 缓存选中的文件对象（用于后续上传）
  avatar: ''
})

const handleClick = async () => {
  const filePath = await window.api.selectAvatar()
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
      // 登录成功后，将token存储到本地
      window.api.storeSetAvatar(userInfo.avatar)
      window.api.storeSetToken(res.data)
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
  userInfo.username = route.query?.username || ''
  userInfo.phone = route.query?.phone || ''
  userInfo.password = route.query?.password || ''
  userInfo.gender = route.query?.gender || ''
})
</script>

<style scoped>
.uploadAvatar-count {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: #2b3e49;
  padding: 20px;
  -webkit-app-region: drag;
}

.title {
  text-align: center;
}

.uploadAvatar-top {
  margin-bottom: 30px;
}

.uploadAvatar-mid {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 30px;
  margin-bottom: 30px;
  -webkit-app-region: no-drag;
}

.avatar {
  width: 100%;
  height: 100%;
}

.avatar-uploader-icon {
  font-size: 40px;
  color: #8c939d;
}

.uploadAvatar-bottom {
  display: flex;
  margin-top: 30px;
  -webkit-app-region: no-drag;
  justify-content: space-around;
}

.uploadAvatar-bottom button {
  width: 50%;
}
</style>
