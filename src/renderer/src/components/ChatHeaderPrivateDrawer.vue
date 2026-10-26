<template>
    <el-drawer v-model="visible" title="" modal-penetrable :show-close="false">
        <div class="chat-set-content">
            <div class="avatar">
                <img :src="conversation.avatar" alt="">
                <div>{{ conversation.remark || friendStore.friendInfoMap[conversation.targetId || '']?.remark || conversation.name }}</div>
            </div>
            <div class="conversation-set">
                <div class="set1">
                    <span>设为置顶</span>
                    <el-switch :model-value="conversationStore.conversationMap[conversation.id]?.isTop ?? conversation.isTop" :active-value=1 :inactive-value=0
                        @change="changeTopStatus" />
                </div>
                <div class="set2">
                    <span>消息免打扰</span>
                    <el-switch :model-value="conversationStore.conversationMap[conversation.id]?.isMute ?? conversation.isMute" :active-value=1 :inactive-value=0
                        @change="changeMuteStatus" />
                </div>
            </div>
            <div class="button">
                <a @click="clearMessageHistory">清空聊天记录</a>
                <a @click="deleteFriend">删除好友</a>
            </div>
        </div>
    </el-drawer>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { updateConversationTopStatus, updateConversationMuteStatus, clearHistoryMessageSync, deleteFriendSync, deleteConversationSync } from '@/db/syncDB';
import { messageInfo } from '@/stores/modules/MessageStore';
import { friendInfo } from '@/stores/modules/ContactListStore';
import { conversationInfo } from '@/stores/modules/ConversationStore';
import { useRouter } from 'vue-router';
import { createContentJson, createSystemMessagePack } from '@/utils/systemMessageUtil';
import { getSystemMsgText, SystemMsgSubType } from '@/utils/constants';
import { Message } from '@/types/message';

const messageStore = messageInfo()
const friendStore = friendInfo()
const conversationStore = conversationInfo()
const router = useRouter()

const username = ref('')
const avatar = ref('')

const props = defineProps({
    conversation: { type: Object, default: () => ({}) },
    modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const changeTopStatus = (value: string | number | boolean) => {
    const status = Number(value)
    conversationStore.setConversationMap(props.conversation.id, {
        ...props.conversation,
        ...conversationStore.conversationMap[props.conversation.id],
        isTop: status
    })
    updateConversationTopStatus(props.conversation.id, props.conversation.userId, status)
}

const changeMuteStatus = (value: string | number | boolean) => {
    const status = Number(value)
    conversationStore.setConversationMap(props.conversation.id, {
        ...props.conversation,
        ...conversationStore.conversationMap[props.conversation.id],
        isMute: status
    })
    updateConversationMuteStatus(props.conversation.id, props.conversation.userId, status)
}

const clearMessageHistory = () => {
    messageStore.clearConversationMessages(props.conversation.id)
    clearHistoryMessageSync(props.conversation.id)
    ElMessage.success('聊天记录清理成功')
}

const deleteFriend = async () => {
    const friendId = props.conversation.targetId
    const conversationId = props.conversation.id
    deleteFriendSync(friendId)
    deleteConversationSync(conversationId)
    friendStore.deleteFriendMap(friendId)
    conversationStore.deleteConversation(conversationId)
    router.push({ name: 'messageList' })

    const tpl = getSystemMsgText(SystemMsgSubType.FRIEND_DELETED)
    const content = createContentJson(tpl, username.value, '', '', avatar.value)
    const receiverId = friendId
    const receiverIds = [friendId]

    const systemMessagePack = await createSystemMessagePack(
        receiverId,
        conversationId,
        SystemMsgSubType.FRIEND_DELETED,
        content,
        receiverIds
    )
    messageStore.sendSystemMessage(systemMessagePack as Message, conversationId, receiverIds as string[])
}

watch(() => props.conversation.id, async () => {
    username.value = await (window as any).userInfoApi.storeGetUserInfo('username')
    avatar.value = await (window as any).userInfoApi.storeGetUserInfo('avatar')
}, { immediate: true })
</script>

<style scoped>
.chat-set-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px 20px;
    box-sizing: border-box;
}

.avatar {
    width: auto;
    height: auto;
    margin-bottom: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
}

.avatar img {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 0;
    border: 3px solid rgba(var(--color-accent-rgb), 0.4);
    box-shadow: 0 0 20px rgba(var(--color-accent-rgb), 0.3);
    transition: all 0.3s ease;
}

.avatar img:hover {
    border-color: rgba(var(--color-accent-rgb), 0.7);
    box-shadow: 0 0 30px rgba(var(--color-accent-rgb), 0.5);
    transform: scale(1.05);
}

.avatar div {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-accent);
    text-shadow: 0 0 8px rgba(var(--color-accent-rgb), 0.3);
}

.conversation-set {
    width: 80%;
    display: flex;
    flex-direction: column;
    gap: 25px;
    margin-bottom: 40px;
}

.conversation-set .set1,
.conversation-set .set2 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 40px;
    color: var(--color-text-primary);
}

.conversation-set .set1 el-switch,
.conversation-set .set2 el-switch {
    flex-shrink: 0;
}

:deep(.el-switch) {
    --el-switch-on-color: var(--color-accent);
    --el-switch-off-color: rgba(255, 255, 255, 0.2);
    --el-switch-core-border-color: rgba(var(--color-accent-rgb), 0.3);
}

:deep(.el-switch.is-checked .el-switch__core) {
    box-shadow: 0 0 12px rgba(var(--color-accent-rgb), 0.5);
}

.button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-top: auto;
}

.button a {
    flex: 1;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    box-sizing: border-box;
    color: rgba(var(--color-accent-rgb), 0.9);
    background: rgba(var(--color-accent-rgb), 0.1);
    border: 1px solid rgba(var(--color-accent-rgb), 0.3);
    transition: all 0.3s ease;
}

.button a:hover {
    background: rgba(var(--color-accent-rgb), 0.2);
    border-color: rgba(var(--color-accent-rgb), 0.5);
    box-shadow: 0 0 15px rgba(var(--color-accent-rgb), 0.3);
    transform: translateY(-2px);
}

.button a:last-child {
    color: #ff4757;
    background: rgba(255, 71, 87, 0.1);
    border-color: rgba(255, 71, 87, 0.3);
}

.button a:last-child:hover {
    background: rgba(255, 71, 87, 0.2);
    border-color: rgba(255, 71, 87, 0.5);
    box-shadow: 0 0 15px rgba(255, 71, 87, 0.3);
}
</style>
