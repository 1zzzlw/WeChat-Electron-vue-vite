<template>
  <main class="friendAdd-count">
    <header class="add-header">
      <span class="header-mark"
        ><el-icon><UserFilled /></el-icon
      ></span>
      <div>
        <p>NEW CONNECTION</p>
        <h1>添加好友</h1>
      </div>
    </header>
    <form class="friendAdd-top" @submit.prevent="searchUser">
      <label for="friend-search">通过账号或手机号查找</label>
      <div class="search-row">
        <el-input
          id="friend-search"
          v-model="searchInput"
          placeholder="输入账号或手机号"
          :prefix-icon="Search"
          clearable
          spellcheck="false"
        /><el-button
          type="primary"
          native-type="submit"
          :loading="searching"
          :disabled="!searchInput.trim()"
          >搜索</el-button
        >
      </div>
    </form>
    <div class="friendAdd-bottom">
      <div v-if="searching" class="add-state" role="status">
        <el-icon class="is-loading"><Loading /></el-icon>
        <h2>正在查找</h2>
        <p>稍等一下，新的连接即将开始。</p>
      </div>
      <div v-else-if="!userInfo" class="add-state" role="status">
        <el-icon><Search /></el-icon>
        <h2>{{ searchError ? '暂未找到这位朋友' : '让彼此更近一点' }}</h2>
        <p>{{ searchError || '输入对方的账号或手机号，找到想联系的人。' }}</p>
      </div>
      <article v-else class="found-person">
        <div class="person-heading">
          <el-avatar :size="56" :src="userInfo.avatar"
            ><el-icon><UserFilled /></el-icon
          ></el-avatar>
          <h2>{{ userInfo.username }}</h2>
          <span class="relation-badge">{{
            userInfo.isFriend === 1 ? '已是好友' : '新的朋友'
          }}</span>
        </div>
        <dl class="person-details">
          <div>
            <dt>账号</dt>
            <dd>{{ userInfo.account }}</dd>
          </div>
          <div>
            <dt>地区</dt>
            <dd>{{ userInfo.address || '未填写' }}</dd>
          </div>
          <div v-if="userInfo.isFriend === 1">
            <dt>备注</dt>
            <dd>{{ userInfo.remark || '暂无备注' }}</dd>
          </div>
        </dl>
        <template v-if="userInfo.isFriend === 0"
          ><label class="message-label" for="apply-message"
            >验证消息 <span>让对方知道你是谁</span></label
          ><el-input
            id="apply-message"
            v-model="applyMessage"
            type="textarea"
            :rows="3"
            maxlength="50"
            show-word-limit
            resize="none"
            placeholder="你好，我们认识一下吧。"
            :disabled="sending || sent"
          /><el-button
            class="primary-action"
            type="primary"
            :loading="sending"
            :disabled="sent"
            @click="sendApply"
            >{{ sent ? '申请已发送' : '发送好友申请' }}</el-button
          ></template
        >
        <template v-else
          ><p class="friend-hint">你们已经是好友，可以直接开始对话。</p>
          <el-button class="primary-action" type="primary" :loading="openingChat" @click="openChat"
            ><el-icon><ChatDotRound /></el-icon>发消息</el-button
          ></template
        >
      </article>
    </div>
    <footer class="add-footer">每一段对话，都从一次连接开始。</footer>
    <WindowControls :showSetFullScreen="false" :showSetTop="false" windowType="friendAdd" />
  </main>
</template>

