<template>
  <section class="creation">
    <span class="eyebrow">初次相识</span>
    <h2>你希望遇见怎样的人？</h2>
    <p>简单说说你的想法。其余的，留给相处慢慢发现。</p>
    <textarea
      v-model="wish"
      maxlength="3000"
      placeholder="比如：一个有自己生活、喜欢观察世界的人…"
      :disabled="busy"
    ></textarea>
    <div class="creation-options">
      <label>相识方式<input v-model="meeting" maxlength="64" /></label>
      <label
        >声线标识<input v-model="voice" maxlength="100" placeholder="由语音模型支持的声线名称"
      /></label>
    </div>
    <button :disabled="busy || !wish.trim()" @click="generate">
      {{ busy ? '正在遇见…' : candidates.length ? '重新生成整组人物' : '看看会遇见谁' }}
    </button>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="candidate-list">
      <article v-for="person in candidates" :key="person.id">
        <div class="initial">{{ person.name.slice(0, 1) }}</div>
        <h3>{{ person.name }}</h3>
        <p>{{ person.introduction }}</p>
        <small>{{ person.appearance }}</small>
        <button :disabled="busy" @click="choose(person.id)">从一句你好开始</button>
      </article>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { generateCandidates, selectCandidate } from '@/api/AgentPerson'
const props = defineProps<{ userId: string; configId?: string }>()
const emit = defineEmits<{ created: [] }>()
const wish = ref('')
const meeting = ref('刚加上好友')
const voice = ref('alloy')
const busy = ref(false)
const error = ref('')
const candidates = ref<
  Array<{ id: string; name: string; introduction: string; appearance: string }>
>([])
const message = (e: any) =>
  e?.response?.data?.detail?.message || e?.message || '暂时无法创建，请检查模型配置'
async function generate() {
  busy.value = true
  error.value = ''
  try {
    const result = await generateCandidates({
      userId: props.userId,
      wish: wish.value,
      meetingMode: meeting.value,
      voice: voice.value,
      config: { configId: props.configId }
    })
    candidates.value = result.candidates
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = false
  }
}
async function choose(id: string) {
  busy.value = true
  error.value = ''
  try {
    await selectCandidate({ userId: props.userId, candidateId: id })
    emit('created')
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = false
  }
}
</script>
<style scoped>
.creation {
  max-width: 800px;
  margin: 5vh auto;
  padding: 20px;
}
.eyebrow {
  color: var(--color-text-accent);
  font-size: 12px;
}
h2 {
  font-size: 28px;
  font-weight: 500;
}
p,
small {
  color: var(--color-text-secondary);
  line-height: 1.9;
}
textarea,
input {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--color-border-subtle);
  border-radius: 10px;
  padding: 12px;
  background: var(--color-surface-1);
  color: var(--color-text-primary);
}
textarea {
  min-height: 110px;
  resize: vertical;
  margin: 14px 0;
}
.creation-options {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
label {
  flex: 1;
  color: var(--color-text-secondary);
  font-size: 12px;
}
label input {
  margin-top: 6px;
}
button {
  border: 0;
  border-radius: 8px;
  background: var(--color-accent);
  color: var(--color-on-accent);
  padding: 12px 18px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: wait;
}
.candidate-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 28px;
}
article {
  border: 1px solid var(--color-border-subtle);
  border-radius: 16px;
  padding: 20px;
  background: var(--color-surface-1);
}
.initial {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  background: var(--color-accent-soft);
  border-radius: 15px;
}
article button {
  margin-top: 22px;
  width: 100%;
}
small {
  display: block;
  font-size: 11px;
}
.error {
  color: var(--el-color-danger);
}
</style>
