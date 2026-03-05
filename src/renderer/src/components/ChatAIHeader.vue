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
                        <el-descriptions @click="editAIInfo = true" direction="vertical" border>
                            <el-descriptions-item label="角色" align="center" label-class-name="my-label"
                                class-name="my-content">
                                <el-image class="avatar"
                                    src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
                                <div>zhangsan</div>
                            </el-descriptions-item>
                            <el-descriptions-item label="个性化介绍" align="center" label-class-name="my-label"
                                class-name="my-content">
                                No.1188, Wuzhong Avenue, Wuzhong District, Suzhou, Jiangsu Province
                                No.1188, Wuzhong Avenue, Wuzhong District, Suzhou, Jiangsu Province
                            </el-descriptions-item>
                        </el-descriptions>
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
                    <el-form-item label="个性化内容">
                        <el-input v-model="form.phone" type="textarea" :rows="4" resize="none" placeholder="请输入消息"
                            spellcheck="false" clearable />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="addAIInfo = false">取消</el-button>
                    <el-button type="primary" @click="submitForm">提交</el-button>
                </template>
            </el-dialog>
            <el-dialog title="智能ai" v-model="editAIInfo" width="500px">
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
                    <el-form-item label="个性化内容">
                        <el-input v-model="form.phone" type="textarea" :rows="4" resize="none" placeholder="请输入消息"
                            spellcheck="false" clearable />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="editAIInfo = false">删除</el-button>
                    <el-button type="primary" @click="submitForm">使用</el-button>
                </template>
            </el-dialog>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

// 抽屉状态
const drawer = ref(false)
const imageUrl = ref('')
const avatar = ref<File | null>(null)
const fileInput = ref<any>(null);

const addAIInfo = ref(false);
const editAIInfo = ref(false);

const form = ref({
    name: '',
    phone: ''
});

const submitForm = () => {
    console.log('填写的内容：', form.value);
    addAIInfo.value = false;
};

const handleClick = async () => {
    fileInput.value?.click();
}

const handleFileChange = (e: any) => {
    const file = e.target.files[0]
    imageUrl.value = URL.createObjectURL(file)
    avatar.value = file
}

const props = defineProps({
    conversation: {
        type: Object,
        default: {}
    }
})

</script>

<style scoped>
.chat-header {
    height: 70px;
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid rgba(66, 153, 225, 0.5);
    -webkit-app-region: drag;
    color: #f0f0f0;
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
    color: rgba(240, 240, 240, 0.8);
    cursor: pointer;
    transition: all 0.2s ease;
}

.left-icon:hover {
    color: rgba(66, 153, 225, 0.9);
    text-shadow: 0 0 6px rgba(66, 153, 225, 0.3);
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
    --el-drawer-bg-color: rgba(28, 38, 50, 0.4);
    background-color: var(--el-drawer-bg-color);
    backdrop-filter: blur(10px);
    border-left: 1px solid rgba(66, 153, 225, 0.5);
}

:deep(.el-drawer__body) {
    padding: 20px 16px;
    color: #f0f0f0;
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
    color: rgba(66, 153, 225, 0.8);
    font-size: 16px;
    padding: 8px 20px;
    border-radius: 6px;
    transition: all 0.2s ease;
    cursor: pointer;
    background-color: transparent;
    margin-top: 20px;
    gap: 10px;
}

.button a:hover {
    color: rgba(66, 153, 225, 1);
    background-color: rgba(66, 153, 225, 0.1);
    text-shadow: 0 0 4px rgba(66, 153, 225, 0.2);
}

.button a:active {
    background-color: rgba(66, 153, 225, 0.15);
}

.icon-ai-chat {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 24px;
    width: 80px;
    height: 80px;
    border-radius: 10px;
    background-color: rgba(35, 45, 60, 0.7);
    color: #409eff;
    border: 2px solid rgba(66, 153, 225, 0.3);
}

.avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(66, 153, 225, 0.3);
    cursor: pointer;
    transition: all 0.3s ease;
}

.avatar:hover {
    border-color: rgba(66, 153, 225, 0.6);
    box-shadow: 0 0 12px rgba(66, 153, 225, 0.3);
}

.avatar-uploader-icon {
    font-size: 28px;
    color: #8c939d;
    width: 80px;
    height: 80px;
    border: 2px dashed rgba(66, 153, 225, 0.3);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s ease;
}

.avatar-uploader-icon:hover {
    border-color: rgba(66, 153, 225, 0.6);
    color: rgba(66, 153, 225, 0.8);
}

:deep(.el-descriptions__body) {
    background-color: transparent !important;
}

/* 自定义标签单元格样式 - 强化对比度 */
:deep(.my-label) {
    /* 背景：更深的半透明，确保标签突出 */
    background-color: rgba(28, 38, 50, 0.85) !important;
    /* 文字：纯白，高对比度 */
    color: #ffffff !important;
    font-weight: 600 !important;
    /* 边框：清晰的蓝色边框 */
    border: 1px solid rgba(66, 153, 225, 0.4) !important;
    padding: 14px 20px !important;
    text-align: center !important;
    border-radius: 6px 0 0 6px !important;
    font-size: 14px !important;
}

/* 自定义内容单元格样式 - 提升可读性 */
:deep(.my-content) {
    /* 背景：中等透明度的深色，保证文字清晰 */
    background-color: rgba(28, 38, 50, 0.6) !important;
    /* 文字：亮白，确保清晰可见 */
    color: #ffffff !important;
    border: 1px solid rgba(66, 153, 225, 0.4) !important;
    padding: 14px 20px !important;
    line-height: 1.8 !important;
    word-break: break-all !important;
    text-align: center !important;
    vertical-align: middle !important;
    border-radius: 0 6px 6px 0 !important;
}

:deep(.el-dialog) {
    --el-dialog-bg-color: rgba(28, 38, 50, 0.4) !important;
    background-color: var(--el-dialog-bg-color) !important;
    backdrop-filter: blur(10px) !important;
    -webkit-backdrop-filter: blur(10px) !important;
    border: 1px solid rgba(66, 153, 225, 0.5) !important;
    border-radius: 8px !important;
}

:deep(.el-dialog__title) {
    color: #f0f0f0 !important;
}

:deep(.el-form-item__label) {
    color: #e0e0e0 !important;
}

:deep(.el-input__wrapper) {
    background-color: rgba(28, 38, 50, 1) !important;
    border: 1px solid rgba(66, 153, 225, 0.2) !important;
    box-shadow: none !important;
}

:deep(.el-input__inner) {
    color: #f0f0f0 !important;
}

:deep(.el-input__inner::placeholder) {
    color: rgba(240, 240, 240, 0.5) !important;
}

:deep(.el-textarea__inner) {
    background-color: rgba(28, 38, 50, 1);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: #f0f0f0;
    box-shadow: none;
    border: 1px solid rgba(66, 153, 225, 0.2);

    &::placeholder {
        color: rgba(240, 240, 240, 0.5);
    }
}

:deep(.el-dialog .el-button) {
    background-color: rgba(35, 45, 60, 0.7) !important;
    border: 1px solid rgba(66, 153, 225, 0.2) !important;
    color: #f0f0f0 !important;
    border-radius: 6px !important;
}

:deep(.el-dialog .el-button--primary) {
    background-color: rgba(66, 153, 225, 0.2) !important;
}

:deep(.el-dialog .el-button:hover) {
    background-color: rgba(66, 153, 225, 0.2) !important;
    border-color: rgba(66, 153, 225, 0.4) !important;
}
</style>