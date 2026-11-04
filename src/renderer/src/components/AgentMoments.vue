<template>
  <section class="feed">
    <button class="refresh" :disabled="busy" @click="load">刷新生活片段</button>
    <p v-if="error" role="status">{{ error }}</p>
    <div v-if="!busy && !items.length" class="empty">
      还没有愿意分享给你的动态。<br /><small>生活在继续，分享的时机由它自己选择。</small>
    </div>
    <article v-for="item in items" :key="item.id">
      <header>
        <span class="avatar">{{ item.name.slice(0, 1) }}</span>
        <div>
          <strong>{{ item.name }}</strong
          ><small>{{ new Date(item.publishedAt).toLocaleString('zh-CN') }}</small>
        </div>
      </header>
      <template v-for="(part, index) in item.parts.parts" :key="index"
        ><p v-if="part.type === 'text'">{{ part.text }}</p>
        <AgentMedia v-else :user-id="userId" :asset-id="part.assetId" :kind="part.type"
      /></template>
      <div class="actions">
        <button :disabled="busy" @click="like(item)">
          {{ item.liked ? '♥ 已点赞' : '♡ 点赞' }}</button
        ><span>{{
          item.interactions
            .filter((i: any) => i.kind === 'like')
            .map((i: any) => i.name)
            .join('、')
        }}</span>
      </div>
      <div class="comments">
        <p
          v-for="comment in item.interactions.filter((i: any) => i.kind === 'comment')"
          :key="comment.id"
        >
          <strong>{{ comment.name }}：</strong>{{ comment.content }}
        </p>
      </div>
      <form @submit.prevent="comment(item)">
        <input v-model="drafts[item.id]" maxlength="2000" placeholder="留下你的想法…" /><button
          :disabled="busy || !drafts[item.id]?.trim()"
        >
          评论
        </button>
      </form>
    </article>
  </section>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getMoments, interactMoment } from '@/api/AgentPerson'
import AgentMedia from '@/components/AgentMedia.vue'
const props = defineProps<{ userId: string }>()
const items = ref<any[]>([])
const drafts = ref<Record<string, string>>({})
const busy = ref(false)
const error = ref('')
let alive = true
let timer: ReturnType<typeof setInterval>
async function load() {
  if (busy.value || !props.userId) return
  busy.value = true
  try {
    const result = await getMoments(props.userId)
    if (alive) {
      items.value = result
      error.value = ''
    }
  } catch {
    if (alive) error.value = '朋友圈暂时无法加载'
  } finally {
    busy.value = false
  }
}
async function send(item: any, kind: string, content = '', active = true) {
  try {
    await interactMoment(item.id, {
      userId: props.userId,
      requestId: crypto.randomUUID(),
      kind,
      content,
      active
    })
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.detail?.message || '互动暂未发送，请重试'
  }
}
const like = (item: any) => send(item, 'like', '', !item.liked)
async function comment(item: any) {
  await send(item, 'comment', drafts.value[item.id])
  drafts.value[item.id] = ''
}
onMounted(() => {
  void load()
  timer = setInterval(load, 15000)
})
onBeforeUnmount(() => {
  alive = false
  clearInterval(timer)
})
</script>
<style scoped>
.feed {
  max-width: 820px;
  margin: 24px auto;
}
.refresh {
  float: right;
  margin-bottom: 20px;
}
.empty {
  clear: both;
  text-align: center;
  padding: 65px 0;
  line-height: 2;
  color: var(--color-text-secondary);
}
article {
  clear: both;
  margin-top: 18px;
  padding: 24px;
  border: 1px solid var(--color-border-subtle);
  border-radius: 16px;
  background: var(--color-surface-1);
}
header {
  display: flex;
  align-items: center;
  gap: 12px;
}
header small {
  display: block;
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: 11px;
}
.avatar {
  padding: 12px;
  border-radius: 12px;
  background: var(--color-accent-soft);
}
p {
  white-space: pre-wrap;
  line-height: 1.8;
}
button {
  padding: 8px 12px;
  border: 1px solid var(--color-border-subtle);
  border-radius: 7px;
  color: var(--color-text-accent);
  background: transparent;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
}
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.actions span,
.comments {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.comments p {
  margin: 8px 0;
}
form {
  display: flex;
  gap: 8px;
  margin-top: 15px;
}
input {
  min-width: 0;
  flex: 1;
  border: 0;
  border-bottom: 1px solid var(--color-border-subtle);
  background: transparent;
  color: var(--color-text-primary);
  padding: 8px;
}
</style>
