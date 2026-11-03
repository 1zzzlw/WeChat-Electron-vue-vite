<template>
  <div class="uploadAvatar-count">
    <div class="auth-brand"><b>im</b><span>LUMINA / CONNECT</span></div>
    <div class="register-top">
      <h1 class="title">给对话一张面孔</h1>
      <p class="auth-subtitle">03 / 上传头像，完成注册。</p>
    </div>
    <div class="uploadAvatar-mid">
      <button type="button" class="avatar-picker" aria-label="选择或更换头像" @click="handleClick">
        <img v-if="imageUrl" :src="imageUrl" class="avatar" alt="已选择的头像" />
        <el-icon v-else class="avatar-uploader-icon" aria-hidden="true"><Plus /></el-icon>
      </button>
      <input ref="fileInput" style="display: none" type="file" accept="image/*" @change="handleFileChange">
    </div>
    <div class="uploadAvatar-bottom">
      <el-button @click="returnStep">上一步</el-button>
      <el-button type="primary" @click="submitForm">完成</el-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { registerApi } from '@/api/User'
import { useRegisterInfoStore } from '@/stores/modules/RegisterInfoStore'

interface UserInfo {
  username: string
  phone: string
  password: string
  gender: string
}

const registerInfoStore = useRegisterInfoStore()
const router = useRouter()
const route = useRoute()
// 存储预览图片的临时URL
const imageUrl = ref('')
const fileInput = ref<any>(null)
const avatar = ref<File | null>(null)

const userInfo = reactive<UserInfo>({
  username: '',
  phone: '',
  password: '',
  gender: '',
})

const handleClick = async () => {
  fileInput.value?.click();
}

const handleFileChange = (e: any) => {
  const file = e.target.files[0]
  imageUrl.value = URL.createObjectURL(file)
  avatar.value = file
}

const submitForm = async () => {
  // 检查是否有文件选中
  if (avatar.value === null) {
    ElMessage.warning('请选择照片')
    return
  }

  const formData = new FormData()

  formData.append('username', userInfo.username)
  formData.append('phone', userInfo.phone)
  formData.append('password', userInfo.password)
  formData.append('gender', userInfo.gender)
  formData.append('avatarFile', avatar.value)

  // 调用注册接口
  registerApi(formData).then(async (res: any) => {
    if (res.code === 1) {
      console.info('注册成功:', res)
      ElMessage.success('注册成功');
      const userBaseInfo: any = res.data;
      // 注册成功后，将用户id保存到本地
      (window as any).userInfoApi.storeSetUserInfo('userId', userBaseInfo.userId);
      (window as any).userInfoApi.storeSetUserInfo('avatar', userBaseInfo.avatar);
      (window as any).userInfoApi.storeSetUserInfo('username', userBaseInfo.username);
      (window as any).userInfoApi.storeSetUserInfo('phone', userBaseInfo.phone);
      (window as any).userInfoApi.storeSetUserInfo('account', userBaseInfo.account);
      (window as any).userInfoApi.storeSetUserInfo('gender', userBaseInfo.gender);


      // 清空缓存的注册信息
      registerInfoStore.$reset()

      let removeInitListener: (() => void) | undefined
      const enterRequested = new Promise(resolve => {
        removeInitListener = (window as any).loadApi.onDataInitComplete(resolve)
      })
      try {
        const isNeed = await (window as any).loadApi.isNeedInitData()
        if (isNeed) await enterRequested
        await router.push('/main')
        await nextTick()
        await (window as any).windowToolApi.resizeWindow('main')
      } finally {
        removeInitListener?.()
      }
    } else {
      ElMessage.error(res.msg)
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
@import '@/css/account.css';
.uploadAvatar-mid { display: grid; place-items: center; padding: 24px 0; }
.avatar-picker { display: grid; place-items: center; width: 144px; height: 144px; border: 1px dashed var(--color-border-primary); border-radius: var(--radius-lg); background: var(--color-surface-1); cursor: var(--cursor-pointer, pointer); overflow: hidden; }
.avatar { width: 100%; height: 100%; object-fit: cover; }
.avatar-uploader-icon { font-size: 32px; color: var(--color-accent); }
</style>
