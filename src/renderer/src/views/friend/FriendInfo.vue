<template>
  <main class="friendInfo-count">
    <div v-if="loadingProfile || profileError" class="profile-state" role="status"><p>{{ loadingProfile ? '正在加载联系人信息…' : profileError }}</p><el-button v-if="profileError" @click="loadFriendInfo(route.query.friendId)">重新加载</el-button></div>
    <article v-else-if="friendBaseInfo" class="userInfo">
      <p class="profile-kicker">CONTACT / 个人资料</p>
      <header class="accountInfo">
        <img class="profile-avatar" :src="friendBaseInfo.avatar" alt="联系人头像" />
        <div class="accountInfo-info"><h1>{{ friendBaseInfo.remark || friendBaseInfo.username }}</h1><p v-if="friendBaseInfo.remark" class="profile-username">{{ friendBaseInfo.username }}</p><span class="profile-account">账号：{{ friendBaseInfo.account || '未填写' }}</span><span class="profile-status" :class="{ online: userOnlineStatus }"><i></i>{{ userOnlineStatus ? '在线' : '离线' }}</span></div>
        <el-popover placement="bottom-end" trigger="click" :width="176">
          <div class="setButton">
            <button type="button" class="set-item" @click="setRemark"><el-icon><Edit /></el-icon>设置备注</button>
            <button type="button" class="set-item" @click="toggleBlacklist" :disabled="isBlockedByThem"><el-icon><WarningFilled /></el-icon>{{ isBlockedByThem ? '对方已将你拉黑' : isBlacklisted ? '移出黑名单' : '加入黑名单' }}</button>
            <div class="set-divider"></div>
            <button type="button" class="set-item danger" @click="deleteFriend"><el-icon><Delete /></el-icon>删除好友</button>
          </div>
          <template #reference><button type="button" class="left-icon" aria-label="联系人更多操作"><el-icon><MoreFilled /></el-icon></button></template>
        </el-popover>
      </header>
      <dl class="baseInfo">
        <div><dt>备注</dt><dd>{{ friendBaseInfo.remark || '暂无备注' }}</dd></div>
        <div><dt>性别</dt><dd>{{ Number(friendBaseInfo.gender) === 1 ? '男' : Number(friendBaseInfo.gender) === 0 && friendBaseInfo.gender != null ? '女' : '未填写' }}</dd></div>
        <div><dt>手机号</dt><dd>{{ friendBaseInfo.phone || '未填写' }}</dd></div>
        <div><dt>邮箱</dt><dd>{{ friendBaseInfo.email || '未填写' }}</dd></div>
        <div><dt>地址</dt><dd>{{ friendBaseInfo.address || '未填写' }}</dd></div>
        <div><dt>生日</dt><dd>{{ friendBaseInfo.birthday || '未填写' }}</dd></div>
      </dl>
      <FriendMomentsPreview :user-id="String(friendBaseInfo.friendId)" :profile="friendBaseInfo" />
      <footer class="button"><el-button type="primary" @click="sendMessage">发消息</el-button><el-button @click="setRemark">设置备注</el-button><el-button disabled title="暂未支持">语音聊天</el-button><el-button disabled title="暂未支持">视频聊天</el-button></footer>
    </article>
  </main>
</template>

<script lang="ts" setup>
import { watch, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, WarningFilled, Delete, MoreFilled } from '@element-plus/icons-vue'
import { friendInfo } from '@/stores/modules/ContactListStore'
import { conversationInfo } from '@/stores/modules/ConversationStore'
import { messageInfo } from '@/stores/modules/MessageStore'
import { Friend } from '@/types/friend'
import { Message } from '@/types/message'
import { getFriendInfoById, getConversationInfoById, updateConversation } from '@/db/dualDB'
import { deleteFriendSync, deleteConversationSync, updateFriendRemarkSync, updateFriendStatusSync } from '@/db/syncDB'
import { createSystemMessagePack, createContentJson } from '@/utils/systemMessageUtil'
import { SystemMsgSubType, getSystemMsgText } from '@/utils/constants'
import dayjs from 'dayjs'
import FriendMomentsPreview from '@/components/FriendMomentsPreview.vue'

const route = useRoute()
const router = useRouter()
const friendInfoStore = friendInfo()
const conversationStore = conversationInfo()
const messageStore = messageInfo()
const friendBaseInfo = ref<Friend>()
const loadingProfile = ref(false)
const profileError = ref('')

// 判断是否在黑名单中（我拉黑了对方，status = 2）
const isBlacklisted = computed(() => {
  return friendBaseInfo.value?.relationStatus === 2
})

