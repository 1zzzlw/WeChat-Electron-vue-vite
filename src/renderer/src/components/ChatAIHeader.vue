<template>
    <div class="chat-header">
        <div class="title">
            {{ conversation.remark || conversation.name }}
        </div>
        <div class="chat-set">
            <el-icon class="left-icon" size="25" @click="drawer = true">
                <MoreFilled />
            </el-icon>
            <el-drawer v-model="drawer" title="" modal-penetrable :show-close="false">
                <div class="chat-set-content">
                    <div class="header-avatar">
                        <div v-if="conversation.avatar !== null">
                            <img :src="conversation.avatar" class="avatar" />
                        </div>
                        <div v-else class="iconfont icon-ai-chat avatar" />
                    </div>
                    <el-scrollbar noresize style="height: 400PX; width: 100%">
                        <div v-for="personalityInfo in personalityArr">
                            <el-descriptions @click="handleOpenDrawer(personalityInfo.id)" direction="vertical" border>
                                <el-descriptions-item label="角色" width="100px" align="center"
                                    label-class-name="my-label" class-name="my-content">
                                    <el-image class="avatar" :src="personalityInfo.avatar" />
                                    <div>{{ personalityInfo.name }}</div>
                                </el-descriptions-item>
                                <el-descriptions-item label="个性化介绍" align="center" label-class-name="my-label"
                                    class-name="my-content">
                                    {{ personalityInfo.systemPrompt }}
                                </el-descriptions-item>
                            </el-descriptions>
                        </div>
                    </el-scrollbar>
                    <div class="button">
                        <a @click="addAIInfo = true">创建新的个性化标签</a>
                        <a>开启新的对话</a>
                    </div>
                </div>
            </el-drawer>
            <el-dialog title="创建智能ai" v-model="addAIInfo" width="500px">
                <el-form :model="form" label-width="80px">
                    <img v-if="imageUrl" :src="imageUrl" class="avatar" alt="头像" />
                    <el-icon v-else class="avatar-uploader-icon" @click="handleClick">
                        <Plus />
                    </el-icon>
                    <input ref="fileInput" style="display: none" type="file" accept="image/*"
                        @change="handleFileChange">
                    <el-form-item label="角色">
                        <el-input v-model="form.name"></el-input>
                    </el-form-item>
                    <el-form-item label="个性化">
                        <el-input v-model="form.content" type="textarea" :rows="4" resize="none" placeholder="请输入消息"
                            spellcheck="false" clearable />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="addAIInfo = false">取消</el-button>
                    <el-button type="primary" @click="submitForm">提交</el-button>
                </template>
            </el-dialog>
            <el-dialog title="智能ai" v-model="editAIInfo" width="500px">
                <el-form :model="currentPersonality" label-width="80px">
                    <img v-if="currentPersonality.avatar !== null" :src="currentPersonality.avatar" class="avatar"
                        alt="头像" />
                    <div v-else class="iconfont icon-ai-chat avatar" />
                    <input ref="fileInput" style="display: none" type="file" accept="image/*"
                        @change="handleFileChange">
                    <el-form-item label="角色">
                        <el-input v-model="currentPersonality.name"></el-input>
                    </el-form-item>
                    <el-form-item label="个性化">
                        <el-input v-model="currentPersonality.systemPrompt" type="textarea" :rows="4" resize="none"
                            placeholder="请输入消息" spellcheck="false" clearable />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="DeleteForm">删除</el-button>
                    <el-button v-if="currentPersonality.isActive === 1" disabled>正在使用</el-button>
                    <el-button v-else type="primary" @click="submitNewForm">使用</el-button>
                </template>
            </el-dialog>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import { deletePersonality, switchPersonality, updatePersonality, createPersonality, listPersonality } from '../api/AIMessage'
import { Personality } from '../types/personality'
import { aiPersonalityInfo } from '../stores/modules/PersonalityStore'
import { conversationInfo } from '../stores/modules/ConversationStore';
import { updateConversation } from '../db/dualDB'
import { ElMessage } from 'element-plus';

// 抽屉状态
const drawer = ref(false)
const imageUrl = ref('')
const avatar = ref<File | ''>('')
const fileInput = ref<any>(null);
const addAIInfo = ref(false);
const editAIInfo = ref(false);
const aiPersonalityStore = aiPersonalityInfo()
const personalityArr = ref<Personality[]>([]);
const currentPersonalityId = ref<string>()
const conversationStore = conversationInfo()

const form = ref({
    name: '',
    content: ''
});

