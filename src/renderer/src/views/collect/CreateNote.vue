<template>
    <div class="createNote-content">
        <div class="header">
            笔记
        </div>

        <!-- 工具栏 -->
        <div class="toolbar" style="-webkit-app-region: no-drag;">

            <!-- 当是paragraph模式时激活,默认情况下是paragraph模式 -->
            <button @click="editor?.chain().focus().setParagraph().run()"
                :class="{ 'is-active': editor?.isActive('paragraph') }" class="iconfont icon-zhengwen" title="正文" />

            <!-- 当文本时加粗模式时激活,激活时输入文本为粗体 -->
            <button @click="editor?.chain().focus().toggleBold().run()"
                :class="{ 'is-active': editor?.isActive('bold') }" class="iconfont icon-zitijiacu" title="加粗" />

            <!-- 当文本是斜体模式时激活,激活时输入文本为斜体 -->
            <button @click="editor?.chain().focus().toggleItalic().run()"
                :class="{ 'is-active': editor?.isActive('italic') }" class="iconfont icon-xieti" title="斜体" />

            <!-- 当文本是删除线模式时激活,激活时输入文本为删除线 -->
            <button @click="editor?.chain().focus().toggleStrike().run()"
                :class="{ 'is-active': editor?.isActive('strike') }" class="iconfont icon-zitishanchuxian"
                title="删除线" />

            <!-- 当文本是行内代码模式时激活,激活时输入文本为行内代码 -->
            <button @click="editor?.chain().focus().toggleCode().run()"
                :class="{ 'is-active': editor?.isActive('code') }" class="iconfont icon-hangneidaima" title="行内代码" />

            <!-- 当文本是H1模式时激活,激活时输入文本为H1 -->
            <button @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
                :class="{ 'is-active': editor?.isActive('heading', { level: 1 }) }" class="iconfont icon-h1"
                title="H1" />

            <!-- 当文本是H2模式时激活,激活时输入文本为H2 -->
            <button @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
                :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }" class="iconfont icon-h2"
                title="H2" />

            <!-- 当文本是H3模式时激活,激活时输入文本为H3 -->
            <button @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
                :class="{ 'is-active': editor?.isActive('heading', { level: 3 }) }" class="iconfont icon-h3"
                title="H3" />

            <!-- 当文本是无序列表模式时激活,激活时输入文本为无序列表 -->
            <button @click="editor?.chain().focus().toggleBulletList().run()"
                :class="{ 'is-active': editor?.isActive('bulletList') }" class="iconfont icon-wuxuliebiao"
                title="无序列表" />

            <!-- 当文本是有序列表模式时激活,激活时输入文本为有序列表 -->
            <button @click="editor?.chain().focus().toggleOrderedList().run()"
                :class="{ 'is-active': editor?.isActive('orderedList') }" class="iconfont icon-youxuliebiao"
                title="有序列表" />

            <!-- 当文本是代码块模式时激活,激活时输入文本为代码块 -->
            <button @click="editor?.chain().focus().toggleCodeBlock().run()"
                :class="{ 'is-active': editor?.isActive('codeBlock') }" class="iconfont icon-daimakuai" title="代码块" />

            <!-- 当文本是引用模式时激活,激活时输入文本为引用 -->
            <button @click="editor?.chain().focus().toggleBlockquote().run()"
                :class="{ 'is-active': editor?.isActive('blockquote') }" class="iconfont icon-zu" title="引用" />

            <!-- 当文本是分割线模式时激活,激活时输入文本为分割线 -->
            <button @click="editor?.chain().focus().setHorizontalRule().run()" class="iconfont icon-fengexian"
                title="分割线" />

            <!-- 当文本是强制换行模式时激活,激活时输入文本为强制换行 -->
            <button @click="editor?.chain().focus().setHardBreak().run()" class="iconfont icon-huanhang" title="强制换行" />

            <!-- 添加链接按钮 -->
            <button @click="openLinkDialog" :class="{ 'is-active': editor?.isActive('link') }"
                class="iconfont icon-chaolianjie" title="插入链接" />

            <!-- 取消链接按钮 -->
            <button @click="editor?.chain().focus().unsetLink().run()" :disabled="!editor?.isActive('link')"
                class="iconfont icon-quxiaochaolianjie" title="取消链接" />

            <!-- 插入图片 -->
            <button class="iconfont icon-tupian" title="选择图片" @click="addImage"></button>
            <input ref="fileInput" style="display: none" type="file" accept="image/*" @change="handleFileChange">

            <!-- 撤销/重做 -->
            <button @click="editor?.chain().focus().undo().run()" :disabled="!editor?.can().undo()"
                class="iconfont icon-chexiao" title="撤销" />

            <button @click="editor?.chain().focus().redo().run()" :disabled="!editor?.can().redo()"
                class="iconfont icon-zhongzuo" title="重做" />

            <button @click="saveContent" class="iconfont icon-baocun" title="保存" />

        </div>

        <!-- 标题 -->
        <div class="title-input">
            <el-input v-model="title" maxlength="10" placeholder="输入标题" show-word-limit type="text" />
        </div>

        <!-- 编辑器 -->
        <div class="editor-area" spellcheck="false">
            <editor-content :editor="editor" class="editor-wrapper" />
        </div>

        <!-- 控制器 -->
        <WindowControls windowType="createNote" />

        <el-dialog v-model="showLinkDialog" title="插入链接" width="400px">
            <el-input v-model="linkUrl" placeholder="https://example.com" @keyup.enter="confirmLink"
                spellcheck="false" />
            <template #footer>
                <el-button @click="showLinkDialog = false">取消</el-button>
                <el-button type="primary" @click="confirmLink">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