// 判断是否被对方拉黑（对方拉黑了我，status = 3）
const isBlockedByThem = computed(() => {
  return friendBaseInfo.value?.relationStatus === 3
})

// ===== 设置备注 =====
const setRemark = async () => {
  try {
    const { value: newRemark } = await ElMessageBox.prompt('请输入新的备注名称', '设置备注', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: friendBaseInfo.value?.remark || '',
      inputPattern: /^.{0,20}$/,
      inputErrorMessage: '备注长度需在 0-20 个字符之间',
      customClass: 'friend-remark-dialog'
    })

    const friendId = friendBaseInfo.value?.friendId
    if (!friendId) return

    // 调用后端 API
    updateFriendRemarkSync(String(friendId), newRemark)
    // 更新 Pinia store
    friendInfoStore.updateFriendMap(friendId, { remark: newRemark })
    // 更新本地 ref
    if (friendBaseInfo.value) {
      friendBaseInfo.value.remark = newRemark
    }
    ElMessage.success('备注已更新')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('更新备注失败')
    }
  }
}

// ===== 加入/移出黑名单 =====
const toggleBlacklist = async () => {
  const friendId = friendBaseInfo.value?.friendId
  if (!friendId) return

  const toBlacklist = !isBlacklisted.value
  const actionText = toBlacklist ? '加入黑名单' : '移出黑名单'

  try {
    await ElMessageBox.confirm(
      toBlacklist ? `确定将 ${friendBaseInfo.value?.username || '该好友'} 加入黑名单吗？加入后将不再接收对方消息。`
        : `确定将 ${friendBaseInfo.value?.username || '该好友'} 移出黑名单吗？`,
      actionText,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        customClass: 'friend-action-dialog'
      }
    )
  } catch {
    return // 用户取消
  }

  try {
    const newStatus = toBlacklist ? 2 : 1
    // 调用后端 API + 本地SQLite
    updateFriendStatusSync(String(friendId), newStatus)
    // 更新 Pinia store
    friendInfoStore.updateFriendMap(friendId, { relationStatus: newStatus })
    // 更新本地 ref
    if (friendBaseInfo.value) {
      friendBaseInfo.value.relationStatus = newStatus
    }
    ElMessage.success(toBlacklist ? '已加入黑名单' : '已移出黑名单')

    // 拉黑时发送WS系统消息通知对方
    if (toBlacklist) {
      try {
        const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')
        const myName = await (window as any).userInfoApi.storeGetUserInfo('username')
        const conversationId = String(userId) > String(friendId)
          ? userId + '_' + friendId
          : friendId + '_' + userId

        const tpl = getSystemMsgText(SystemMsgSubType.FRIEND_BLACKLIST, { name: myName })
        const content = createContentJson(tpl, myName, String(friendId), friendBaseInfo.value?.username || '', null)

        const systemMessagePack = await createSystemMessagePack(
          String(friendId), conversationId, SystemMsgSubType.FRIEND_BLACKLIST, content, []
        )
        messageStore.sendSystemMessage(systemMessagePack as Message, conversationId, [])
      } catch (e) {
        console.log('发送拉黑通知失败', e)
      }
    }
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

// ===== 删除好友 =====
const deleteFriend = async () => {
  const friendId = friendBaseInfo.value?.friendId
  if (!friendId) return

  try {
    await ElMessageBox.confirm(
      `确定要删除好友 ${friendBaseInfo.value?.username || '该用户'} 吗？`,
      '删除好友',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        customClass: 'friend-action-dialog'
      }
    )
  } catch {
    return
  }

  try {
    const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')
    const conversationId = String(userId) > String(friendId)
      ? userId + '_' + friendId
      : friendId + '_' + userId

    // 同步删除好友关系（本地 + 服务端）
    deleteFriendSync(String(friendId))
    deleteConversationSync(conversationId)

    // 从 Pinia 移除
    friendInfoStore.deleteFriendMap(friendId)
    conversationStore.deleteConversation(conversationId)

    ElMessage.success('已删除好友')

    // 返回消息列表
    router.push({ name: 'messageList' })
  } catch (e) {
    ElMessage.error('删除好友失败')
  }
}

