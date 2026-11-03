<template>
  <el-popover v-model:visible="opened" trigger="click" placement="bottom-start" :width="400" :show-arrow="false" :disabled="!query.trim()" popper-class="local-search-popper">
    <template #reference><el-input v-model="query" :placeholder="scope === 'contacts' ? '搜索联系人' : '搜索本地消息与会话'" :aria-label="scope === 'contacts' ? '搜索联系人' : '搜索本地消息与会话'" :prefix-icon="Search" maxlength="128" clearable spellcheck="false" @input="opened = !!query.trim()" @focus="opened = !!query.trim()" @keydown.down.prevent="focusResults" @keydown.esc="opened = false" /></template>
    <div ref="resultPanel" class="local-search-results" @keydown.esc.stop="opened = false">
      <div class="search-caption">{{ scope === 'contacts' ? '联系人' : '本地搜索' }}<span>包含“{{ query.trim() }}”</span></div>
      <p v-if="loading" class="search-state" role="status">正在搜索…</p>
      <div v-else-if="error" class="search-state" role="status"><p>{{ error }}</p><el-button size="small" @click="performSearch(query)">重试</el-button></div>
      <template v-else>
        <p v-if="!hasResults" class="search-state" role="status">没有找到匹配{{ scope === 'contacts' ? '的联系人' : '的本地内容' }}</p>
        <section v-if="results.contacts.length" class="search-section"><h3>联系人 <span>{{ results.contacts.length }}{{ results.contacts.length === 30 ? '+' : '' }}</span></h3>
          <button v-for="friend in results.contacts" :key="friend.friendId" type="button" class="search-result contact-result" @click="selectContact(friend)">
            <el-avatar :src="friend.avatar" :size="34"><el-icon><User /></el-icon></el-avatar>
            <span class="result-copy"><strong>{{ friend.remark || friend.username }}</strong><small>{{ friend.remark ? friend.username + ' · ' : '' }}{{ friend.account || '联系人' }}</small></span><el-icon aria-hidden="true"><ArrowRight /></el-icon>
          </button>
        </section>
        <section v-if="results.conversations.length" class="search-section"><h3>会话与群聊 <span>{{ results.conversations.length }}{{ results.conversations.length === 30 ? '+' : '' }}</span></h3>
          <button v-for="conversation in results.conversations" :key="conversation.id" type="button" class="search-result conversation-result" @click="selectConversation(conversation)">
            <el-avatar :src="conversation.avatar || undefined" :size="34"><el-icon><ChatDotRound /></el-icon></el-avatar>
            <span class="result-copy"><strong>{{ conversation.remark || conversation.name }}</strong><small>{{ conversation.type === 1 ? '群聊' : '会话' }}{{ conversation.latestMsg ? ' · ' + conversation.latestMsg : '' }}</small></span><el-icon aria-hidden="true"><ArrowRight /></el-icon>
          </button>
        </section>
        <section v-if="results.messages.length" class="search-section"><h3>聊天记录 <span>{{ results.messages.length }}{{ results.messages.length === 30 ? '+' : '' }}</span></h3>
          <button v-for="message in results.messages" :key="message.id" type="button" class="search-result message-result" :title="message.content || message.fileName" @click="selectMessage(message)">
            <el-avatar :src="message.conversationAvatar" :size="34"><el-icon><ChatDotRound /></el-icon></el-avatar>
            <span class="result-copy"><strong>{{ message.conversationRemark || message.conversationName }}<time>{{ formatTime(message.sendTime) }}</time></strong><span class="message-snippet">{{ snippet(message.fileName || message.content || '') }}</span></span>
          </button>
        </section>
        <p v-if="hasResults" class="search-footnote">{{ scope === 'contacts' ? '点击联系人查看详细资料' : '仅搜索此设备已保存的内容 · 点击记录定位到对应消息' }}</p>
      </template>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { Search, User, ChatDotRound, ArrowRight } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import type { Friend } from '@/types/friend'
import type { Conversation } from '@/types/conversation'
import type { LocalMessageMatch, LocalSearchResults } from '@/types/localSearch'

