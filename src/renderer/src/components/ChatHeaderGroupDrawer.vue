<template>
    <el-drawer v-model="visible" title="" modal-penetrable :show-close="false">
        <div class="group-drawer-content">
            <div class="group-header">
                <div class="group-avatar">
                    <img :src="conversation.avatar + '?t=' + Date.now()" alt="群头像">
                </div>
                <div class="group-name">
                    {{ conversation.remark || conversation.name }}
                    <el-icon v-if="userInfo?.role === 2 || userInfo?.role === 1" class="edit-group-icon"
                        @click="editGroupInfo">
                        <Edit />
                    </el-icon>
                </div>
                <div class="group-id">群号：{{ conversation.id || '---' }}</div>
            </div>

            <div class="group-settings">
                <div class="setting-item">
                    <span class="setting-label">设为置顶</span>
                    <el-switch v-model="conversation.isTop" :active-value="1" :inactive-value="0"
                        @change="changeTopStatus" />
                </div>

                <div class="setting-item">
                    <span class="setting-label">消息免打扰</span>
                    <el-switch v-model="conversation.isMute" :active-value="1" :inactive-value="0"
                        @change="changeMuteStatus" />
                </div>
            </div>

            <div class="group-members">
                <div class="members-header">
                    <span class="members-title">群成员（{{ groupList?.length || 0 }}）</span>
                    <div class="members-header-actions">
                        <el-icon class="members-invite" title="邀请成员" @click="$emit('openInvite')">
                            <Plus />
                        </el-icon>
                        <el-icon class="members-more">
                            <ArrowRight />
                        </el-icon>
                    </div>
                </div>
                <div class="members-list">
                    <div v-for="groupMember in groupList" :key="groupMember.userId">
                        <ContextMenu v-if="getMemberMenu(groupMember).length > 0"
                            :menu="getMemberMenu(groupMember)"
                            @select="(item: any) => handleChoice(item, groupMember)">
                            <GroupMemberItem :member="groupMember" />
                        </ContextMenu>
                        <GroupMemberItem v-else :member="groupMember" />
                    </div>
                    <div class="member-more-item">
                        <el-icon><More /></el-icon>
                        <span>查看更多</span>
                    </div>
                </div>
            </div>

            <div class="group-notice">
                <div class="notice-header">
                    <el-icon><Bell /></el-icon>
                    <span>群公告</span>
                </div>
                <div class="notice-content">
                    {{ conversation.notice || '暂无群公告' }}
                </div>
            </div>

            <div class="group-actions">
                <a class="action-btn danger" v-if="userInfo?.role === 2" @click="dismissGroup">
                    <el-icon><Delete /></el-icon>
                    <span>解散群聊</span>
                </a>
                <a class="action-btn secondary" v-else @click="exitGroup">
                    <el-icon><SwitchButton /></el-icon>
                    <span>退出群聊</span>
                </a>
            </div>
        </div>
    </el-drawer>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { Edit, Plus, ArrowRight, More, Bell, Delete, SwitchButton } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { updateConversationTopStatus, updateConversationMuteStatus, deleteConversationSync } from '../db/syncDB';
import { messageInfo } from '../stores/modules/MessageStore';
import { groupMemberInfo } from '../stores/modules/GroupMemberStore';
import { conversationInfo } from '../stores/modules/ConversationStore';
import ContextMenu from './ContextMenu.vue'
import GroupMemberItem from './GroupMemberItem.vue'
import { useRouter } from 'vue-router';
import { createContentJson, createSystemMessagePack } from '../utils/systemMessageUtil';
import { getSystemMsgText, SystemMsgSubType } from '../utils/constants';
import { Message } from '../types/message';
import { GroupNumberExitApi, dissolveGroupApi, kickMemberApi, setAdminApi, muteMemberApi, transferOwnerApi, updateGroupInfoApi } from '../api/Conversation';

const messageStore = messageInfo()
const groupMemberStore = groupMemberInfo()
const conversationStore = conversationInfo()
const router = useRouter()

const username = ref('')
const avatar = ref('')
const userId = ref<string | number>('')