const handleFileChange = (e: any) => {
    const file = e.target.files[0]
    imageUrl.value = URL.createObjectURL(file)
    avatar.value = file
}

const submitNewForm = async () => {
    const personalityPack = currentPersonality.value
    // 更新个性化ai
    await updatePersonality(personalityPack)

    // 切换个性化ai
    const res = await switchPersonality(personalityPack.id)
    // 从服务端获取当前ai智能体的头像，因为新创建的ai智能体的头像可能是临时的
    const avatar = res.data
    const id = props.conversation.id
    // 更新头像显示
    conversationStore.updateConversationAvatar(id, avatar)

    // 取消所有的ai智能体并激活当前的ai智能体
    aiPersonalityStore.switchPersonality(personalityPack.id)

    // 更新本地会话数据库的头像路径
    const condition = {
        id: id
    }
    const data = {
        avatar: avatar
    }
    updateConversation(condition, data)
    editAIInfo.value = false
}

const DeleteForm = async () => {
    editAIInfo.value = false

    await deletePersonality(currentPersonality.value.id)

    // 删除缓存中的ai智能体
    aiPersonalityStore.removePersonality(currentPersonality.value.id)
}

const submitForm = () => {
    console.log('填写的内容：', form.value);
    if (form.value.content !== '' && form.value.name !== '') {
        const roleName = form.value.name
        const content = form.value.content
        const avatarTempUrl = imageUrl.value

        // 重置表单状态
        imageUrl.value = ''
        addAIInfo.value = false;
        form.value = { name: '', content: '' }

        const formData = new FormData()

        formData.append('name', roleName)
        formData.append('systemPrompt', content)
        formData.append('isActive', '0')
        formData.append('isPreset', '0')
        formData.append('avatarFile', avatar.value)

        // 上传至服务器
        createPersonality(formData).then((res) => {
            const id = res.data
            // 默认创建成功之后不自动使用
            const personalityPack = {
                id: id,
                name: roleName,
                avatar: avatarTempUrl,
                systemPrompt: content,
                isActive: 0,
                isPreset: 0
            }
            console.log(personalityPack)
            // 表单信息加入缓存中
            aiPersonalityStore.addPersonality(id, personalityPack)
        })
    } else {
        ElMessage.warning('个性话内容不能为空')
    }
};

const handleOpenDrawer = (id: string | undefined) => {
    editAIInfo.value = true;
    currentPersonalityId.value = id as string
};

const handleClick = async () => {
    fileInput.value?.click();
}

const props = defineProps({
    conversation: {
        type: Object,
        default: {}
    }
})

const loadPersonality = async () => {
    const cache = Object.keys(aiPersonalityStore.aiPersonalityMap).length > 0

    if (cache) {
        console.info('ai个性化列表缓存非空:', cache)
        return
    }

    const res = await listPersonality()

    res.data.forEach((personalityPack: Personality) => {
        aiPersonalityStore.addPersonality(personalityPack.id as string, personalityPack)
    })
}

const currentPersonality = computed(() => {
    if (!currentPersonalityId.value) return null
    return aiPersonalityStore.getPersonality(currentPersonalityId.value) as any
})

watch(
    () => aiPersonalityStore.aiPersonalityMap,
    async (newMap) => {
        // 拉取个性化信息列表
        await loadPersonality()

        personalityArr.value = Object.values(newMap) || []
    },
    { immediate: true, deep: true }
)
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

.chat-set-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
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

.header-avatar {
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.button {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #43f3ff;
    font-size: 16px;
    padding: 8px 20px;
    border-radius: 6px;
    transition: all 0.3s ease;
    cursor: pointer;
    background-color: transparent;
    margin-top: 20px;
    gap: 10px;
}

.button a {
    padding: 10px 24px;
    border-radius: 8px;
    background: rgba(67, 243, 255, 0.1);
    border: 1px solid rgba(67, 243, 255, 0.3);
    color: #43f3ff;
    transition: all 0.3s ease;
}

.button a:hover {
    background: rgba(67, 243, 255, 0.2);
    border-color: rgba(67, 243, 255, 0.5);
    box-shadow: 0 0 15px rgba(67, 243, 255, 0.3);
    transform: translateY(-2px);
}

.button a:active {
    transform: translateY(0) scale(0.98);
}

.icon-ai-chat {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 24px;
    width: 80px;
    height: 80px;
    border-radius: 10px;
    background: rgba(67, 243, 255, 0.1);
    color: #43f3ff;
    border: 2px solid rgba(67, 243, 255, 0.3);
}

.avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(67, 243, 255, 0.4);
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 0 15px rgba(67, 243, 255, 0.3);
}

