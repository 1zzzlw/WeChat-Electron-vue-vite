<template>
    <div class="chat-count">
        <ChatAIHeader :conversation="conversation" />
        <div class="chat-content">
            <el-scrollbar ref="scrollbarRef" @scroll="handleScroll" noresize style="height: 100%; width: 100%">
                <div class="chat-message" v-for="message in aiMessageArr" :key="message.id">
                    <div v-if="message.role === 'user'">
                        <div class="chat-list-right">
                            <img :src="avatarUrl" class="list-image" />
                            <div v-if="message.msgType === 1" class="chat-bubble right-bubble">
                                <div> {{ message.content }} </div>
                            </div>
                        </div>
                    </div>
                    <div v-else>
                        <div class="chat-list-left">
                            <div v-if="conversation.avatar !== null">
                                <img :src="conversation.avatar" class="list-image" />
                            </div>
                            <div v-else class="iconfont icon-ai-chat list-image" />
                            <div class="msg">
                                <div class="left-name">{{ conversation.remark || conversation.name }}</div>
                                <ContextMenu :menu="[
                                    { label: '复制' },
                                    { divider: true },
                                    { label: '收藏' },
                                    { label: '引用' },
                                    { divider: true },
                                    { label: '删除' },
                                ]" @select="(item: any) => handleChoice(item, message.id)">
                                    <div v-if="message.msgType === 1" class="chat-bubble left-bubble">
                                        <div> {{ message.content }} </div>
                                    </div>
                                </ContextMenu>
                            </div>
                        </div>
                    </div>
                </div>
            </el-scrollbar>
        </div>
        <div class="chat-tool">
            <el-button class="iconfont icon-tupian" square @click="selectImage"></el-button>
        </div>
        <form class="chat-input">
            <el-input v-model="message" type="textarea" :rows="4" resize="none" placeholder="请输入消息" spellcheck="false"
                clearable @keydown.enter="handleEnterMessage" />
        </form>
        <div class="sendButton">
            <el-button type="primary" @click="sendMessage">发送</el-button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router'
import { Conversation, initConversation } from '@/types/conversation'
import ChatAIHeader from '@/components/ChatAIHeader.vue'
import ContextMenu from '@/components/ContextMenu.vue'
import { loadMessage, sendAIMessageApi } from '@/api/AIMessage'
import { AIMessage } from '@/types/aiMessage'
import { aiMessageInfo } from '@/stores/modules/AIMessageStore'
import { conversationInfo } from '@/stores/modules/ConversationStore';

const avatarUrl = ref('')
const message = ref('')
const userId = ref()
const convId = ref()
const aiMessageInfoStore = aiMessageInfo()
const conversationStore = conversationInfo()
const route = useRoute()
const scrollbarRef = ref()

let conversation = ref<Conversation>(initConversation())

const selectImage = async () => {
    // 获取文件的信息
    const file = await (window as any).uploadFileApi.selectFile('uploadFile')
    if (!file) {
        return
    }
}

const sendMessage = () => {
    if (message.value === '') {
        return
    }
    const AIMessagePack = createAIMessagePack(message.value, 'user', 1)
    sendApi(AIMessagePack)
}

const sendApi = async (AIMessagePack: AIMessage) => {
    // 添加消息到缓存中
    aiMessageInfoStore.addMessageMap(convId.value, AIMessagePack)

    message.value = ''

    // 滚动到最底部
    await nextTick()
    scrollToBottom()

    const response = await sendAIMessageApi(AIMessagePack)

    const responsePack: AIMessage = {
        userId: userId.value,
        role: 'assistant',
        msgType: 1,
        content: '',
    }

    aiMessageInfoStore.addMessageMap(convId.value, responsePack)

    // 滚动到最底部
    await nextTick()
    scrollToBottom()

    // 获得这个ai消息的最新索引
    const messageIndex = aiMessageInfoStore.aiMessageMap[convId.value].length - 1

    if (response.body !== null) {
        const reader = response.body.getReader()
        // 解码器
        const textDecoder = new TextDecoder()
        while (1) {
            const { done, value } = await reader.read()
            if (done) {
                break
            }
            const text = textDecoder.decode(value, { stream: true })
            // 处理SSE格式：可能有多行 "data:xxx\n\ndata:yyy\n\n"
            const lines = text.split('\n')
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    // 去掉 "data:" 前缀并去除首位空白
                    const chunk = line.substring(5).trim()
                    aiMessageInfoStore.updateAIMessageContent(convId.value, messageIndex, chunk)
                }
            }
        }
    }
}

// 滚动监听
async function handleScroll({ scrollTop }: any) {
    if (scrollTop === 0) {
        const lastMessageId = aiMessageArr.value.at(0)?.id

        // await loadAIMessage()

        // 等待 DOM 更新
        await nextTick()

        // 滚动到之前的第一条消息
        document.querySelector('#message' + lastMessageId)?.scrollIntoView()
    }
}

function scrollToBottom() {
    if (scrollbarRef.value) {
        scrollbarRef.value.setScrollTop(1000000)
    }
}

const createAIMessagePack = (content: string, role: string, msgType: number) => {
    const AIMessagePack: AIMessage = {
        userId: userId.value,
        role: role,
        msgType: msgType,
        content: content,
    }
    return AIMessagePack
}

