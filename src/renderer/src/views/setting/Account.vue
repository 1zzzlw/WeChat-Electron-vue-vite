<template>
  <div class="account-count">
    <section class="account-info">
      <img class="avatar" :src="profile.avatar" alt="我的头像" />
      <div class="account-info-item">
        <p class="account-eyebrow">PERSONAL PROFILE</p>
        <h1>{{ profile.username || '我的账号' }}</h1>
        <p class="account-id">账号 · {{ profile.account || '未填写' }}</p>
        <el-button @click="openEditDialog" :disabled="!profileLoaded">修改账号信息</el-button>
      </div>
    </section>
    <div v-if="profileError" class="profile-error" role="alert">
      {{ profileError }} <el-button text @click="loadProfile">重新加载</el-button>
    </div>
    <dl class="account-details">
      <div v-for="item in details" :key="item.label">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value || '未填写' }}</dd>
      </div>
    </dl>
    <AppearanceSwitcher />
    <el-dialog
      v-model="showLinkDialog"
      title="修改账号信息"
      width="min(480px, calc(100vw - 40px))"
      :close-on-click-modal="!saving"
      :close-on-press-escape="!saving"
      :show-close="!saving"
    >
      <el-form label-position="top" @submit.prevent="onSubmit">
        <div class="profile-form-grid">
          <el-form-item label="昵称"
            ><el-input
              v-model="draft.username"
              maxlength="32"
              :disabled="saving"
              placeholder="你的名字" /></el-form-item
          ><el-form-item label="性别"
            ><el-select v-model="draft.gender" :disabled="saving"
              ><el-option label="未填写" :value="-1" /><el-option label="男" :value="1" /><el-option
                label="女"
                :value="0" /></el-select
          ></el-form-item>
        </div>
        <el-form-item label="账号"
          ><el-input
            v-model="draft.account"
            maxlength="64"
            placeholder="字母、数字或下划线"
            :disabled="saving"
        /></el-form-item>
        <el-form-item label="手机号"
          ><el-input :model-value="profile.phone" readonly /><small class="phone-hint"
            >用于登录的手机号</small
          ></el-form-item
        >
        <el-form-item label="邮箱"
          ><el-input
            v-model="draft.email"
            maxlength="100"
            placeholder="选填"
            :disabled="saving"
            clearable
        /></el-form-item>
        <el-form-item label="地址"
          ><el-input
            v-model="draft.address"
            maxlength="255"
            placeholder="选填"
            :disabled="saving"
            clearable
        /></el-form-item>
        <el-form-item label="生日"
          ><el-date-picker
            v-model="draft.birthday"
            value-format="YYYY-MM-DD"
            type="date"
            placeholder="选择生日"
            style="width: 100%"
            :disabled="saving"
            :disabled-date="(date) => date > new Date()"
        /></el-form-item>
      </el-form>
      <template #footer
        ><el-button :disabled="saving" @click="showLinkDialog = false">取消</el-button
        ><el-button type="primary" :loading="saving" @click="onSubmit"
          >保存修改</el-button
        ></template
      >
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getMyProfileApi, updateUserInfoApi } from '@/api/User'
import emitter from '@/utils/mitt'
import AppearanceSwitcher from '@/components/AppearanceSwitcher.vue'

const profile = reactive({
  username: '',
  avatar: '',
  account: '',
  gender: -1,
  email: '',
  phone: '',
  birthday: '',
  address: ''
})
const draft = reactive({
  username: '',
  account: '',
  gender: -1,
  email: '',
  birthday: '',
  address: ''
})
const details = computed(() => [
  { label: '性别', value: profile.gender === 1 ? '男' : profile.gender === 0 ? '女' : '未填写' },
  { label: '手机号', value: profile.phone },
  { label: '邮箱', value: profile.email },
  { label: '地址', value: profile.address },
  { label: '生日', value: profile.birthday }
])
const showLinkDialog = ref(false),
  saving = ref(false),
  profileLoaded = ref(false),
  profileError = ref('')
const applyProfile = async (data) => {
  for (const key of Object.keys(profile)) profile[key] = data[key] ?? (key === 'gender' ? -1 : '')
  await Promise.all(
    Object.keys(profile).map((key) => window.userInfoApi.storeSetUserInfo(key, profile[key]))
  )
}
const loadProfile = async () => {
  profileError.value = ''
  try {
    const result = await getMyProfileApi()
    if (result.code !== 1 || !result.data) throw new Error(result.msg || '资料加载失败')
    await applyProfile(result.data)
    profileLoaded.value = true
  } catch (error) {
    profileError.value = error.message || '资料加载失败，请重试'
  }
}
const openEditDialog = () => {
  if (!profileLoaded.value) return
  for (const key of Object.keys(draft)) draft[key] = profile[key]
  showLinkDialog.value = true
}
const onSubmit = async () => {
  if (saving.value) return
  const data = {
    ...draft,
    username: draft.username.trim(),
    account: draft.account.trim(),
    email: draft.email.trim(),
    address: draft.address.trim(),
    birthday: draft.birthday || null
  }
  if (!data.username || data.username.length > 32) {
    ElMessage.warning('昵称长度需在1-32个字符之间')
    return
  }
  if (!/^[A-Za-z0-9_]{1,64}$/.test(data.account)) {
    ElMessage.warning('账号限64位以内的字母、数字或下划线')
    return
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    ElMessage.warning('请输入有效的邮箱地址')
    return
  }
  saving.value = true
  try {
    const result = await updateUserInfoApi({ ...data, email: data.email || null })
    if (result.code !== 1 || !result.data) throw new Error(result.msg || '修改失败')
    await applyProfile(result.data)
    emitter.emit('profile:updated', { userId: result.data.id })
    ElMessage.success('修改成功')
    showLinkDialog.value = false
  } catch (error) {
    ElMessage.error(error.message || '修改失败')
  } finally {
    saving.value = false
  }
}
onMounted(loadProfile)
</script>

<style scoped>
.account-count {
  height: 100%;
  overflow-y: auto;
  padding: 24px 0;
  -webkit-app-region: no-drag;
}
.account-info {
  display: flex;
  align-items: center;
  gap: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border-subtle);
}
.avatar {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-lg);
  object-fit: cover;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-surface-2);
}
.account-info-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  overflow-wrap: anywhere;
}
.account-eyebrow {
  font-size: 9px;
  letter-spacing: 1.5px;
  color: var(--color-text-muted);
}
h1 {
  color: var(--color-text-strong);
  font-size: 22px;
  font-weight: 600;
}
.account-id {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.account-info-item .el-button {
  margin-top: 6px;
}
.account-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 32px;
  padding: 24px 0;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--color-border-subtle);
}
dt {
  color: var(--color-text-muted);
  font-size: 11px;
  margin-bottom: 7px;
}
dd {
  color: var(--color-text-primary);
  font-size: 13px;
  overflow-wrap: anywhere;
  user-select: text;
}
.profile-error {
  color: var(--color-danger);
  font-size: 12px;
  padding-top: 12px;
}
.profile-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 16px;
}
.phone-hint {
  color: var(--color-text-muted);
  font-size: 10px;
  padding-top: 4px;
}
</style>