const props = defineProps({
    conversation: { type: Object, default: () => ({}) },
    modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'openInvite'])

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const changeTopStatus = () => {
    updateConversationTopStatus(props.conversation.id, props.conversation.userId, props.conversation.isTop)
}

const changeMuteStatus = () => {
    updateConversationMuteStatus(props.conversation.id, props.conversation.userId, props.conversation.isMute)
}

const groupList = computed(() => {
    if (props.conversation.type === 1) {
        return (groupMemberStore.getGroupMemberList(props.conversation.id) || []).sort((a: any, b: any) => {
            if (a.role === 2) return -1
            if (b.role === 2) return 1
            return 0;
        }).slice(0, 5)
    }
    return []
})

const allGroupMemberIds = computed(() => {
    if (props.conversation.type === 1) {
        const allMembers = groupMemberStore.getGroupMemberList(props.conversation.id) || []
        return allMembers
            .filter((m: any) => String(m.userId) !== String(userId.value))
            .map((m: any) => String(m.userId))
    }
    return []
})

const userInfo = computed(() => {
    if (props.conversation.type !== 1) return null
    const allMembers = groupMemberStore.getGroupMemberList(props.conversation.id) || []
    return allMembers.find((item: any) => String(item.userId) === String(userId.value))
})

const exitGroup = async () => {
    try {
        await ElMessageBox.confirm('确定要退出此群聊吗？', '退出群聊', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
            customClass: 'group-action-confirm-dialog'
        })
    } catch {
        return
    }

    const conversationId = props.conversation.id
    try {
        await GroupNumberExitApi(conversationId)
    } catch (e) {
        ElMessage.error('退出群聊失败')
        return
    }

    router.push({ name: 'messageList' })
    deleteConversationSync(conversationId)
    conversationStore.deleteConversation(conversationId)

    const tpl = getSystemMsgText(SystemMsgSubType.GROUP_LEAVED, { name: username.value })
    const content = createContentJson(tpl, username.value, conversationId, props.conversation.name, avatar.value)
    const systemMessagePack = await createSystemMessagePack(conversationId, conversationId, SystemMsgSubType.GROUP_LEAVED, content, allGroupMemberIds.value)
    messageStore.sendSystemMessage(systemMessagePack as Message, conversationId, allGroupMemberIds.value as string[])
}

const dismissGroup = async () => {
    try {
        await ElMessageBox.confirm('确定要解散此群聊吗？此操作不可撤销。', '解散群聊', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
            customClass: 'group-action-confirm-dialog'
        })
    } catch {
        return
    }

    const conversationId = props.conversation.id
    try {
        await dissolveGroupApi(conversationId)
    } catch (e) {
        ElMessage.error('解散群聊失败')
        return
    }

    router.push({ name: 'messageList' })
    deleteConversationSync(conversationId)
    conversationStore.deleteConversation(conversationId)

    const tpl = getSystemMsgText(SystemMsgSubType.GROUP_DISBANDED, { name: username.value })
    const content = createContentJson(tpl, username.value, conversationId, props.conversation.name, props.conversation.avatar)
    const systemMessagePack = await createSystemMessagePack(conversationId, conversationId, SystemMsgSubType.GROUP_DISBANDED, content, allGroupMemberIds.value)
    messageStore.sendSystemMessage(systemMessagePack as Message, conversationId, allGroupMemberIds.value as string[])
}

const getMemberMenu = (member: any) => {
    const isOwner = userInfo.value?.role === 2
    const isAdmin = userInfo.value?.role === 1
    const isSelf = String(member.userId) === String(userId.value)

    if (isSelf) return []

    const menu: any[] = []

    if (isOwner) {
        if (member.role === 1) {
            menu.push({ label: '取消管理员' })
        } else if (member.role === 0) {
            menu.push({ label: '设置为管理员' })
        }
        menu.push({ label: '踢出群聊' })
        menu.push({ label: member.isMute ? '取消禁言' : '禁言' })
        menu.push({ divider: true })
        menu.push({ label: '转让群主' })
    } else if (isAdmin) {
        if (member.role === 0) {
            menu.push({ label: '踢出群聊' })
            menu.push({ label: member.isMute ? '取消禁言' : '禁言' })
        }
    }

    return menu
}