.avatar:hover {
    border-color: rgba(67, 243, 255, 0.7);
    box-shadow: 0 0 25px rgba(67, 243, 255, 0.5);
    transform: scale(1.05);
}

.avatar-uploader-icon {
    font-size: 28px;
    color: rgba(67, 243, 255, 0.6);
    width: 80px;
    height: 80px;
    border: 2px dashed rgba(67, 243, 255, 0.3);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s ease;
}

.avatar-uploader-icon:hover {
    border-color: rgba(67, 243, 255, 0.6);
    color: #43f3ff;
    box-shadow: 0 0 15px rgba(67, 243, 255, 0.3);
}

:deep(.el-descriptions__body) {
    background-color: transparent !important;
}

:deep(.my-label) {
    background: linear-gradient(135deg, rgba(67, 243, 255, 0.15) 0%, rgba(0, 217, 255, 0.1) 100%) !important;
    color: #43f3ff !important;
    font-weight: 600 !important;
    border: 1px solid rgba(67, 243, 255, 0.4) !important;
    padding: 14px 20px !important;
    text-align: center !important;
    border-radius: 6px 0 0 6px !important;
    font-size: 14px !important;
}

:deep(.my-content) {
    background: rgba(35, 45, 60, 0.6) !important;
    color: rgba(255, 255, 255, 0.9) !important;
    border: 1px solid rgba(67, 243, 255, 0.2) !important;
    padding: 14px 20px !important;
    line-height: 1.8 !important;
    word-break: break-all !important;
    text-align: center !important;
    vertical-align: middle !important;
    border-radius: 0 6px 6px 0 !important;
}

:deep(.el-dialog) {
    --el-dialog-bg-color: rgba(35, 45, 60, 0.85) !important;
    background-color: var(--el-dialog-bg-color) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(67, 243, 255, 0.4) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(67, 243, 255, 0.2) !important;
}

:deep(.el-dialog__title) {
    color: #43f3ff !important;
    font-weight: 600 !important;
    text-shadow: 0 0 8px rgba(67, 243, 255, 0.3) !important;
}

:deep(.el-form-item__label) {
    color: rgba(67, 243, 255, 0.9) !important;
}

:deep(.el-input__wrapper) {
    background: rgba(35, 45, 60, 0.8) !important;
    border: 1px solid rgba(67, 243, 255, 0.3) !important;
    box-shadow: none !important;
}

:deep(.el-input__wrapper:hover) {
    border-color: rgba(67, 243, 255, 0.5) !important;
}

:deep(.el-input__wrapper.is-focus) {
    border-color: rgba(67, 243, 255, 0.7) !important;
    box-shadow: 0 0 10px rgba(67, 243, 255, 0.2) !important;
}

:deep(.el-input__inner) {
    color: #f0f0f0 !important;
}

:deep(.el-input__inner::placeholder) {
    color: rgba(240, 240, 240, 0.4) !important;
}

:deep(.el-textarea__inner) {
    background: rgba(35, 45, 60, 0.8);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: #f0f0f0;
    box-shadow: none;
    border: 1px solid rgba(67, 243, 255, 0.3);

    &::placeholder {
        color: rgba(240, 240, 240, 0.4);
    }
}

:deep(.el-textarea__inner:hover) {
    border-color: rgba(67, 243, 255, 0.5);
}

:deep(.el-textarea__inner:focus) {
    border-color: rgba(67, 243, 255, 0.7);
    box-shadow: 0 0 10px rgba(67, 243, 255, 0.2);
}

:deep(.el-dialog .el-button) {
    background: rgba(67, 243, 255, 0.1) !important;
    border: 1px solid rgba(67, 243, 255, 0.3) !important;
    color: #43f3ff !important;
    border-radius: 6px !important;
    transition: all 0.3s ease !important;
}

:deep(.el-dialog .el-button--primary) {
    background: rgba(67, 243, 255, 0.2) !important;
    border-color: rgba(67, 243, 255, 0.5) !important;
}

:deep(.el-dialog .el-button:hover) {
    background: rgba(67, 243, 255, 0.2) !important;
    border-color: rgba(67, 243, 255, 0.5) !important;
    box-shadow: 0 0 12px rgba(67, 243, 255, 0.3) !important;
}

:deep(.el-dialog .el-button--primary:hover) {
    background: rgba(67, 243, 255, 0.3) !important;
    border-color: rgba(67, 243, 255, 0.6) !important;
}
</style>