// 基础功能包（加粗、斜体、列表等）
import StarterKit from '@tiptap/starter-kit'
import WindowControls from '../../components/WindowControls.vue';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link'
import { uploadImageApi } from '../../api/Favorites'
import { insertNewNote, updateOldNote } from '../../db/syncDB'
import { ElMessage } from 'element-plus';
import { eventEmitter } from '../../utils/eventEmitter'

const pendingImages = ref<any>([])
const showLinkDialog = ref(false)
const title = ref('')
const linkUrl = ref()
const isUpdate = ref(false)
const noteId = ref()
const fileInput = ref<any>(null);

const editor = useEditor({
    content: '',
    extensions: [
        StarterKit,
        Image.configure({
            inline: true,
            allowBase64: true
        }),
        Link.configure({
            // 点击链接时不自动打开
            openOnClick: false,
            HTMLAttributes: {
                // 新窗口打开
                target: '_blank',
                // 安全属性
                rel: 'noopener noreferrer',
            },
        }),
    ],
    // 添加监听事件
    editorProps: {
        // 自定义粘贴事件处理函数，接收编辑器视图（view）和粘贴事件（event）
        handlePaste: (view, event) => {
            // 获取剪贴板中的所有数据项
            const items = event.clipboardData?.items
            // 如果剪贴板没有数据，返回 false
            if (!items) return false

            // 遍历剪贴板中的每一个数据项
            for (const item of items) {
                // 判断当前项是否是图片类型（type 包含 'image'，比如 image/png、image/jpg）
                if (item.type.indexOf('image') === 0) {
                    // 阻止浏览器默认的粘贴行为（避免图片以纯文本/二进制形式乱粘贴）
                    event.preventDefault()
                    // 将剪贴板中的图片项转为 File 文件对象
                    const file = item.getAsFile()

                    if (!file) return true
                    // 生成临时的展示图片的地址
                    const tempUrl = URL.createObjectURL(file)

                    pendingImages.value.push({
                        tempUrl: tempUrl,
                        file: file
                    })

                    editor.value?.chain().focus().setImage({ src: tempUrl }).run()

                    // 返回 true 表示已处理该粘贴事件，无需编辑器再处理
                    return true
                }
            }
            // 如果不是图片，返回 false 交给编辑器默认处理（比如粘贴文本）
            return false
        }
    }
})

