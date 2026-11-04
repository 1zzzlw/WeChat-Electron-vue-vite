<template>
  <section class="person-settings">
    <h2>生活与通知</h2>
    <p>时间窗口决定生活推进的节奏，每次都可以平淡地继续。</p>
    <label
      >生活推进窗口（分钟）<input v-model.number="windowMinutes" type="number" min="5" max="1440"
    /></label>
    <label><input v-model="online" type="checkbox" />向伙伴公开在线状态</label>
    <label><input v-model="read" type="checkbox" />公开已读状态</label>
    <label><input v-model="typing" type="checkbox" />公开输入状态</label>
    <label><input v-model="muted" type="checkbox" />消息免打扰</label>
    <button :disabled="busy" @click="save">保存偏好</button><span role="status">{{ notice }}</span>
    <h2>模型使用</h2>
    <p>
      聊天窗口只切换对话的语言模型。记忆、回忆、生活以及图片和语音能力由服务端统一提供，不随聊天模型切换。
    </p>
  </section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getPersonSettings, savePersonSettings } from '@/api/AgentPerson'
const props = defineProps<{ userId: string }>()
const windowMinutes = ref(60),
  online = ref(true),
  read = ref(true),
  typing = ref(true),
  muted = ref(false)
const busy = ref(false),
  notice = ref('')
onMounted(async () => {
  try {
    const settings = await getPersonSettings(props.userId)
    windowMinutes.value = settings.lifeWindowMinutes || 60
    online.value = settings.presenceVisibility?.online ?? true
    read.value = settings.presenceVisibility?.read ?? true
    typing.value = settings.presenceVisibility?.typing ?? true
    muted.value = settings.notifications?.muted ?? false
  } catch {
    notice.value = '设置暂时无法加载'
  }
})
async function save() {
  busy.value = true
  try {
    await savePersonSettings({
      userId: props.userId,
      lifeWindowMinutes: windowMinutes.value,
      onlineVisible: online.value,
      readVisible: read.value,
      typingVisible: typing.value,
      muted: muted.value
    })
    notice.value = '已保存'
  } catch {
    notice.value = '保存失败，请重试'
  } finally {
    busy.value = false
  }
}
</script>
<style scoped>
.person-settings {
  max-width: 820px;
  margin: 30px auto;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-subtle);
}
h2 {
  margin-top: 30px;
  font-size: 19px;
  font-weight: 500;
}
p,
label {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.9;
}
label {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  max-width: 500px;
  margin: 12px 0;
}
input[type='checkbox'] {
  margin-left: auto;
  order: 2;
}
input[type='number'] {
  width: 240px;
  padding: 8px;
  border: 1px solid var(--color-border-subtle);
  border-radius: 8px;
  background: var(--color-surface-1);
  color: var(--color-text-primary);
}
button {
  border: 0;
  padding: 10px 16px;
  border-radius: 8px;
  background: var(--color-accent);
  color: var(--color-on-accent);
  margin-right: 12px;
}
span {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
