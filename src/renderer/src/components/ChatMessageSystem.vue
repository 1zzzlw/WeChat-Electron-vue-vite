<template>
    <div>
        <ChatMessageTime :dataTime="message.sendTime"></ChatMessageTime>
        <div class="system-message">
            {{ message.content }}
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import ChatMessageTime from './ChatMessageTime.vue';

const props = defineProps({
    message: {
        type: Object,
        default: {}
    }
})

const dataMessage = computed(() => {
    const data = { ...props.message }
    // 撤回消息通知

    // 添加好友成功的通知

    // 群创建成功通知

    // 入群成功的通知

    // 拉黑好友的通知

    // 退出群聊

    // 踢出群聊

})
</script>
<style scoped></style>