<template>
    <el-dialog v-model="visible" :title="'邀请成员加入 ' + (conversation.name || '群聊')" width="380px"
        class="invite-dialog">
        <div class="invite-friend-list" v-if="availableFriends.length > 0">
            <div v-for="friend in availableFriends" :key="friend.friendId" class="invite-friend-item"
                :class="{ selected: selectedInviteUserIds.includes(friend.friendId) }"
                @click="toggleInviteFriend(friend.friendId)">
                <img :src="friend.avatar" class="invite-friend-avatar">
                <span class="invite-friend-name">{{ friend.remark || friend.username || '好友' }}</span>
                <el-checkbox :model-value="selectedInviteUserIds.includes(friend.friendId)" @click.stop
                    @change="toggleInviteFriend(friend.friendId)" />
            </div>
        </div>
        <div v-else class="invite-empty">
            <span>暂无可邀请的好友（所有好友已在群中）</span>
        </div>
        <template #footer>
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" :disabled="selectedInviteUserIds.length === 0" @click="confirmInvite">
                邀请（{{ selectedInviteUserIds.length }}）
            </el-button>
        </template>
    </el-dialog>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { ElMessage, ElCheckbox, ElButton, ElDialog } from 'element-plus';
import { friendInfo } from '../stores/modules/ContactListStore';
import { groupMemberInfo } from '../stores/modules/GroupMemberStore';
import { batchInviteMembersApi, getGroupMemberListApi } from '../api/Conversation';
import { getFriendList } from '../db/dualDB';

const friendStore = friendInfo()
const groupMemberStore = groupMemberInfo()

const selectedInviteUserIds = ref<(number | string)[]>([])