// 打开链接对话框
const openLinkDialog = () => {
    const { from, to } = editor.value!.state.selection

    if (from === to) {
        ElMessage.warning('请先选中文本')
        return
    }

    // 如果已经是链接，获取原有URL
    const previousUrl = editor.value?.getAttributes('link').href
    linkUrl.value = previousUrl || 'https://'

    showLinkDialog.value = true
}

// 确认添加链接
const confirmLink = () => {
    if (!linkUrl.value || linkUrl.value === 'https://') {
        ElMessage.warning('请输入链接地址')
        return
    }

    editor.value?.chain().focus().setLink({ href: linkUrl.value }).run()
    showLinkDialog.value = false
    ElMessage.success('链接添加成功')
}

const addImage = () => {
    fileInput.value?.click();
}

const handleFileChange = (e: any) => {
    const file = e.target.files[0]
    const tempUrl = URL.createObjectURL(file)

    pendingImages.value.push({
        tempUrl: tempUrl,
        file: file
    })

    editor.value?.chain().focus().setImage({ src: tempUrl }).run()
}


// 上次文本中的图片到服务端
const saveImage = async () => {
    if (pendingImages.value.length === 0) {
        console.log(111)
        return []
    }

    const fileLists = []

    for (const img of pendingImages.value) {
        fileLists.push(img.file)
    }

    const formData = new FormData();
    fileLists.forEach(file => {
        formData.append("images", file);
    })

    const res = await uploadImageApi(formData)

    return res.data
}

// 替换HTML中的临时图片路径
const replaceTempUrl = (tempUrl: string, realUrl: string) => {
    const html = editor.value?.getHTML() || ''
    const newHtml = html.replace(tempUrl, realUrl)
    editor.value?.commands.setContent(newHtml)
}

const saveContent = async () => {
    if (!editor.value) {
        return
    }

    const urlList = await saveImage()

    urlList.forEach((url: string, index: number) => {
        const tempUrl = pendingImages.value[index].tempUrl
        replaceTempUrl(tempUrl, url)
    })


    const html = editor.value.getHTML()

    const username = await (window as any).userInfoApi.storeGetUserInfo('username')

    if (isUpdate.value) {
        // 是更新
        const condition = {
            id: noteId.value
        }
        const data = {
            title: title.value,
            content: html,
            sourceUsername: username,
        }
        updateOldNote(condition, data)
    } else {
        // 不是更新，插入
        const data = {
            title: title.value,
            content: html,
            sourceUsername: username,
            type: 0
        }
        insertNewNote(data)
    }

    // 发送笔记更新事件
    eventEmitter.emit('note:updated')
}

onMounted(() => {
    (window as any).windowToolApi.sendWindowInfo((e: any, data: any) => {
        console.log(data)
        editor.value?.commands.setContent(data.content)
        title.value = data.title
        noteId.value = data.id
        isUpdate.value = true
    })
})

</script>
<style scoped>
.createNote-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: rgba(28, 38, 50, 0.4);
    backdrop-filter: blur(10px);
}

.header {
    width: 100%;
    padding: 15px;
    display: flex;
    justify-content: center;
    -webkit-app-region: drag;
    color: #f0f0f0;
    font-size: 18px;
    font-weight: 500;
    border-bottom: 1px solid rgba(66, 153, 225, 0.3);
}

.toolbar {
    padding: 12px;
    border-bottom: 1px solid rgba(66, 153, 225, 0.3);
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    background: rgba(35, 45, 60, 0.5);
}

.toolbar button {
    padding: 6px 12px;
    border: 1px solid rgba(66, 153, 225, 0.3);
    background: rgba(35, 45, 60, 0.7);
    color: #f0f0f0;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s ease;
}