const props = withDefaults(defineProps<{ scope?: 'contacts' | 'all' }>(), { scope: 'all' })
const emit = defineEmits<{ 'select-contact': [friend: Friend]; 'select-conversation': [conversation: Conversation]; 'select-message': [message: LocalMessageMatch] }>()
const route = useRoute()
const query = ref('')
const opened = ref(false)
const loading = ref(false)
const error = ref('')
const results = ref<LocalSearchResults>({ contacts: [], conversations: [], messages: [] })
const resultPanel = ref<HTMLElement>()
const hasResults = computed(() => results.value.contacts.length + results.value.conversations.length + results.value.messages.length > 0)
let timer: ReturnType<typeof setTimeout> | undefined
let requestVersion = 0
const performSearch = async (value: string) => {
  const version = ++requestVersion
  const keyword = value.trim()
  if (!keyword) { loading.value = false; return }
  loading.value = true
  error.value = ''
  try {
    const response = await (window as any).dbApi.searchLocal({ query: keyword, scope: props.scope })
    if (version !== requestVersion) return
    if (response?.error) throw new Error(response.error)
    results.value = response
  } catch {
    if (version === requestVersion) error.value = '本地搜索失败，请重试'
  } finally { if (version === requestVersion) loading.value = false }
}
watch(query, value => {
  clearTimeout(timer)
  requestVersion++
  error.value = ''
  results.value = { contacts: [], conversations: [], messages: [] }
  loading.value = !!value.trim()
  if (!value.trim()) { opened.value = false; return }
  timer = setTimeout(() => { void performSearch(value) }, 180)
})
watch(() => route.fullPath, () => { opened.value = false })
onUnmounted(() => { clearTimeout(timer); requestVersion++ })
const selectContact = (friend: Friend) => { opened.value = false; emit('select-contact', friend) }
const selectConversation = (conversation: Conversation) => { opened.value = false; emit('select-conversation', conversation) }
const selectMessage = (message: LocalMessageMatch) => { opened.value = false; emit('select-message', message) }
const focusResults = async () => { opened.value = !!query.value.trim(); await nextTick(); resultPanel.value?.querySelector<HTMLButtonElement>('.search-result')?.focus() }
const formatTime = (value: string) => dayjs(value).isValid() ? dayjs(value).format('MM-DD HH:mm') : ''
const snippet = (value: string) => {
  const index = value.toLocaleLowerCase().indexOf(query.value.trim().toLocaleLowerCase())
  const start = Math.max(0, index - 24)
  return (start ? '…' : '') + value.slice(start, start + 120) + (value.length > start + 120 ? '…' : '')
}
</script>

<style scoped>
.local-search-results { color: var(--color-text-primary); max-height: min(520px, 70vh); overflow-y: auto; }
.search-caption { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 4px 12px; border-bottom: 1px solid var(--color-border-subtle); color: var(--color-text-primary); font-size: 13px; font-weight: 600; }
.search-caption > span { min-width: 0; max-width: 65%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 400; color: var(--color-text-muted); }
.search-state { padding: 28px 12px; text-align: center; font-size: 13px; color: var(--color-text-secondary); }
.search-state .el-button { margin-top: 12px; }
h3 { display: flex; gap: 8px; align-items: center; padding: 14px 8px 6px; font-size: 11px; font-weight: 500; color: var(--color-text-muted); }
h3 span { font-variant-numeric: tabular-nums; }
.search-result { display: flex; align-items: center; width: 100%; padding: 10px 8px; gap: 12px; text-align: left; border-radius: var(--radius-md); color: var(--color-text-primary); cursor: var(--cursor-pointer, pointer); }
.search-result:hover, .search-result:focus-visible { background: var(--color-accent-soft); }
.search-result > .el-icon { margin-left: auto; color: var(--color-text-muted); }
.search-result .el-avatar { flex-shrink: 0; border-radius: var(--radius-md); background: var(--color-surface-2); color: var(--color-accent); }
.result-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 5px; }
.result-copy strong { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; font-weight: 500; overflow-wrap: anywhere; }
.result-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--color-text-secondary); }
time { flex-shrink: 0; color: var(--color-text-muted); font-size: 10px; font-weight: 400; }
.message-snippet { overflow-wrap: anywhere; font-size: 12px; line-height: 1.6; color: var(--color-text-secondary); }
.search-footnote { margin-top: 10px; padding: 12px 6px 2px; border-top: 1px solid var(--color-border-subtle); color: var(--color-text-muted); font-size: 11px; }
</style>
<style>
.local-search-popper.el-popper { max-width: calc(100vw - 32px); background: var(--color-bg-deep); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 12px; }
</style>