const props = defineProps({
    conversation: { type: Object, default: () => ({}) },
    modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const availableFriends = computed(() => {
    const allFriends = friendStore.friendInfoMap ? Object.values(friendStore.friendInfoMap) : []
    const groupMemberUserIds = new Set(
        (groupMemberStore.getGroupMemberList(props.conversation.id) || []).map((m: any) => String(m.userId))
    )
    return allFriends.filter((f: any) =>
        !groupMemberUserIds.has(String(f.friendId))
    )
})

const toggleInviteFriend = (friendUserId: number | string) => {
    const idx = selectedInviteUserIds.value.indexOf(friendUserId)
    if (idx >= 0) {
        selectedInviteUserIds.value.splice(idx, 1)
    } else {
        selectedInviteUserIds.value.push(friendUserId)
    }
}

watch(() => props.modelValue, async (val) => {
    if (val) {
        selectedInviteUserIds.value = []
        const piniaFriends = friendStore.friendInfoMap ? Object.values(friendStore.friendInfoMap) : []
        if (piniaFriends.length === 0) {
            try {
                const dbFriends = await getFriendList()
                if (dbFriends && dbFriends.length > 0) {
                    dbFriends.forEach((f: any) => friendStore.setFriendMap(f.friendId || f.userId, f))
                }
            } catch (e) {
                console.warn('加载好友列表失败', e)
            }
        }
    }
})

const confirmInvite = async () => {
    if (selectedInviteUserIds.value.length === 0) return
    const conversationId = props.conversation.id
    try {
        await batchInviteMembersApi(conversationId, selectedInviteUserIds.value)
        ElMessage.success(`已成功邀请 ${selectedInviteUserIds.value.length} 位成员入群`)
        visible.value = false
        selectedInviteUserIds.value = []
        try {
            const res: any = await getGroupMemberListApi(conversationId)
            if (res.code === 200 && res.data) {
                groupMemberStore.groupMemberMap[conversationId] = res.data.map((item: any) => ({
                    conversationId,
                    userId: item.userId,
                    username: item.username,
                    role: item.role,
                    avatar: item.avatar,
                    isMute: item.isMute
                }))
            }
        } catch { /* 刷新失败不阻塞 */ }
    } catch (e) {
        ElMessage.error('邀请成员失败')
    }
}
</script>

<style scoped>
:deep(.invite-dialog) {
    --el-dialog-bg-color: rgba(35, 45, 60, 0.85) !important;
    background-color: var(--el-dialog-bg-color) !important;
    backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(67, 243, 255, 0.4) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(67, 243, 255, 0.2) !important;
    overflow: hidden !important;
}

:deep(.invite-dialog .el-dialog__header) {
    border-bottom: 1px solid rgba(67, 243, 255, 0.2) !important;
    padding: 16px 20px !important;
    margin: 0 !important;
}

:deep(.invite-dialog .el-dialog__title) {
    color: #43f3ff !important;
    font-weight: 600 !important;
    font-size: 16px !important;
    text-shadow: 0 0 8px rgba(67, 243, 255, 0.3) !important;
}

:deep(.invite-dialog .el-dialog__headerbtn .el-dialog__close) {
    color: rgba(255, 255, 255, 0.5) !important;
    transition: color 0.2s ease !important;
}

:deep(.invite-dialog .el-dialog__headerbtn .el-dialog__close:hover) {
    color: #43f3ff !important;
}

:deep(.invite-dialog .el-dialog__body) {
    padding: 12px 20px !important;
}

:deep(.invite-dialog .el-dialog__footer) {
    border-top: 1px solid rgba(67, 243, 255, 0.2) !important;
    padding: 12px 20px !important;
    display: flex !important;
    justify-content: flex-end !important;
    gap: 12px !important;
}

:deep(.invite-dialog .el-dialog__footer .el-button) {
    padding: 8px 20px !important;
    border: 1px solid rgba(67, 243, 255, 0.3) !important;
    background: rgba(35, 45, 60, 0.7) !important;
    color: #f0f0f0 !important;
    border-radius: 6px !important;
    transition: all 0.2s ease !important;
}

:deep(.invite-dialog .el-dialog__footer .el-button:hover) {
    background: rgba(67, 243, 255, 0.15) !important;
    border-color: rgba(67, 243, 255, 0.5) !important;
    color: #43f3ff !important;
}

:deep(.invite-dialog .el-dialog__footer .el-button--primary) {
    background: rgba(67, 243, 255, 0.2) !important;
    border-color: rgba(67, 243, 255, 0.5) !important;
    color: #43f3ff !important;
}

:deep(.invite-dialog .el-dialog__footer .el-button--primary:hover) {
    background: rgba(67, 243, 255, 0.35) !important;
    border-color: rgba(67, 243, 255, 0.7) !important;
    box-shadow: 0 0 12px rgba(67, 243, 255, 0.3) !important;
}

:deep(.invite-dialog .el-dialog__footer .el-button.is-disabled) {
    opacity: 0.4 !important;
    cursor: not-allowed !important;
}

:deep(.invite-dialog .el-checkbox__input .el-checkbox__inner) {
    background: rgba(35, 45, 60, 0.8) !important;
    border: 1px solid rgba(67, 243, 255, 0.4) !important;
}

:deep(.invite-dialog .el-checkbox__input.is-checked .el-checkbox__inner) {
    background: rgba(67, 243, 255, 0.8) !important;
    border-color: #43f3ff !important;
}

:deep(.invite-dialog .el-checkbox__input.is-checked .el-checkbox__inner::after) {
    border-color: #000 !important;
}

.invite-friend-list {
    max-height: 360px;
    overflow-y: auto;
    padding: 4px 0;
}

.invite-friend-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

.invite-friend-item:hover {
    background: rgba(67, 243, 255, 0.08);
    border-color: rgba(67, 243, 255, 0.15);
}

.invite-friend-item.selected {
    background: rgba(67, 243, 255, 0.12);
    border-color: rgba(67, 243, 255, 0.3);
}

.invite-friend-avatar {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    object-fit: cover;
    border: 1px solid rgba(67, 243, 255, 0.3);
    flex-shrink: 0;
    transition: all 0.2s ease;
}

.invite-friend-item:hover .invite-friend-avatar {
    border-color: rgba(67, 243, 255, 0.6);
    box-shadow: 0 0 8px rgba(67, 243, 255, 0.2);
}

.invite-friend-name {
    flex: 1;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.invite-empty {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 120px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
}

.invite-friend-list::-webkit-scrollbar {
    width: 4px;
}

.invite-friend-list::-webkit-scrollbar-track {
    background: transparent;
}

.invite-friend-list::-webkit-scrollbar-thumb {
    background: rgba(67, 243, 255, 0.3);
    border-radius: 2px;
}
</style>
