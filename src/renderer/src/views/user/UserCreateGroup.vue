<template>
  <main class="createGroup-count">
    <header class="group-header"><span class="group-mark"><el-icon><ChatDotRound /></el-icon></span><div><h1>发起群聊</h1><p>选择联系人，开始一段新的对话。</p></div></header>
    <div class="group-body">
      <section class="contacts-panel" aria-label="选择联系人">
        <div class="panel-heading"><h2>联系人</h2><span>{{ friendList.length }} 位</span></div>
        <el-input v-model="search" placeholder="搜索姓名或备注" aria-label="搜索联系人" :prefix-icon="Search" clearable />
        <div class="contact-list">
          <p v-if="loading" class="empty-state" role="status">正在加载联系人…</p>
          <div v-else-if="loadError" class="empty-state" role="status"><p>{{ loadError }}</p><el-button @click="loadFriends">重新加载</el-button></div>
          <p v-else-if="!filteredFriends.length" class="empty-state">{{ search ? '没有找到匹配的联系人' : '暂无可邀请的联系人' }}</p>
          <label v-for="friend in filteredFriends" :key="friend.friendId" class="contact-row" :class="{ selected: invitedIds.has(String(friend.friendId)) }">
            <input type="checkbox" :checked="invitedIds.has(String(friend.friendId))" :disabled="creating" @change="toggleFriend(friend, $event)" />
            <img :src="friend.avatar" alt="" /><span class="contact-copy"><strong>{{ friend.remark || friend.username }}</strong><small v-if="friend.remark">{{ friend.username }}</small></span>
          </label>
        </div>
      </section>
      <section class="selected-panel" aria-label="已选联系人">
        <div class="panel-heading"><h2>已选联系人</h2><span aria-live="polite">{{ selectedFriends.length }} / 200</span></div>
        <div class="selected-list">
          <div v-if="!selectedFriends.length" class="selection-empty"><el-icon aria-hidden="true"><User /></el-icon><strong>邀请好友加入</strong><p>从左侧选择要加入群聊的联系人</p></div>
          <div v-for="friend in selectedFriends" :key="friend.friendId" class="selected-row">
            <img :src="friend.avatar" alt="" /><span>{{ friend.remark || friend.username }}</span>
            <button type="button" :aria-label="'移除 ' + (friend.remark || friend.username)" :disabled="creating" @click="toggleFriend(friend)"><el-icon><Close /></el-icon></button>
          </div>
        </div>
        <div class="group-name"><label for="group-name">群聊名称</label><el-input id="group-name" v-model="groupName" placeholder="为这段对话取个名字" :disabled="creating" clearable /></div>
      </section>
    </div>
    <footer class="group-footer"><span>已选择 {{ selectedFriends.length }} 位联系人</span><div><el-button :disabled="creating" @click="cancel">取消</el-button><el-button type="primary" class="create-btn" :disabled="!selectedFriends.length || !groupName.trim()" :loading="creating" @click="createGroup">创建群聊</el-button></div></footer>
    <WindowControls :showSetFullScreen="false" :showSetTop="false" :showSetMiniSize="false" windowType="createGroup" />
  </main>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { ChatDotRound, Search, User, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { sendGroupApplyApi } from '@/api/Conversation'
import WindowControls from '@/components/WindowControls.vue'
import { addConversation, getFriendList } from '@/db/dualDB'
import { conversationInfo } from '@/stores/modules/ConversationStore'
import type { Friend } from '@/types/friend'
import type { Conversation } from '@/types/conversation'

const friendList = ref<Friend[]>([])
const invitedIds = ref(new Set<string>())
const search = ref('')
const groupName = ref('')
const creating = ref(false)
const loading = ref(true)
const loadError = ref('')
const conversationStore = conversationInfo()
const filteredFriends = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  return friendList.value.filter(friend => [friend.username, friend.remark].some(value => (value || '').toLocaleLowerCase().includes(keyword)))
})
const selectedFriends = computed(() => friendList.value.filter(friend => invitedIds.value.has(String(friend.friendId))))
const toggleFriend = (friend: Friend, event?: Event) => {
  if (creating.value) return
  const id = String(friend.friendId)
  if (invitedIds.value.has(id)) invitedIds.value.delete(id)
  else if (invitedIds.value.size >= 200) ElMessage.warning('最多选择 200 位联系人')
  else invitedIds.value.add(id)
  if (event?.target instanceof HTMLInputElement) event.target.checked = invitedIds.value.has(id)
}
const cancel = () => (window as any).windowToolApi.destroyNewWindow('createGroup')
const createGroup = async () => {
  if (creating.value || !selectedFriends.value.length || !groupName.value.trim()) return
  creating.value = true
  try {
    const arrayBuffer = await (window as any).mediaHandleApi.generateGroupAvatar()
    const formData = new FormData()
    formData.append('groupAvatar', new Blob([arrayBuffer]))
    formData.append('groupName', groupName.value.trim())
    invitedIds.value.forEach(id => formData.append('invitedIds', id))
    const result: any = await sendGroupApplyApi(formData)
    if (result.code !== 1) throw new Error(result.msg || '创建失败，请重试')
    const conversation: Conversation = result.data
    conversationStore.setConversationMap(conversation.id, conversation)
    addConversation(conversation)
    ElMessage.success('创建群聊成功')
    cancel()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '创建失败，请重试')
  } finally { creating.value = false }
}
const loadFriends = async () => {
  loading.value = true
  loadError.value = ''
  try { friendList.value = await getFriendList() }
  catch { loadError.value = '联系人加载失败，请重试' }
  finally { loading.value = false }
}
onMounted(loadFriends)
</script>

