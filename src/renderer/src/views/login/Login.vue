<template>
  <div class="login-count">
    <span></span>
    <div class="login-top">
      <h1 class="title">登录</h1>
    </div>
    <div class="login-mid">
      <el-form class="login-form" :model="loginForm" ref="ruleFormRef" :rules="rules" @keyup.enter="handleEnterLogin">
        <el-form-item prop="username">
          <el-input placeholder="请输入账号" v-model="loginForm.account" spellcheck="false" clearable>
            <template #prepend>
              <el-icon>
                <User />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input placeholder="请输入密码" type="password" v-model="loginForm.password" spellcheck="false" clearable>
            <template #prepend>
              <el-icon>
                <Lock />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="verifyCode" class="login-verify">
          <el-input placeholder="请输入验证码" v-model="loginForm.verifyCode" spellcheck="false" clearable />
          <img :src="verifyCodeImg" alt="验证码" class="login-verifyImg" @click="refreshVerifyCode" />
        </el-form-item>
        <div class="login-form-button">
          <el-button type="primary" @click="Login(ruleFormRef)" :loading="isLoading">登录</el-button>
          <el-button type="primary" @click="Register">注册</el-button>
        </div>
      </el-form>
    </div>
    <div class="login-bottom">
      <router-link to="" class="login-bottom-reset">重置密码</router-link>
    </div>
  </div>
  <WindowControls :showSetTop="false" :showSetMiniSize="false" :showSetFullScreen="false" windowType="mainWindow" />
</template>

<script lang="ts" setup>
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginApi, verifyCodeApi } from '../../api/User'
import WindowControls from '../../components/WindowControls.vue'

onMounted(() => {
  refreshVerifyCode()
})

const router = useRouter()
const ruleFormRef = ref<FormInstance>()
const isLoading = ref(false)
const verifyCodeImg = ref('')

const refreshVerifyCode = async () => {
  try {
    // 关键：请求图片流必须指定 responseType: 'blob'
    const res = await verifyCodeApi({
      // 告诉 axios 接收二进制流
      responseType: 'blob'
    })
    // 把二进制流转成图片 URL
    verifyCodeImg.value = URL.createObjectURL(res as any)
  } catch (err) {
    console.error('获取验证码失败', err)
  }
}

const loginForm = reactive({
  account: '',
  password: '',
  verifyCode: ''
})

const rules = reactive<FormRules>({
  account: [{ required: true, message: '账号不能为空', trigger: 'change' }],
  password: [{ required: true, message: '密码不能为空', trigger: 'change' }],
  verifyCode: [{ required: true, message: '验证码不能为空', trigger: 'change' }]
})

// 回车触发登录
const handleEnterLogin = () => {
  Login(ruleFormRef.value)
}

const Login = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  try {
    // 验证成功会进入这里，失败会直接跳去 catch
    await formEl.validate()
    isLoading.value = true
    const result: any = await loginApi(loginForm)
    const status = result.code
    if (status === 1) {
      (window as any).userInfoApi.storeSetUserInfo('userId', result.data.id);
      (window as any).userInfoApi.storeSetUserInfo('avatar', result.data.avatar);
      (window as any).userInfoApi.storeSetUserInfo('username', result.data.username);
      (window as any).userInfoApi.storeSetUserInfo('phone', result.data.phone);
      (window as any).userInfoApi.storeSetUserInfo('account', result.data.account);
      (window as any).userInfoApi.storeSetUserInfo('gender', result.data.gender);

      // 判断当前登录是否需要初始化
      const isNeed = await (window as any).loadApi.isNeedInitData()
      if (!isNeed) {
        // 不需要，更新离线数据
        // 等待更新成功的通知
        await (window as any).dbApi.updateDBData()
        await router.push('/main')
        await (window as any).windowToolApi.resizeWindow('main')
      } else {
        // 等待通知在路由跳转
        await new Promise(resolve => {
          (window as any).loadApi.onDataInitComplete(resolve)
        })
        await router.push('/main')
        await (window as any).windowToolApi.resizeWindow('main')
      }
    } else {
      ElMessage.error(result.msg)
      isLoading.value = false
    }
  } catch (error) {
    console.log('error submit!', error)
    ElMessage.error('登录失败')
    isLoading.value = false
  }
}

const Register = () => {
  router.push('/register');
  (window as any).windowToolApi.resizeWindow('register')
}
</script>

<style scoped>
@import '../../css/account.css';



.login-mid {
  -webkit-app-region: no-drag;
}

.login-verify {
  display: flex;
  flex-wrap: nowrap;
  width: 100%;
}

.login-verify .el-input {
  /* 让输入框占据剩余空间 */
  flex: 1;
  /* 增加输入框和图片之间的间距 */
  margin-right: 10px;
}

.login-verifyImg {
  width: auto;
  height: 40px;
}

.login-bottom {
  display: flex;
  justify-content: end;
  margin-top: 20px;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-style: italic;
  text-align: center;
  color: #ffffff;
  text-decoration: underline;
  -webkit-app-region: no-drag;
}
</style>