const handleChoice = async (item: any, member: any) => {
    const conversationId = props.conversation.id
    switch (item.label) {
        case '设置为管理员': {
            try {
                await setAdminApi(conversationId, member.userId, true)
                const members = groupMemberStore.groupMemberMap[conversationId] || []
                const m = members.find((m: any) => m.userId === member.userId)
                if (m) m.role = 1
                ElMessage.success('已设置为管理员')
            } catch (e) {
                ElMessage.error('设置管理员失败')
            }
            break
        }
        case '踢出群聊': {
            try {
                await kickMemberApi(conversationId, member.userId)
                const members = groupMemberStore.groupMemberMap[conversationId] || []
                groupMemberStore.groupMemberMap[conversationId] = members.filter((m: any) => m.userId !== member.userId)
                ElMessage.success('已踢出群聊')
            } catch (e) {
                ElMessage.error('踢出群聊失败')
            }
            break
        }
        case '禁言': {
            try {
                await muteMemberApi(conversationId, member.userId, true)
                const members = groupMemberStore.groupMemberMap[conversationId] || []
                const m = members.find((m: any) => m.userId === member.userId)
                if (m) m.isMute = 1
                ElMessage.success('已禁言')
            } catch (e) {
                ElMessage.error('操作失败')
            }
            break
        }
        case '取消禁言': {
            try {
                await muteMemberApi(conversationId, member.userId, false)
                const members = groupMemberStore.groupMemberMap[conversationId] || []
                const m = members.find((m: any) => m.userId === member.userId)
                if (m) m.isMute = 0
                ElMessage.success('已取消禁言')
            } catch (e) {
                ElMessage.error('操作失败')
            }
            break
        }
        case '取消管理员': {
            try {
                await setAdminApi(conversationId, member.userId, false)
                const members = groupMemberStore.groupMemberMap[conversationId] || []
                const m = members.find((m: any) => m.userId === member.userId)
                if (m) m.role = 0
                ElMessage.success('已取消管理员')
            } catch (e) {
                ElMessage.error('取消管理员失败')
            }
            break
        }
        case '转让群主': {
            try {
                await ElMessageBox.confirm(`确定将群主转让给 ${member.username || '该成员'} 吗？`, '转让群主', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning',
                    customClass: 'group-action-confirm-dialog'
                })
            } catch {
                break
            }
            try {
                await transferOwnerApi(conversationId, member.userId)
                const members = groupMemberStore.groupMemberMap[conversationId] || []
                const m = members.find((m: any) => m.userId === member.userId)
                if (m) m.role = 2
                const oldOwner = members.find((m: any) => String(m.userId) === String(userId.value))
                if (oldOwner) oldOwner.role = 0
                ElMessage.success('群主已转让')
            } catch (e) {
                ElMessage.error('转让群主失败')
            }
            break
        }
    }
}

const editGroupInfo = async () => {
    try {
        const { value: newName } = await ElMessageBox.prompt('请输入新的群名称', '修改群名称', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputValue: props.conversation.name,
            inputPattern: /^.{1,30}$/,
            inputErrorMessage: '群名称长度需在 1-30 个字符之间',
            customClass: 'edit-group-name-dialog'
        })

        await updateGroupInfoApi({
            conversationId: props.conversation.id,
            groupName: newName
        })

        conversationStore.setConversationMap(props.conversation.id, { name: newName })
        ElMessage.success('群名称已修改')
    } catch (e) {
        if (e !== 'cancel') {
            ElMessage.error('修改群名称失败')
        }
    }
}

watch(() => props.conversation.id, async () => {
    username.value = await (window as any).userInfoApi.storeGetUserInfo('username')
    avatar.value = await (window as any).userInfoApi.storeGetUserInfo('avatar')
    userId.value = await (window as any).userInfoApi.storeGetUserInfo('userId')
}, { immediate: true })
</script>

<style scoped>
.group-drawer-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 30px 20px 20px;
    box-sizing: border-box;
    overflow-y: auto;
}