<style scoped>
.createGroup-count { height: 100%; display: flex; flex-direction: column; color: var(--color-text-primary); background: var(--color-bg-deep); border: 1px solid var(--color-border-subtle); }
.group-header { display: flex; align-items: center; gap: 14px; padding: 28px 32px 24px; padding-right: 100px; border-bottom: 1px solid var(--color-border-subtle); -webkit-app-region: drag; }
.group-mark { display: grid; place-items: center; width: 42px; height: 42px; background: var(--color-accent-soft); color: var(--color-accent); border-radius: var(--radius-md); font-size: 23px; }
h1 { color: var(--color-text-strong); font-size: 22px; font-weight: 650; line-height: 1.3; }
.group-header p { margin-top: 5px; color: var(--color-text-secondary); font-size: 12px; }
.group-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; }
.contacts-panel, .selected-panel { min-width: 0; min-height: 0; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.contacts-panel { background: var(--color-sidebar-surface); border-right: 1px solid var(--color-border-subtle); }
.panel-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
h2 { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.panel-heading > span { font-size: 11px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
.contact-list, .selected-list { flex: 1; min-height: 0; overflow-y: auto; }
.contact-row { display: flex; align-items: center; gap: 12px; min-height: 64px; padding: 10px; border: 1px solid transparent; border-radius: var(--radius-md); cursor: var(--cursor-pointer, pointer); transition: background var(--transition-fast); }
.contact-row:hover { background: var(--color-surface-2); }
.contact-row.selected { background: var(--color-accent-soft); border-color: var(--color-border-primary); }
.contact-row:focus-within { outline: 2px solid var(--color-accent); outline-offset: -2px; }
.contact-row input { width: 16px; height: 16px; flex: 0 0 16px; accent-color: var(--color-accent); }
.contact-row img, .selected-row img { width: 38px; height: 38px; object-fit: cover; border-radius: var(--radius-md); flex-shrink: 0; }
.contact-copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.contact-copy strong { font-size: 13px; font-weight: 500; overflow-wrap: anywhere; }
.contact-copy small { font-size: 11px; color: var(--color-text-secondary); }
.empty-state { padding: 32px 8px; color: var(--color-text-muted); font-size: 13px; text-align: center; }
.empty-state .el-button { margin-top: 12px; }
.selection-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--color-text-muted); text-align: center; }
.selection-empty .el-icon { padding: 16px; box-sizing: content-box; font-size: 24px; border-radius: var(--radius-lg); background: var(--color-surface-1); }
.selection-empty strong { color: var(--color-text-secondary); font-size: 13px; font-weight: 500; }
.selection-empty p { font-size: 12px; }
.selected-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--color-border-subtle); }
.selected-row > span { flex: 1; min-width: 0; font-size: 13px; overflow-wrap: anywhere; }
.selected-row button { display: grid; place-items: center; width: 32px; height: 32px; color: var(--color-text-secondary); border-radius: var(--radius-sm); cursor: var(--cursor-pointer, pointer); }
.selected-row button:hover { background: var(--color-surface-2); color: var(--color-danger); }
.group-name { border-top: 1px solid var(--color-border-subtle); padding-top: 16px; }
.group-name label { display: block; color: var(--color-text-secondary); font-size: 12px; margin-bottom: 8px; }
.group-footer { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 18px 24px; border-top: 1px solid var(--color-border-subtle); }
.group-footer > span { font-size: 12px; color: var(--color-text-secondary); }
.group-footer .el-button { min-width: 88px; height: 36px; }
@media (max-width: 650px) { .contacts-panel, .selected-panel { padding: 16px; } .group-header { padding: 24px 20px; } }
</style>
