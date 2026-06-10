<template>
    <div class="chat-header">
        <div class="title">
            {{ conversation.remark || friendStore.friendInfoMap[conversation.targetId || '']?.remark || conversation.name }}
        </div>
        <div class="chat-set">
            <el-icon class="left-icon" size="25" @click="openDrawer()">
                <MoreFilled />
            </el-icon>

            <ChatHeaderPrivateDrawer v-model="drawerPrivate" :conversation="conversation" />

            <ChatHeaderGroupDrawer v-model="drawerGroup" :conversation="conversation"
                @openInvite="inviteDialogVisible = true" />

            <ChatHeaderInviteDialog v-model="inviteDialogVisible" :conversation="conversation" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { MoreFilled } from '@element-plus/icons-vue';
import { friendInfo } from '../stores/modules/ContactListStore';
import ChatHeaderPrivateDrawer from './ChatHeaderPrivateDrawer.vue'
import ChatHeaderGroupDrawer from './ChatHeaderGroupDrawer.vue'
import ChatHeaderInviteDialog from './ChatHeaderInviteDialog.vue'

const friendStore = friendInfo()

const drawerPrivate = ref(false)
const drawerGroup = ref(false)
const inviteDialogVisible = ref(false)

const props = defineProps({
    conversation: { type: Object, default: () => ({}) }
})

const openDrawer = () => {
    if (props.conversation.type === 0) {
        drawerPrivate.value = true
    } else {
        drawerGroup.value = true
    }
}
</script>

<style scoped>
.chat-header {
    height: 70px;
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background: linear-gradient(135deg, rgba(67, 243, 255, 0.08) 0%, rgba(0, 217, 255, 0.05) 100%);
    border-bottom: 1px solid rgba(67, 243, 255, 0.3);
    box-shadow: 0 2px 12px rgba(67, 243, 255, 0.1);
    -webkit-app-region: drag;
    color: rgba(255, 255, 255, 0.95);
}

.title {
    font-size: 16px;
    font-weight: 600;
    color: #43f3ff;
    text-shadow: 0 0 8px rgba(67, 243, 255, 0.4);
}

.left-icon {
    position: absolute;
    top: 30px;
    right: 20px;
    -webkit-app-region: no-drag;
    width: 30px;
    height: 30px;
    margin: 0;
    font-size: 20px;
    background-color: transparent;
    border: none;
    color: rgba(67, 243, 255, 0.8);
    cursor: pointer;
    transition: all 0.3s ease;
}

.left-icon:hover {
    color: #43f3ff;
    text-shadow: 0 0 10px rgba(67, 243, 255, 0.6);
    transform: scale(1.1);
}

:deep(.el-drawer) {
    width: 50% !important;
    --el-drawer-bg-color: rgba(35, 45, 60, 0.75);
    background-color: var(--el-drawer-bg-color);
    backdrop-filter: blur(20px);
    border-left: 1px solid rgba(67, 243, 255, 0.3);
    box-shadow: -4px 0 24px rgba(67, 243, 255, 0.1);
}

:deep(.el-drawer__body) {
    padding: 20px 16px;
    color: rgba(255, 255, 255, 0.9);
    overflow: hidden;
}
</style>