const sendMessage = async () => {
  if (isBlacklisted.value) {
    ElMessage.warning('对方已被你拉黑，无法发送消息')
    return
  }
  if (isBlockedByThem.value) {
    ElMessage.warning('消息已发出，但被对方拒收了')
    return
  }
  const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')
  const frinedId = friendBaseInfo.value?.friendId as number
  const conversationId = userId > frinedId
    ? userId + '_' + frinedId
    : frinedId + '_' + userId
  const conversationInfo = await getConversationInfoById(conversationId)
  conversationInfo.latestMsgTime = conversationInfo.latestMsgTime !== null ? dayjs(conversationInfo.latestMsgTime).format('HH:mm:ss') : undefined
  // 将信息添加到会话缓存中
  conversationStore.setConversationMap(conversationId, conversationInfo)
  // 修改会话的显示状态为1
  const condition = {
    id: conversationId
  }
  const data = {
    status: 1
  }
  updateConversation(condition, data)
  router.push({
    name: 'chat',
    // 传递会话id
    query: { conversationId: conversationId }
  })
}

const loadFriendInfo = async (friendId: any) => {
  friendBaseInfo.value = undefined
  loadingProfile.value = true
  profileError.value = ''
  try {
    const info = await getFriendInfoById(friendId)
    if (String(route.query.friendId) !== String(friendId)) return
    if (!info) throw new Error('没有找到此联系人的资料')
    friendBaseInfo.value = info
  } catch (error) {
    if (String(route.query.friendId) === String(friendId)) profileError.value = error instanceof Error ? error.message : '资料加载失败，请重试'
  } finally {
    if (String(route.query.friendId) === String(friendId)) loadingProfile.value = false
  }
}

// 好友是否在线
const userOnlineStatus = computed(() => {
  return friendInfoStore.isUserOnline(route.query.friendId as string)
})

watch(
  // 第一个参数：要监听的"源"（可以是响应式变量、计算属性、路由参数等）
  () => route.query.friendId,
  (newVal: any, oldVal) => {
    loadFriendInfo(newVal)
  },
  { immediate: true }
)
</script>

<style scoped>
.friendInfo-count { width: 100%; height: 100%; overflow-y: auto; padding: 56px 32px 24px; background: var(--color-chat-surface); -webkit-app-region: no-drag; }
.userInfo { width: min(680px, 100%); margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); background: var(--color-bg-deep); }
.profile-kicker { color: var(--color-text-muted); font-size: 10px; letter-spacing: 1.5px; }
.accountInfo { position: relative; display: flex; align-items: center; gap: 20px; padding-right: 32px; }
.profile-avatar { width: 80px; height: 80px; border-radius: var(--radius-lg); object-fit: cover; border: 1px solid var(--color-border-subtle); flex-shrink: 0; }
.accountInfo-info { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
h1 { font-size: 25px; line-height: 1.3; font-weight: 650; color: var(--color-text-strong); overflow-wrap: anywhere; }
.profile-username, .profile-account { color: var(--color-text-secondary); font-size: 12px; overflow-wrap: anywhere; }
.profile-status { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--color-text-muted); }
.profile-status i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.profile-status.online { color: var(--color-success); }
.left-icon { position: absolute; top: 0; right: 0; display: grid; place-items: center; width: 32px; height: 32px; font-size: 21px; color: var(--color-text-secondary); border-radius: var(--radius-sm); cursor: var(--cursor-pointer, pointer); }
.left-icon:hover { background: var(--color-surface-2); color: var(--color-text-primary); }
.baseInfo { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 24px; padding: 20px 0; border-top: 1px solid var(--color-border-subtle); border-bottom: 1px solid var(--color-border-subtle); }
.baseInfo > div { min-width: 0; }
dt { margin-bottom: 6px; color: var(--color-text-muted); font-size: 11px; }
dd { color: var(--color-text-primary); font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; user-select: text; }
:deep(.friend-moments) { background: var(--color-surface-1); border-radius: var(--radius-md); }
.button { display: flex; flex-wrap: wrap; gap: 10px; padding-top: 4px; }
.button .el-button { min-width: 88px; margin: 0; }
.setButton { display: flex; flex-direction: column; gap: 4px; }
.set-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px; color: var(--color-text-primary); font: inherit; font-size: 13px; border-radius: var(--radius-sm); cursor: var(--cursor-pointer, pointer); }
.set-item:hover { background: var(--color-surface-2); }
.set-item.danger { color: var(--color-danger); }
.set-item:disabled { color: var(--color-text-muted); cursor: var(--cursor-not-allowed, not-allowed); }
.set-divider { height: 1px; background: var(--color-border-subtle); margin: 4px 0; }
.profile-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px 24px; color: var(--color-text-secondary); font-size: 13px; }
@media (max-width: 900px) { .friendInfo-count { padding: 52px 24px 24px; } .userInfo { padding: 20px; } .profile-avatar { width: 64px; height: 64px; } h1 { font-size: 22px; } }
</style>