.group-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 35px;
    padding-bottom: 25px;
    border-bottom: 1px solid rgba(67, 243, 255, 0.2);
}

.group-avatar {
    position: relative;
    width: 100px;
    height: 100px;
    margin-bottom: 15px;
}

.group-avatar img {
    width: 100%;
    height: 100%;
    border-radius: 16px;
    object-fit: cover;
    border: 3px solid rgba(67, 243, 255, 0.4);
    box-shadow: 0 0 20px rgba(67, 243, 255, 0.3);
}

.avatar-badge {
    position: absolute;
    bottom: -5px;
    right: -5px;
    padding: 4px 10px;
    background: rgba(67, 243, 255, 0.9);
    border-radius: 12px;
    font-size: 11px;
    color: #000;
    font-weight: 600;
    border: 2px solid rgba(20, 25, 35, 0.8);
    box-shadow: 0 0 10px rgba(67, 243, 255, 0.5);
}

.group-name {
    font-size: 20px;
    font-weight: 600;
    color: #43f3ff;
    text-shadow: 0 0 8px rgba(67, 243, 255, 0.3);
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.edit-group-icon {
    font-size: 14px;
    color: rgba(67, 243, 255, 0.5);
    cursor: pointer;
    transition: all 0.2s ease;
}

.edit-group-icon:hover {
    color: #43f3ff;
    transform: scale(1.2);
}

.group-id {
    font-size: 13px;
    color: rgba(67, 243, 255, 0.6);
}

.group-settings {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 30px;
    padding: 15px 0;
    border-bottom: 1px solid rgba(67, 243, 255, 0.2);
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 36px;
}

.setting-label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
}

.group-members {
    width: 100%;
    margin-bottom: 25px;
}

.members-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding: 0 5px;
}

.members-title {
    font-size: 15px;
    font-weight: 500;
    color: #43f3ff;
}

.members-more {
    color: rgba(67, 243, 255, 0.6);
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s;
}

.members-more:hover {
    color: #43f3ff;
    text-shadow: 0 0 8px rgba(67, 243, 255, 0.4);
}

.members-list {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 15px 10px;
    padding: 10px 5px;
}

.member-more-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 8px 4px;
    border-radius: 8px;
    transition: all 0.3s;
    justify-content: center;
    color: rgba(67, 243, 255, 0.6);
}

.member-more-item:hover {
    background: rgba(67, 243, 255, 0.1);
}

.member-more-item .el-icon {
    font-size: 20px;
    margin-bottom: 4px;
}

.member-more-item span {
    font-size: 10px;
}

.group-notice {
    width: 100%;
    padding: 15px;
    background: rgba(67, 243, 255, 0.05);
    border-radius: 10px;
    border: 1px solid rgba(67, 243, 255, 0.2);
    margin-bottom: auto;
}

.notice-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
}

.notice-header .el-icon {
    color: #43f3ff;
    font-size: 16px;
}

.notice-header span {
    font-size: 14px;
    font-weight: 500;
    color: #43f3ff;
}

.notice-content {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
    word-break: break-all;
}

.notice-content:empty::before {
    content: '暂无群公告';
    color: rgba(255, 255, 255, 0.4);
    font-style: italic;
}

.group-actions {
    width: 100%;
    display: flex;
    gap: 15px;
    padding-top: 20px;
    margin-top: 10px;
    border-top: 1px solid rgba(67, 243, 255, 0.2);
}

.action-btn {
    flex: 1;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.9);
}

.action-btn.secondary {
    background: rgba(67, 243, 255, 0.1);
    border: 1px solid rgba(67, 243, 255, 0.3);
    color: #43f3ff;
}

.action-btn.secondary:hover {
    background: rgba(67, 243, 255, 0.2);
    border-color: rgba(67, 243, 255, 0.5);
    box-shadow: 0 0 15px rgba(67, 243, 255, 0.3);
    transform: translateY(-2px);
}

.action-btn.danger {
    background: rgba(255, 71, 87, 0.1);
    border: 1px solid rgba(255, 71, 87, 0.3);
    color: #ff4757;
}

