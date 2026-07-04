<template>
  <div class="friendInfo-count">
    <div class="userInfo">
      <el-popover placement="bottom-end" trigger="click" :width="160" transition="friend-pop-transition">
        <div class="setButton">
          <div class="set-item" @click="setRemark">
            <el-icon><Edit /></el-icon>
            <span>设置备注</span>
          </div>
          <div class="set-item" @click="toggleBlacklist" v-if="!isBlockedByThem">
            <el-icon><WarningFilled /></el-icon>
            <span>{{ isBlacklisted ? '移出黑名单' : '加入黑名单' }}</span>
          </div>
          <div class="set-item disabled" v-else>
            <el-icon><WarningFilled /></el-icon>
            <span>对方已将你拉黑</span>
          </div>
          <div class="set-divider"></div>
          <div class="set-item danger" @click="deleteFriend">
            <el-icon><Delete /></el-icon>
            <span>删除好友</span>
          </div>
        </div>
        <template #reference>
          <el-icon class="left-icon" size="25">
            <MoreFilled />
          </el-icon>
        </template>
      </el-popover>
      <div class="accountInfo">
        <img :src="friendBaseInfo?.avatar" alt="">
        <div class="accountInfo-info">
          <p>用户名: {{ friendBaseInfo?.username }}</p>
          <span>账号: {{ friendBaseInfo?.account }} </span>
          <div v-show="userOnlineStatus" class="online-status">在线</div>
          <div v-show="!userOnlineStatus" class="offline-status">离线</div>
        </div>
      </div>
      <div class="baseInfo">
        <div>备注: {{ friendBaseInfo?.remark || '暂无备注' }}
        </div>
        <div>性别:
          <span v-if="friendBaseInfo?.gender === 1">
            男 <el-icon
              style="color: #409eff; font-size: 16px; filter: drop-shadow(0 0 2px #409eff); vertical-align: middle; margin-left: 4px;">
              <Male />
            </el-icon>
          </span>
          <span v-else-if="friendBaseInfo?.gender === 0">
            女 <el-icon
              style="color: #ff8acc; font-size: 16px; filter: drop-shadow(0 0 2px #ff8acc); vertical-align: middle; margin-left: 4px;">
              <Female />
            </el-icon>
          </span>
        </div>
        <div>手机号: {{ friendBaseInfo?.phone }}</div>
        <div>邮箱: {{ friendBaseInfo?.email }}</div>
        <div>地址: {{ friendBaseInfo?.address }}</div>
        <div>生日: {{ friendBaseInfo?.birthday }}</div>
      </div>
      <div class="moments">
        朋友圈
      </div>
      <div class="button">
        <el-button @click="sendMessage">发消息</el-button>
        <el-button>语音聊天</el-button>
        <el-button>视频聊天</el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { watch, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, WarningFilled, Delete, MoreFilled, Male, Female } from '@element-plus/icons-vue'
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