const handleEnterMessage = (e: KeyboardEvent) => {
    if (e.shiftKey) {
        return
    }

    e.preventDefault()

    sendMessage()
}

const handleChoice = (item: any, messageId: string | undefined) => {

}

const aiMessageArr = computed(() => {
    const convId = route.query.conversationId as string
    // 如果会话ID不存在，或消息列表未初始化，用空数组兜底
    return aiMessageInfoStore.aiMessageMap[convId] || []
})

const loadAIMessage = async () => {
    const res = await loadMessage()
    res.data.forEach((messagePack: AIMessage) => aiMessageInfoStore.loadMessageMap(convId.value, messagePack))
}

onMounted(async () => {
    convId.value = route.query.conversationId as string
    avatarUrl.value = await (window as any).userInfoApi.storeGetUserInfo('avatar')
    userId.value = await (window as any).userInfoApi.storeGetUserInfo('userId')
    // 加载历史消息
    await loadAIMessage()

    // 滚动到最底部
    await nextTick()
    scrollToBottom()

    // 初始化会话信息
    conversation.value = conversationStore.conversationMap[convId.value as string]
})

onUnmounted(() => {
    aiMessageInfoStore.clearMessageMap(convId.value)
})
</script>

<style scoped>
.chat-count {
    /* 设置宽度和高度，确保有足够空间展示居中效果 */
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background-color: rgba(28, 38, 50, 0.4);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    -webkit-app-region: no-drag;
}

.chat-content {
    flex: 1;
    overflow: hidden;
}

img {
    width: 50px;
    height: 50px;
    border-radius: 10px;
}

.chat-list-left {
    padding: 20px;
    display: flex;
    flex-direction: row;
    gap: 10px;
}

.msg {
    display: flex;
    flex-direction: column;
}

.left-name {
    font-size: 14px;
    color: #ffffff;
}

.icon-ai-chat {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 24px;
    width: 50px;
    height: 50px;
    border-radius: 10px;
    background-color: rgba(35, 45, 60, 0.7);
    color: #409eff;
}

.chat-list-right {
    padding: 20px;
    display: flex;
    flex-direction: row-reverse;
    gap: 10px;
}

.chat-tool {
    height: 30px;
    display: flex;
    align-items: center;
    border-top: 1px solid rgba(3, 32, 120, 0.5);
    overflow: hidden;
}

.chat-tool button {
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

.chat-tool button:hover {
    color: rgba(66, 153, 225, 0.9);
    text-shadow: 0 0 6px rgba(66, 153, 225, 0.3);
}

.chat-input {
    margin: 0 auto;
    height: 120px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    padding: 0 10px;
}

.chat-input :deep(.el-textarea__inner) {
    background-color: rgba(28, 38, 50, 1);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: #f0f0f0;
    box-shadow: none;
    border: 1px solid rgba(66, 153, 225, 0.2);
    resize: none;

    &::placeholder {
        color: rgba(240, 240, 240, 0.5);
    }

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(66, 153, 225, 0.3);
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: rgba(66, 153, 225, 0.5);
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }
}

.sendButton {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    align-items: center;
}

:deep(.el-button--primary) {
    background: rgba(66, 153, 225, 0.2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: none;
    border-radius: 6px;
    box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.2),
        inset 0 1px 2px rgba(255, 255, 255, 0.08);
    color: #f0f0f0;
    font-size: 14px;
    padding: 8px 24px;
    cursor: pointer;
    transition: all 0.2s ease;
}

:deep(.el-button--primary:hover),
:deep(.el-button--primary:focus) {
    background: rgba(66, 153, 225, 0.3);
    box-shadow:
        0 3px 8px rgba(0, 0, 0, 0.25),
        inset 0 1px 3px rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
}

:deep(.el-button--primary:active) {
    transform: translateY(0);
    background: rgba(66, 153, 225, 0.15);
    box-shadow:
        0 1px 4px rgba(0, 0, 0, 0.15),
        inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.el-button {
    width: 100px;
    margin: 0 10px 5px 0;
}

/* 聊天气泡样式 */
.chat-bubble {
    padding: 8px 12px;
    border-radius: 8px;
    max-width: 400px;
    word-break: break-all;
    /* 定位三角箭头 */
    position: relative;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
}

/* 左侧好友气泡 */
.left-bubble {
    background: rgba(45, 55, 70, 0.85);
    color: #f0f0f0;
    /* 左侧气泡左下角无圆角，贴合箭头 */
    border-bottom-left-radius: 0;
    border: 1px solid rgba(66, 153, 225, 0.1);
}

/* 左侧箭头 */
.left-bubble::before {
    content: '';
    position: absolute;
    left: -8px;
    top: 10px;
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-right: 8px solid rgba(45, 55, 70, 0.85);
    border-bottom: 8px solid transparent;
}

/* 右侧自己的气泡 */
.right-bubble {
    background: rgba(66, 153, 225, 0.35);
    color: #ffffff;
    border-bottom-right-radius: 0;
    border: 1px solid rgba(66, 153, 225, 0.2);
}

/* 右侧箭头 */
.right-bubble::after {
    content: '';
    position: absolute;
    right: -8px;
    top: 10px;
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-left: 8px solid rgba(66, 153, 225, 0.35);
    border-bottom: 8px solid transparent;
}
</style>