<script lang="ts" setup>
import { Search, UserFilled, ChatDotRound, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { ref, watch, onUnmounted } from 'vue'
import { sendApplyApi } from '@/api/Apply'
import { searchFriendApi } from '@/api/User'
import { getConversationInfoById } from '@/db/dualDB'
import WindowControls from '@/components/WindowControls.vue'

interface FoundPerson {
  id: string
  username: string
  account: string
  avatar: string
  remark?: string
  address?: string
  isFriend: number
}
const searchInput = ref('')
const applyMessage = ref('')
const userInfo = ref<FoundPerson | null>(null)
const searchError = ref('')
const searching = ref(false)
const sending = ref(false)
const sent = ref(false)
const openingChat = ref(false)
let searchVersion = 0
const searchUser = async () => {
  const keyword = searchInput.value.trim()
  if (!keyword || searching.value) return
  const version = ++searchVersion
  searching.value = true
  userInfo.value = null
  searchError.value = ''
  sent.value = false
  try {
    const result: any = await searchFriendApi(keyword)
    if (version !== searchVersion) return
    if (result.code !== 1 || !result.data)
      throw new Error(result.msg || '请检查账号或手机号后重试。')
    userInfo.value = { ...result.data, isFriend: Number(result.data.isFriend) }
  } catch (error) {
    if (version === searchVersion)
      searchError.value = error instanceof Error ? error.message : '查找失败，请稍后重试。'
  } finally {
    if (version === searchVersion) searching.value = false
  }
}
const sendApply = async () => {
  if (!userInfo.value || sending.value || sent.value) return
  const targetId = userInfo.value.id
  sending.value = true
  try {
    const result: any = await sendApplyApi({
      toUserId: targetId,
      applyMsg: applyMessage.value.trim()
    })
    if (result.code !== 1) throw new Error(result.msg || '发送失败，请重试')
    ;(window as any).wsApi.sendMessage(5, 0, {
      applyId: result.data,
      toUserId: targetId,
      applyMsg: applyMessage.value.trim()
    })
    if (userInfo.value?.id === targetId) sent.value = true
    ElMessage.success('好友申请已发送')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '发送失败，请重试')
  } finally {
    sending.value = false
  }
}
const openChat = async () => {
  if (!userInfo.value || openingChat.value) return
  openingChat.value = true
  try {
    const userId = String(await (window as any).userInfoApi.storeGetUserInfo('userId'))
    const friendId = String(userInfo.value.id)
    const id = BigInt(userId) > BigInt(friendId) ? userId + '_' + friendId : friendId + '_' + userId
    const conversation = await getConversationInfoById(id)
    if (!conversation) throw new Error('会话暂未同步，请在联系人列表中打开')
    ;(window as any).windowToolApi.createNewWindow('standaloneChat', { conversation })
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '暂时无法打开会话')
  } finally {
    openingChat.value = false
  }
}
watch(searchInput, () => {
  searchVersion++
  searching.value = false
  userInfo.value = null
  searchError.value = ''
  sent.value = false
})
onUnmounted(() => {
  searchVersion++
})
</script>

<style scoped>
.friendAdd-count {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 28px 24px 20px;
  background: var(--color-bg-deep);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-subtle);
}
.add-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  -webkit-app-region: drag;
}
.header-mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-size: 22px;
}
.add-header p {
  color: var(--color-text-muted);
  font-size: 9px;
  letter-spacing: 1.5px;
  margin-bottom: 3px;
}
h1 {
  font-size: 21px;
  line-height: 1.3;
  color: var(--color-text-strong);
  font-weight: 650;
}
.friendAdd-top {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border-subtle);
}
.friendAdd-top label {
  display: block;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.search-row {
  display: flex;
  gap: 10px;
}
.search-row .el-input {
  min-width: 0;
}
.search-row .el-button {
  height: 36px;
}
.friendAdd-bottom {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-top: 24px;
}
.add-state {
  height: 100%;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}
.add-state > .el-icon {
  font-size: 28px;
  color: var(--color-accent);
  margin-bottom: 6px;
}
h2 {
  color: var(--color-text-strong);
  font-size: 17px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.add-state p {
  max-width: 260px;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.7;
}
.found-person {
  padding: 16px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
}
.person-heading {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  column-gap: 14px;
  row-gap: 6px;
  align-items: center;
}
.person-heading .el-avatar {
  grid-row: span 2;
  border-radius: var(--radius-lg);
  color: var(--color-accent);
  background: var(--color-surface-2);
}
.relation-badge {
  justify-self: start;
  font-size: 10px;
  padding: 3px 8px;
  color: var(--color-text-accent);
  background: var(--color-accent-soft);
  border-radius: var(--radius-sm);
}
.person-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 20px 0;
  padding: 16px 0;
  border-top: 1px solid var(--color-border-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
}
.person-details > div {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  font-size: 12px;
}
dt {
  color: var(--color-text-muted);
}
dd {
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
  user-select: text;
}
.message-label {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}
.message-label span {
  font-size: 10px;
  color: var(--color-text-muted);
}
.primary-action {
  width: 100%;
  margin-top: 16px;
  min-height: 36px;
}
.primary-action .el-icon {
  margin-right: 6px;
}
.friend-hint,
.add-footer {
  font-size: 11px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  text-align: center;
}
.add-footer {
  padding-top: 18px;
  color: var(--color-text-muted);
}
</style>
