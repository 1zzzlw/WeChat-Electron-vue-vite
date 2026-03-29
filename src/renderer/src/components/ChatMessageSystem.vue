<template>
    <div class="system-msg-wrapper">
        <!-- 展示系统消息的时间 -->
        <ChatMessageTime :dataTime="message.sendTime"></ChatMessageTime>

        <!-- 居中展示的系统消息文本 -->
        <div class="system-message-content">
            {{ displayContent }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ChatMessageTime from './ChatMessageTime.vue';

const props = defineProps({
    message: {
        type: Object,
        required: true,
        default: () => ({})
    }
})

const currentUserId = ref('');

onMounted(async () => {
    currentUserId.value = await (window as any).userInfoApi.storeGetUserInfo('userId');
})

/**
 * 核心逻辑：根据 sub_type 和 content (JSON) 解析最终显示的文本
 */
const displayContent = computed(() => {
    const { subType, content, senderId } = props.message;

    let info: any = {};
    try {
        info = JSON.parse(content);
    } catch (e) {
        return content;
    }

    const isMe = (id: any) => String(id) === String(currentUserId.value);
    // 优先使用 JSON 里的 tpl 字段
    let text = info.tpl || '';

    switch (subType) {
        case 10: // 撤回
            const name = isMe(senderId) ? '你' : (info.opName || '对方')
            return (text || '{name} 撤回了一条消息').replace('{name}', name)

        case 20: // 好友成功
            return text || '你们已成为好友，现在可以开始聊天了！'

        case 22: // 拉黑拦截
            return text || '消息已发出，但被对方拒收了。'

        case 30: // 入群
            const joiner = isMe(info.targetId) ? '你' : info.targetName
            return (text || '{name} 加入了群聊').replace('{name}', joiner)

        case 31: // 踢人
            const kicked = isMe(info.targetId) ? '你' : info.targetName
            return (text || '{name} 被移出了群聊').replace('{name}', kicked)

        case 32: // 退群
            const leaver = isMe(senderId) ? '你' : info.opName
            return (text || '{name} 退出了群聊').replace('{name}', leaver)

        case 33: // 解散
            return text || '该群聊已被解散'

        default:
            return text || content
    }
})
</script>

<style scoped>
.system-msg-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 12px 0;
    width: 100%;
}

.system-message-content {
    background-color: rgba(0, 0, 0, 0.05);
    color: #999;
    font-size: 12px;
    padding: 4px 12px;
    border-radius: 4px;
    max-width: 80%;
    text-align: center;
    line-height: 1.6;
    word-break: break-all;
    user-select: none;
}
</style>