.action-btn.danger:hover {
    background: rgba(255, 71, 87, 0.2);
    border-color: rgba(255, 71, 87, 0.5);
    box-shadow: 0 0 15px rgba(255, 71, 87, 0.3);
    transform: translateY(-2px);
}

.action-btn:active {
    transform: translateY(0) scale(0.98);
}

.group-drawer-content::-webkit-scrollbar {
    width: 6px;
}

.group-drawer-content::-webkit-scrollbar-track {
    background: transparent;
}

.group-drawer-content::-webkit-scrollbar-thumb {
    background: rgba(67, 243, 255, 0.3);
    border-radius: 3px;
}

.group-drawer-content::-webkit-scrollbar-thumb:hover {
    background: rgba(67, 243, 255, 0.5);
}

.members-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.members-invite {
    color: rgba(67, 243, 255, 0.6);
    font-size: 18px;
    cursor: pointer;
    transition: all 0.3s;
    padding: 4px;
    border-radius: 50%;
    border: 1px solid rgba(67, 243, 255, 0.3);
}

.members-invite:hover {
    color: #43f3ff;
    border-color: rgba(67, 243, 255, 0.7);
    background: rgba(67, 243, 255, 0.15);
    text-shadow: 0 0 8px rgba(67, 243, 255, 0.4);
    transform: scale(1.1);
}

:deep(.el-switch) {
    --el-switch-on-color: #43f3ff;
    --el-switch-off-color: rgba(255, 255, 255, 0.2);
    --el-switch-core-border-color: rgba(67, 243, 255, 0.3);
}

:deep(.el-switch.is-checked .el-switch__core) {
    box-shadow: 0 0 12px rgba(67, 243, 255, 0.5);
}
</style>

<style>
/* 修改群名称弹窗（全局样式，因为 ElMessageBox 不受 scoped 影响） */
.edit-group-name-dialog {
    background: rgba(28, 38, 50, 0.97) !important;
    border: 1px solid rgba(67, 243, 255, 0.25) !important;
    border-radius: 14px !important;
    backdrop-filter: blur(20px) !important;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35),
        0 0 20px rgba(67, 243, 255, 0.08) !important;
    padding: 0 !important;
    overflow: hidden;
}

.edit-group-name-dialog .el-message-box__header {
    padding: 20px 24px 12px !important;
    border-bottom: 1px solid rgba(67, 243, 255, 0.1) !important;
}

.edit-group-name-dialog .el-message-box__title {
    color: rgba(255, 255, 255, 0.95) !important;
    font-size: 16px !important;
    font-weight: 600 !important;
}

.edit-group-name-dialog .el-message-box__headerbtn .el-message-box__close {
    color: rgba(255, 255, 255, 0.5) !important;
}

.edit-group-name-dialog .el-message-box__headerbtn:hover .el-message-box__close {
    color: #43f3ff !important;
}

.edit-group-name-dialog .el-message-box__content {
    padding: 16px 24px 20px !important;
    color: rgba(255, 255, 255, 0.7) !important;
}

.edit-group-name-dialog .el-message-box__message p {
    color: rgba(255, 255, 255, 0.7) !important;
    font-size: 14px !important;
}

.edit-group-name-dialog .el-message-box__input .el-input__wrapper {
    background: rgba(35, 45, 60, 0.8) !important;
    border: 1px solid rgba(67, 243, 255, 0.25) !important;
    border-radius: 8px !important;
    box-shadow: none !important;
}

.edit-group-name-dialog .el-message-box__input .el-input__wrapper.is-focus {
    border-color: #43f3ff !important;
    box-shadow: 0 0 8px rgba(67, 243, 255, 0.2) !important;
}

.edit-group-name-dialog .el-message-box__input .el-input__inner {
    color: rgba(255, 255, 255, 0.9) !important;
}

.edit-group-name-dialog .el-message-box__btns {
    padding: 12px 24px 20px !important;
    display: flex !important;
    gap: 12px !important;
    justify-content: flex-end !important;
}

.edit-group-name-dialog .el-message-box__btns .el-button {
    border-radius: 8px !important;
    padding: 8px 20px !important;
    font-size: 14px !important;
    transition: all 0.2s ease !important;
}