.toolbar button:hover {
    background: rgba(66, 153, 225, 0.2);
    border-color: rgba(66, 153, 225, 0.5);
    transform: translateY(-1px);
}

.toolbar button.is-active {
    background: rgba(66, 153, 225, 0.4);
    border-color: rgba(66, 153, 225, 0.6);
    color: #fff;
}

.toolbar button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.editor-area {
    overflow: auto;
    flex: 1;
    height: 100%;
    background: rgba(28, 38, 50, 0.2);
}

.editor-wrapper {
    flex: 1;
    height: 100%;
}

:deep(.ProseMirror) {
    padding: 20px;
    height: 100%;
    outline: none;
    color: #f0f0f0;
    line-height: 1.6;
    font-family: "Ma Shan Zheng", "STKaiti", "KaiTi", "PingFang SC", sans-serif;
    font-size: 20px;
}

:deep(.ProseMirror strong),
:deep(.ProseMirror b) {
    font-weight: 900;
    color: #fff;
    background: rgba(66, 153, 225, 0.15);
    padding: 0 3px;
    border-radius: 2px;
}

:deep(.ProseMirror em),
:deep(.ProseMirror i) {
    font-style: italic;
    color: #e0e0e0;
}

:deep(.ProseMirror h1) {
    font-size: 2em;
    font-weight: bold;
    margin: 0.8em 0 0.4em;
    color: #fff;
    border-bottom: 2px solid rgba(66, 153, 225, 0.5);
    padding-bottom: 0.3em;
}

:deep(.ProseMirror h2) {
    font-size: 1.5em;
    font-weight: bold;
    margin: 0.7em 0 0.3em;
    color: #fff;
}

:deep(.ProseMirror h3) {
    font-size: 1.2em;
    font-weight: bold;
    margin: 0.6em 0 0.3em;
    color: #e0e0e0;
}

:deep(.ProseMirror p) {
    margin: 0.5em 0;
}

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
    padding-left: 1.5rem;
    margin: 0.8em 0;
}

:deep(.ProseMirror li) {
    margin: 0.3em 0;
}

:deep(.ProseMirror blockquote) {
    border-left: 4px solid rgba(66, 153, 225, 0.6);
    padding-left: 1rem;
    margin: 1em 0;
    color: #b0b0b0;
    font-style: italic;
    background: rgba(66, 153, 225, 0.05);
    padding: 0.5em 1rem;
    border-radius: 0 4px 4px 0;
}

:deep(.ProseMirror code) {
    background: rgba(66, 153, 225, 0.15);
    color: #409eff;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.9em;
}

:deep(.ProseMirror pre) {
    background: rgba(20, 25, 35, 0.8);
    border: 1px solid rgba(66, 153, 225, 0.3);
    border-radius: 6px;
    padding: 12px;
    margin: 1em 0;
    overflow-x: auto;
}

:deep(.ProseMirror pre code) {
    background: none;
    color: #a0d8f1;
    padding: 0;
    font-size: 0.9em;
    line-height: 1.5;
}

:deep(.ProseMirror hr) {
    border: none;
    border-top: 2px solid rgba(66, 153, 225, 0.3);
    margin: 2em 0;
}

:deep(.ProseMirror s),
:deep(.ProseMirror strike) {
    text-decoration: line-through;
    color: #999;
}

/* 滚动条样式 */
.editor-area::-webkit-scrollbar {
    width: 8px;
}

.editor-area::-webkit-scrollbar-track {
    background: rgba(28, 38, 50, 0.3);
}

.editor-area::-webkit-scrollbar-thumb {
    background: rgba(66, 153, 225, 0.4);
    border-radius: 4px;
}

.editor-area::-webkit-scrollbar-thumb:hover {
    background: rgba(66, 153, 225, 0.6);
}

.title-input {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8px 20px;
    border-bottom: 1px solid rgba(66, 153, 225, 0.3);
    background: rgba(28, 38, 50, 0.3);
    backdrop-filter: blur(8px);
}