const route = useRoute()
const router = useRouter()
const friendInfoStore = friendInfo()
const conversationStore = conversationInfo()
const messageStore = messageInfo()
let friendBaseInfo = ref<Friend>()

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
  // 获得好友的信息
  friendBaseInfo.value = await getFriendInfoById(friendId)
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
.friendInfo-count {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.userInfo {
  width: 660px;
  height: 580px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  background: rgba(70, 100, 130, 0.2);
  backdrop-filter: blur(12px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  gap: 8px;
  -webkit-app-region: no-drag;
}

.left-icon {
  position: absolute;
  top: 20px;
  right: 20px;
  -webkit-app-region: no-drag;
  width: 30px;
  height: 30px;
  margin: 0;
  font-size: 20px;
  background-color: transparent;
  border: none;
  color: rgba(240, 240, 240, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.left-icon:hover {
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.25);
}

.accountInfo {
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  align-items: center;
}

img {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.accountInfo-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.accountInfo-info p,
.accountInfo-info span,
.online-status {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.accountInfo-info p {
  font-size: 18px;
  font-weight: 600;
}

.online-status {
  color: rgba(102, 217, 102, 0.9);
  font-weight: 500;
  position: relative;
  padding-left: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.online-status::before {
  content: '';
  background-color: rgba(102, 217, 102, 0.95);
  border-radius: 50%;
  width: 10px;
  height: 10px;
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  box-shadow: 0 0 4px rgba(102, 217, 102, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.offline-status {
  color: rgba(150, 150, 150, 0.9);
  font-weight: 500;
  position: relative;
  padding-left: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.offline-status::before {
  content: '';
  background-color: rgba(150, 150, 150, 0.95);
  border-radius: 50%;
  width: 10px;
  height: 10px;
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.baseInfo {
  width: 100%;
  height: 220px;
  padding: 15px 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.baseInfo div {
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  line-height: 1.5;
}

.baseInfo div::before {
  content: "• ";
  color: rgba(255, 255, 255, 0.5);
}

.moments {
  width: 100%;
  height: 140px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.button {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  padding: 0 10px;
}

.el-button {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.el-button:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Popover 内部菜单样式 */
.setButton {
  padding: 4px 0;
}

.set-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
  margin: 4px 8px;
}

.set-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.set-item:hover {
  background: rgba(52, 119, 217, 0.12);
  color: #3477d9;
  transform: translateX(2px);
}

.set-item.danger {
  color: #ff4757;
}

.set-item.danger:hover {
  background: rgba(255, 71, 87, 0.1);
  color: #ff4757;
  transform: translateX(2px);
}

.set-item.disabled {
  color: rgba(255, 71, 87, 0.5);
  cursor: not-allowed;
  pointer-events: none;
}

/* ===== 全局弹窗样式（通过 :global 穿透 scoped） ===== */

/* Popover 弹出动画 */
:global(.friend-pop-transition-enter-active) {
  transition:
    transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    opacity 0.2s ease;
}
:global(.friend-pop-transition-leave-active) {
  transition:
    transform 0.15s cubic-bezier(0.6, -0.28, 0.735, 0.045),
    opacity 0.15s ease;
}
:global(.friend-pop-transition-enter-from) {
  opacity: 0;
  transform: scale(0.92) translateY(-4px);
}
:global(.friend-pop-transition-enter-to) {
  opacity: 1;
  transform: scale(1) translateY(0);
}
:global(.friend-pop-transition-leave-from) {
  opacity: 1;
  transform: scale(1) translateY(0);
}
:global(.friend-pop-transition-leave-to) {
  opacity: 0;
  transform: scale(0.95) translateY(-2px);
}

/* 好友备注弹窗 */
:global(.friend-remark-dialog) {
  background: rgba(28, 38, 50, 0.97) !important;
  border: 1px solid rgba(67, 243, 255, 0.25) !important;
  border-radius: 14px !important;
  backdrop-filter: blur(20px) !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35) !important;
  padding: 0 !important;
  overflow: hidden;
}

:global(.friend-remark-dialog .el-message-box__header) {
  padding: 20px 24px 12px !important;
  border-bottom: 1px solid rgba(67, 243, 255, 0.1) !important;
}

:global(.friend-remark-dialog .el-message-box__title) {
  color: rgba(255, 255, 255, 0.95) !important;
  font-size: 16px !important;
  font-weight: 600 !important;
}

:global(.friend-remark-dialog .el-message-box__headerbtn .el-message-box__close) {
  color: rgba(255, 255, 255, 0.5) !important;
}

:global(.friend-remark-dialog .el-message-box__headerbtn:hover .el-message-box__close) {
  color: #43f3ff !important;
}

:global(.friend-remark-dialog .el-message-box__content) {
  padding: 16px 24px 20px !important;
  color: rgba(255, 255, 255, 0.7) !important;
}

:global(.friend-remark-dialog .el-message-box__message p) {
  color: rgba(255, 255, 255, 0.7) !important;
  font-size: 14px !important;
}

:global(.friend-remark-dialog .el-message-box__input .el-input__wrapper) {
  background: rgba(35, 45, 60, 0.8) !important;
  border: 1px solid rgba(67, 243, 255, 0.25) !important;
  border-radius: 8px !important;
  box-shadow: none !important;
}

:global(.friend-remark-dialog .el-message-box__input .el-input__wrapper.is-focus) {
  border-color: #43f3ff !important;
  box-shadow: 0 0 8px rgba(67, 243, 255, 0.2) !important;
}

:global(.friend-remark-dialog .el-message-box__input .el-input__inner) {
  color: rgba(255, 255, 255, 0.9) !important;
}

:global(.friend-remark-dialog .el-message-box__btns) {
  padding: 12px 24px 20px !important;
  display: flex !important;
  gap: 12px !important;
  justify-content: flex-end !important;
}

:global(.friend-remark-dialog .el-message-box__btns .el-button) {
  border-radius: 8px !important;
  padding: 8px 20px !important;
  font-size: 14px !important;
  transition: all 0.2s ease !important;
}

:global(.friend-remark-dialog .el-message-box__btns .el-button--default) {
  background: rgba(35, 45, 60, 0.8) !important;
  border: 1px solid rgba(67, 243, 255, 0.25) !important;
  color: rgba(255, 255, 255, 0.8) !important;
}

:global(.friend-remark-dialog .el-message-box__btns .el-button--default:hover) {
  background: rgba(67, 243, 255, 0.1) !important;
  border-color: rgba(67, 243, 255, 0.4) !important;
  color: #43f3ff !important;
}

:global(.friend-remark-dialog .el-message-box__btns .el-button--primary) {
  background: rgba(67, 243, 255, 0.2) !important;
  border: 1px solid rgba(67, 243, 255, 0.5) !important;
  color: #43f3ff !important;
}

:global(.friend-remark-dialog .el-message-box__btns .el-button--primary:hover) {
  background: rgba(67, 243, 255, 0.35) !important;
  border-color: rgba(67, 243, 255, 0.7) !important;
  box-shadow: 0 0 12px rgba(67, 243, 255, 0.25) !important;
}

/* 好友操作确认弹窗 */
:global(.friend-action-dialog) {
  background: rgba(28, 38, 50, 0.97) !important;
  border: 1px solid rgba(67, 243, 255, 0.25) !important;
  border-radius: 14px !important;
  backdrop-filter: blur(20px) !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35) !important;
  padding: 0 !important;
  overflow: hidden;
}

:global(.friend-action-dialog .el-message-box__header) {
  padding: 20px 24px 12px !important;
  border-bottom: 1px solid rgba(67, 243, 255, 0.1) !important;
}

:global(.friend-action-dialog .el-message-box__title) {
  color: rgba(255, 255, 255, 0.95) !important;
  font-size: 16px !important;
  font-weight: 600 !important;
}

:global(.friend-action-dialog .el-message-box__headerbtn .el-message-box__close) {
  color: rgba(255, 255, 255, 0.5) !important;
}

:global(.friend-action-dialog .el-message-box__headerbtn:hover .el-message-box__close) {
  color: #43f3ff !important;
}

:global(.friend-action-dialog .el-message-box__content) {
  padding: 16px 24px 20px !important;
  color: rgba(255, 255, 255, 0.7) !important;
}

:global(.friend-action-dialog .el-message-box__message p) {
  color: rgba(255, 255, 255, 0.7) !important;
  font-size: 14px !important;
}

:global(.friend-action-dialog .el-message-box__status .el-icon) {
  color: #ff884d !important;
}

:global(.friend-action-dialog .el-message-box__btns) {
  padding: 12px 24px 20px !important;
  display: flex !important;
  gap: 12px !important;
  justify-content: flex-end !important;
}

:global(.friend-action-dialog .el-message-box__btns .el-button) {
  border-radius: 8px !important;
  padding: 8px 20px !important;
  font-size: 14px !important;
  transition: all 0.2s ease !important;
}

:global(.friend-action-dialog .el-message-box__btns .el-button--default) {
  background: rgba(35, 45, 60, 0.8) !important;
  border: 1px solid rgba(67, 243, 255, 0.25) !important;
  color: rgba(255, 255, 255, 0.8) !important;
}

:global(.friend-action-dialog .el-message-box__btns .el-button--default:hover) {
  background: rgba(67, 243, 255, 0.1) !important;
  border-color: rgba(67, 243, 255, 0.4) !important;
  color: #43f3ff !important;
}

:global(.friend-action-dialog .el-message-box__btns .el-button--primary) {
  background: rgba(67, 243, 255, 0.2) !important;
  border: 1px solid rgba(67, 243, 255, 0.5) !important;
  color: #43f3ff !important;
}

:global(.friend-action-dialog .el-message-box__btns .el-button--primary:hover) {
  background: rgba(67, 243, 255, 0.35) !important;
  border-color: rgba(67, 243, 255, 0.7) !important;
  box-shadow: 0 0 12px rgba(67, 243, 255, 0.25) !important;
}
</style>