.edit-group-name-dialog .el-message-box__btns .el-button--default {
    background: rgba(35, 45, 60, 0.8) !important;
    border: 1px solid rgba(67, 243, 255, 0.25) !important;
    color: rgba(255, 255, 255, 0.8) !important;
}

.edit-group-name-dialog .el-message-box__btns .el-button--default:hover {
    background: rgba(67, 243, 255, 0.1) !important;
    border-color: rgba(67, 243, 255, 0.4) !important;
    color: #43f3ff !important;
}

.edit-group-name-dialog .el-message-box__btns .el-button--primary {
    background: rgba(67, 243, 255, 0.2) !important;
    border: 1px solid rgba(67, 243, 255, 0.5) !important;
    color: #43f3ff !important;
}

.edit-group-name-dialog .el-message-box__btns .el-button--primary:hover {
    background: rgba(67, 243, 255, 0.35) !important;
    border-color: rgba(67, 243, 255, 0.7) !important;
    box-shadow: 0 0 12px rgba(67, 243, 255, 0.25) !important;
}

/* 群操作确认弹窗 */
.group-action-confirm-dialog {
    background: rgba(28, 38, 50, 0.97) !important;
    border: 1px solid rgba(67, 243, 255, 0.25) !important;
    border-radius: 14px !important;
    backdrop-filter: blur(20px) !important;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35),
        0 0 20px rgba(67, 243, 255, 0.08) !important;
    padding: 0 !important;
    overflow: hidden;
}

.group-action-confirm-dialog .el-message-box__header {
    padding: 20px 24px 12px !important;
    border-bottom: 1px solid rgba(67, 243, 255, 0.1) !important;
}

.group-action-confirm-dialog .el-message-box__title {
    color: rgba(255, 255, 255, 0.95) !important;
    font-size: 16px !important;
    font-weight: 600 !important;
}

.group-action-confirm-dialog .el-message-box__headerbtn .el-message-box__close {
    color: rgba(255, 255, 255, 0.5) !important;
}

.group-action-confirm-dialog .el-message-box__headerbtn:hover .el-message-box__close {
    color: #43f3ff !important;
}

.group-action-confirm-dialog .el-message-box__content {
    padding: 16px 24px 20px !important;
    color: rgba(255, 255, 255, 0.7) !important;
}

.group-action-confirm-dialog .el-message-box__message p {
    color: rgba(255, 255, 255, 0.7) !important;
    font-size: 14px !important;
}

.group-action-confirm-dialog .el-message-box__status .el-icon {
    color: #ff884d !important;
}

.group-action-confirm-dialog .el-message-box__btns {
    padding: 12px 24px 20px !important;
    display: flex !important;
    gap: 12px !important;
    justify-content: flex-end !important;
}

.group-action-confirm-dialog .el-message-box__btns .el-button {
    border-radius: 8px !important;
    padding: 8px 20px !important;
    font-size: 14px !important;
    transition: all 0.2s ease !important;
}

.group-action-confirm-dialog .el-message-box__btns .el-button--default {
    background: rgba(35, 45, 60, 0.8) !important;
    border: 1px solid rgba(67, 243, 255, 0.25) !important;
    color: rgba(255, 255, 255, 0.8) !important;
}

.group-action-confirm-dialog .el-message-box__btns .el-button--default:hover {
    background: rgba(67, 243, 255, 0.1) !important;
    border-color: rgba(67, 243, 255, 0.4) !important;
    color: #43f3ff !important;
}

.group-action-confirm-dialog .el-message-box__btns .el-button--primary {
    background: rgba(67, 243, 255, 0.2) !important;
    border: 1px solid rgba(67, 243, 255, 0.5) !important;
    color: #43f3ff !important;
}

.group-action-confirm-dialog .el-message-box__btns .el-button--primary:hover {
    background: rgba(67, 243, 255, 0.35) !important;
    border-color: rgba(67, 243, 255, 0.7) !important;
    box-shadow: 0 0 12px rgba(67, 243, 255, 0.25) !important;
}
</style>