.el-input {
    width: 50%;
    font-size: 20px;
    font-weight: 900;
    height: 40px;
}

:deep(.ProseMirror img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1em auto;
    display: block;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 2px solid rgba(66, 153, 225, 0.15);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

:deep(.ProseMirror img:hover) {
    border-color: rgba(66, 153, 225, 0.6);
    box-shadow: 0 8px 24px rgba(66, 153, 225, 0.4);
    transform: translateY(-2px);
}

:deep(.el-input-group__prepend) {
    background: rgba(0, 0, 0, 0.15);
    box-shadow: inset 0 2px 2px rgba(0, 0, 0, 0.1);
}

:deep(.el-input__inner) {
    color: #f9fafb;
    font-size: inherit;
    font-weight: inherit;
    background: transparent;
    border: none;
    text-align: center;
    letter-spacing: 0.5px;
}

:deep(.el-input__wrapper) {
    background: rgba(20, 25, 35, 0.8);
    border: 1px solid rgba(66, 153, 225, 0.4);
    border-radius: 8px;
    box-shadow: none;
    padding: 0 16px;
    height: 100%;
}

:deep(.el-input__wrapper:focus-within) {
    border-color: rgba(66, 153, 225, 0.8);
    box-shadow: 0 0 10px rgba(66, 153, 225, 0.2);
}

:deep(.el-input .el-input__count .el-input__count-inner) {
    background: none;
    color: rgba(240, 240, 240, 0.6);
    font-size: 12px;
}

:deep(.el-dialog) {
    background: rgba(28, 38, 50, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(66, 153, 225, 0.3);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

:deep(.el-dialog__header) {
    border-bottom: 1px solid rgba(66, 153, 225, 0.2);
    padding: 16px 20px;
}

:deep(.el-dialog__title) {
    color: #f0f0f0;
    font-size: 18px;
    font-weight: 500;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
    color: #f0f0f0;
    font-size: 18px;
}

:deep(.el-dialog__body) {
    padding: 20px;
}

:deep(.el-dialog__footer) {
    border-top: 1px solid rgba(66, 153, 225, 0.2);
    padding: 12px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

:deep(.el-dialog .el-input__wrapper) {
    background: rgba(20, 25, 35, 0.8);
    border: 1px solid rgba(66, 153, 225, 0.4);
    border-radius: 8px;
    box-shadow: none;
    padding: 0 16px;
    height: 48px;
}

:deep(.el-dialog .el-input__inner) {
    color: #f0f0f0;
    font-size: 16px;
    background: transparent;
    border: none;
}

:deep(.el-dialog .el-input__placeholder) {
    color: rgba(240, 240, 240, 0.5);
}

:deep(.el-dialog .el-input__wrapper:focus-within) {
    border-color: rgba(66, 153, 225, 0.8);
    box-shadow: 0 0 10px rgba(66, 153, 225, 0.2);
}

/* 弹窗按钮样式（和工具栏按钮统一风格） */
:deep(.el-dialog__footer .el-button) {
    padding: 8px 20px;
    border: 1px solid rgba(66, 153, 225, 0.3);
    background: rgba(35, 45, 60, 0.7);
    color: #f0f0f0;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
}

:deep(.el-dialog__footer .el-button:hover) {
    background: rgba(66, 153, 225, 0.2);
    border-color: rgba(66, 153, 225, 0.5);
    transform: translateY(-1px);
}

:deep(.el-dialog__footer .el-button--primary) {
    background: rgba(66, 153, 225, 0.4);
    border-color: rgba(66, 153, 225, 0.6);
    color: #fff;
}

:deep(.el-dialog__footer .el-button--primary:hover) {
    background: rgba(66, 153, 225, 0.6);
    border-color: rgba(66, 153, 225, 0.8);
}

:deep(.ProseMirror a) {
    color: #60a5fa;
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: color 0.2s ease;
}

:deep(.ProseMirror a:hover) {
    color: #93c5fd;
}
</style>