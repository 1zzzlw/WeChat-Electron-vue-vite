<template>
    <div class="update-moment-container">
        <!-- 侧边导航栏 -->
        <div class="sidebar" :class="{ 'is-collapsed': isSidebarCollapsed }">
            <div class="sidebar-header">
                <span v-show="!isSidebarCollapsed">目录</span>
                <button class="toggle-btn" @click="isSidebarCollapsed = !isSidebarCollapsed">
                    <el-icon>
                        <Fold v-if="!isSidebarCollapsed" />
                        <Expand v-else />
                    </el-icon>
                </button>
            </div>
            <div class="sidebar-content" v-show="!isSidebarCollapsed">
                <div v-if="headings.length === 0" class="empty-nav">暂无标题</div>
                <div v-for="(heading, index) in headings" :key="index" class="nav-item"
                    :class="[`level-${heading.level}`, { 'is-active': activeHeadingIndex === index }]"
                    @click="scrollToHeading(index)">
                    <span class="nav-dot"></span>
                    <span class="nav-text">{{ heading.text }}</span>
                </div>
            </div>
        </div>

        <!-- 主体内容区 -->
        <div class="main-content">
            <!-- 头部标题栏 -->
            <div class="header">
                <div class="header-left">
                    <div class="header-title">修改动态</div>
                </div>
                <div class="header-actions">
                    <el-button class="save-btn" type="primary" @click="saveContent" :loading="saving">保存修改</el-button>
                </div>
            </div>

            <!-- Tiptap 工具栏 -->
            <div class="editor-toolbar">
                <div class="toolbar-group">
                    <button @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
                        :class="{ 'is-active': editor?.isActive('heading', { level: 1 }) }" class="iconfont icon-h1"
                        title="一级标题" />
                    <button @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
                        :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }" class="iconfont icon-h2"
                        title="二级标题" />
                </div>

                <div class="toolbar-group divider">
                    <button @click="editor?.chain().focus().toggleBold().run()"
                        :class="{ 'is-active': editor?.isActive('bold') }" class="iconfont icon-zitijiacu" title="加粗" />
                    <button @click="editor?.chain().focus().toggleItalic().run()"
                        :class="{ 'is-active': editor?.isActive('italic') }" class="iconfont icon-xieti" title="斜体" />
                    <button @click="editor?.chain().focus().toggleStrike().run()"
                        :class="{ 'is-active': editor?.isActive('strike') }" class="iconfont icon-zitishanchuxian"
                        title="删除线" />
                </div>

                <div class="toolbar-group divider">
                    <button @click="editor?.chain().focus().toggleBulletList().run()"
                        :class="{ 'is-active': editor?.isActive('bulletList') }" class="iconfont icon-wuxuliebiao"
                        title="无序列表" />
                    <button @click="editor?.chain().focus().toggleOrderedList().run()"
                        :class="{ 'is-active': editor?.isActive('orderedList') }" class="iconfont icon-youxuliebiao"
                        title="有序列表" />
                    <button @click="editor?.chain().focus().toggleBlockquote().run()"
                        :class="{ 'is-active': editor?.isActive('blockquote') }" class="iconfont icon-zu" title="引用" />
                </div>

                <div class="toolbar-group divider">
                    <button @click="openLinkDialog" :class="{ 'is-active': editor?.isActive('link') }"
                        class="iconfont icon-chaolianjie" title="插入链接" />
                    <button class="iconfont icon-tupian" title="选择图片" @click="addImage"></button>
                    <input ref="fileInput" style="display: none" type="file" accept="image/*"
                        @change="handleFileChange">
                </div>

                <div class="toolbar-group divider">
                    <button @click="editor?.chain().focus().undo().run()" :disabled="!editor?.can().undo()"
                        class="iconfont icon-chexiao" title="撤销" />
                    <button @click="editor?.chain().focus().redo().run()" :disabled="!editor?.can().redo()"
                        class="iconfont icon-zhongzuo" title="重做" />
                </div>
            </div>

            <!-- 编辑区域 -->
            <div class="editor-main" spellcheck="false" ref="editorMainRef" @scroll="handleScroll">
                <div class="editor-layout">
                    <div class="line-numbers" ref="lineNumbersRef">
                        <div v-for="(line, index) in lineStyles" :key="index" class="line-number"
                            :class="{ 'is-active': currentLine === index + 1 }"
                            :style="{ top: line.top + 'px', height: line.lineHeight + 'px' }">
                            {{ index + 1 }}
                        </div>
                    </div>
                    <editor-content :editor="editor" class="editor-content-wrapper" />
                </div>
            </div>
        </div>

        <!-- 控制器 -->
        <WindowControls windowType="updateMomentView" />

        <!-- 链接弹窗 -->
        <el-dialog v-model="showLinkDialog" title="插入链接" width="400px" append-to-body>
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
import { Expand, Fold } from '@element-plus/icons-vue'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { ElMessage } from 'element-plus'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { updateMomentApi, uploadImageApi } from '@/api/Moments'
import WindowControls from '@/components/WindowControls.vue'
import emitter from '@/utils/mitt'

const fileInput = ref<HTMLInputElement | null>(null)
const showLinkDialog = ref(false)
const linkUrl = ref('')
const pendingImages = ref<any[]>([])
const isSidebarCollapsed = ref(false)
const editorMainRef = ref<HTMLElement | null>(null)
const lineNumbersRef = ref<HTMLElement | null>(null)
const activeHeadingIndex = ref(-1)
const lineStyles = ref<{ top: number, lineHeight: number }[]>([])
const currentLine = ref(1)
const saving = ref(false)

// 帖子原始数据（从窗口数据中获取）
const postId = ref<number>(0)

const updateLineStyles = () => {
    nextTick(() => {
        const editorEl = editorMainRef.value?.querySelector('.ProseMirror')
        if (!editorEl) return

        const editorRect = editorEl.getBoundingClientRect()
        const children = Array.from(editorEl.children)

        lineStyles.value = children.map(child => {
            const childRect = child.getBoundingClientRect()
            const top = childRect.top - editorRect.top + editorEl.scrollTop
            const style = window.getComputedStyle(child)
            const lineHeight = parseFloat(style.lineHeight) || 27

            return {
                top: top,
                lineHeight: lineHeight
            }
        })
    })
}

const editor = useEditor({
    content: '',
    extensions: [
        StarterKit.configure({
            heading: {
                levels: [1, 2, 3, 4, 5, 6]
            }
        }),
        Image.configure({
            inline: true,
            allowBase64: true
        }),
        Link.configure({
            openOnClick: false,
            HTMLAttributes: {
                target: '_blank',
                rel: 'noopener noreferrer',
            },
        }),
    ],
    onTransaction: () => {
        updateLineStyles()
    },
    onUpdate: () => {
        updateLineStyles()
    },
    onSelectionUpdate: ({ editor }) => {
        const { selection } = editor.state
        let pos = 0
        let current = 1
        editor.state.doc.forEach((node, offset) => {
            if (offset <= selection.from) {
                current = pos + 1
            }
            pos++
        })
        currentLine.value = current
    },
    editorProps: {
        handlePaste: (view, event) => {
            const items = event.clipboardData?.items
            if (!items) return false

            for (const item of items) {
                if (item.type.indexOf('image') === 0) {
                    event.preventDefault()
                    const file = item.getAsFile()
                    if (!file) return true
                    const tempUrl = URL.createObjectURL(file)
                    pendingImages.value.push({ tempUrl, file })
                    editor.value?.chain().focus().setImage({ src: tempUrl }).run()
                    updateLineStyles()
                    return true
                }
            }
            return false
        }
    }
})

// 从 IPC 获取帖子数据
let resizeObserver: ResizeObserver | null = null
onMounted(async () => {
    updateLineStyles()
    const editorEl = editorMainRef.value?.querySelector('.ProseMirror')
    if (editorEl) {
        resizeObserver = new ResizeObserver(() => {
            updateLineStyles()
        })
        resizeObserver.observe(editorEl)
    }

    // 获取传递的数据
    const data = await (window as any).windowToolApi?.getPendingData()
    if (data) {
        postId.value = data.id || 0
        const content = data.content || ''
        // 将 HTML 内容填入编辑器
        if (editor.value && content) {
            editor.value.commands.setContent(content)
        }
    }
})

const headings = computed(() => {
    if (!editor.value) return []
    const json = editor.value.getJSON()
    const list: { level: number, text: string }[] = []

    json.content?.forEach((node: any) => {
        if (node.type === 'heading') {
            const text = node.content?.map((c: any) => c.text).join('') || ''
            if (text) {
                list.push({
                    level: node.attrs?.level || 1,
                    text
                })
            }
        }
    })
    return list
})

const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement
    if (lineNumbersRef.value) {
        lineNumbersRef.value.scrollTop = target.scrollTop
    }

    if (!editorMainRef.value) return
    const headingElements = editorMainRef.value.querySelectorAll('h1, h2, h3, h4, h5, h6')
    let currentActive = -1
    headingElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect()
        const parentRect = editorMainRef.value!.getBoundingClientRect()
        if (rect.top >= parentRect.top && rect.top <= parentRect.top + 100) {
            currentActive = index
        }
    })
    if (currentActive !== -1) {
        activeHeadingIndex.value = currentActive
    }
}

const scrollToHeading = (index: number) => {
    if (!editorMainRef.value) return
    const headingElements = editorMainRef.value.querySelectorAll('h1, h2, h3, h4, h5, h6')
    if (headingElements[index]) {
        activeHeadingIndex.value = index
        headingElements[index].scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
}

onBeforeUnmount(() => {
    editor.value?.destroy()
    if (resizeObserver) {
        resizeObserver.disconnect()
    }
    for (const img of pendingImages.value) {
        URL.revokeObjectURL(img.tempUrl)
    }
    pendingImages.value = []
})

const openLinkDialog = () => {
    const { from, to } = editor.value!.state.selection
    if (from === to) {
        ElMessage.warning('请先选中文本')
        return
    }
    const previousUrl = editor.value?.getAttributes('link').href
    linkUrl.value = previousUrl || 'https://'
    showLinkDialog.value = true
}

const confirmLink = () => {
    if (!linkUrl.value || linkUrl.value === 'https://') {
        ElMessage.warning('请输入链接地址')
        return
    }
    editor.value?.chain().focus().setLink({ href: linkUrl.value }).run()
    showLinkDialog.value = false
}

const addImage = () => {
    fileInput.value?.click()
}

const handleFileChange = (e: any) => {
    const file = e.target.files[0]
    if (!file) return
    const tempUrl = URL.createObjectURL(file)
    pendingImages.value.push({ tempUrl, file })
    editor.value?.chain().focus().setImage({ src: tempUrl }).run()
}

const saveImage = async () => {
    if (pendingImages.value.length === 0) {
        return []
    }

    const fileLists = []
    for (const img of pendingImages.value) {
        fileLists.push(img.file)
    }

    const formData = new FormData()
    fileLists.forEach(file => {
        formData.append('images', file)
    })

    const res = await uploadImageApi(formData)
    return res.data
}

const replaceTempUrl = (tempUrl: string, realUrl: string) => {
    const html = editor.value?.getHTML() || ''
    const newHtml = html.replace(tempUrl, realUrl)
    editor.value?.commands.setContent(newHtml)
}

const saveContent = async () => {
    if (!editor.value || editor.value.isEmpty) {
        ElMessage.warning('内容不能为空')
        return
    }

    saving.value = true
    try {
        const realUrls = await saveImage()

        if (realUrls && realUrls.length > 0) {
            for (let i = 0; i < pendingImages.value.length; i++) {
                replaceTempUrl(pendingImages.value[i].tempUrl, realUrls[i])
            }
            pendingImages.value = []
        }

        const content = editor.value.getHTML()

        // 调用更新 API
        await updateMomentApi({ id: postId.value, content })

        // 释放临时 URL
        for (const img of pendingImages.value) {
            URL.revokeObjectURL(img.tempUrl)
        }
        pendingImages.value = []

        ElMessage.success('修改成功')
        emitter.emit('moments:updated')

            // 关闭窗口
            ; (window as any).windowToolApi?.destroyNewWindow('updateMomentView')
    } catch (e) {
        console.error('修改帖子失败', e)
        ElMessage.error('修改失败，请重试')
    } finally {
        saving.value = false
    }
}
</script>

<style scoped>
.create-moment-container,
.update-moment-container {
    display: flex;
    width: 100%;
    height: 100%;
    background: rgba(28, 38, 50, 0.4);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    color: #f0f2f5;
    overflow: hidden;
}

/* ---- 侧边栏 ---- */
.sidebar {
    width: 220px;
    background: rgba(255, 255, 255, 0.03);
    border-right: 1px solid rgba(67, 243, 255, 0.15);
    display: flex;
    flex-direction: column;
    transition: width 0.3s ease;
    flex-shrink: 0;
}

.sidebar.is-collapsed {
    width: 44px;
}

.sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
}

.toggle-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.toggle-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
}

.sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
}

.empty-nav {
    padding: 16px;
    text-align: center;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.3);
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.55);
}

.nav-item:hover {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.8);
}

.nav-item.is-active {
    background: rgba(67, 243, 255, 0.1);
    color: #43f3ff;
}

.nav-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
}

.nav-item.is-active .nav-dot {
    background: #43f3ff;
    box-shadow: 0 0 6px rgba(67, 243, 255, 0.4);
}

.level-2 {
    padding-left: 28px;
}

.level-3 {
    padding-left: 40px;
}

.nav-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ---- 主内容区 ---- */
.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    -webkit-app-region: drag;
    flex-shrink: 0;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    -webkit-app-region: no-drag;
}

.header-title {
    font-size: 15px;
    font-weight: 600;
    color: #43f3ff;
    text-shadow: 0 0 8px rgba(67, 243, 255, 0.3);
}

.header-actions {
    -webkit-app-region: no-drag;
    margin-right: 110px;
    /* 预留给 WindowControls 的空间，解决重叠问题 */
}

.save-btn {
    background: rgba(67, 243, 255, 0.2) !important;
    border: 1px solid rgba(67, 243, 255, 0.4) !important;
    color: #43f3ff !important;
    border-radius: 6px;
    padding: 6px 18px;
    height: 32px;
    font-weight: 600;
    font-size: 13px;
    transition: all 0.3s ease !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
}

.save-btn:hover {
    background: rgba(67, 243, 255, 0.35) !important;
    border-color: rgba(67, 243, 255, 0.5) !important;
    box-shadow: 0 6px 16px rgba(67, 243, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
    transform: translateY(-1px);
}

/* ---- 工具栏 ---- */
.editor-toolbar {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    gap: 12px;
    flex-wrap: wrap;
    flex-shrink: 0;
}

.toolbar-group {
    display: flex;
    align-items: center;
    gap: 4px;
}

.toolbar-group button {
    width: 30px;
    height: 30px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.5);
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
}

.toolbar-group button:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
}

.toolbar-group button.is-active {
    background: rgba(67, 243, 255, 0.15);
    color: #43f3ff;
    box-shadow: 0 0 4px rgba(67, 243, 255, 0.2);
}

.toolbar-group button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.toolbar-group.divider {
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    padding-left: 12px;
}

/* ---- 编辑器主区域 ---- */
.editor-main {
    flex: 1;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.15);
}

.editor-layout {
    display: flex;
    min-height: 100%;
}

.line-numbers {
    width: 45px;
    padding: 30px 0;
    background: rgba(0, 0, 0, 0.1);
    border-right: 1px solid rgba(67, 243, 255, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    user-select: none;
    pointer-events: none;
    overflow: hidden;
    flex-shrink: 0;
    position: relative;
}

.line-number {
    position: absolute;
    width: 100%;
    font-size: 12px;
    color: rgba(67, 243, 255, 0.45) !important;
    font-family: 'Consolas', monospace;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s, background 0.2s, top 0.1s ease-out;
    opacity: 1 !important;
    box-sizing: border-box;
}

.line-number.is-active {
    color: #43f3ff !important;
    text-shadow: 0 0 8px rgba(67, 243, 255, 0.6);
    font-weight: bold;
    background: rgba(67, 243, 255, 0.08);
}

.editor-content-wrapper {
    flex: 1;
    min-width: 0;
    width: fit-content;
}

:deep(.editor-content-wrapper .ProseMirror) {
    outline: none;
    min-height: 100%;
    padding: 30px 40px;
    font-size: 15px;
    line-height: 1.8;
    color: #f0f2f5;
    word-break: break-all;
    white-space: pre-wrap;
    margin: 0;
    display: inline-block;
    min-width: 150px;
    caret-color: #43f3ff;
}

:deep(.editor-content-wrapper .ProseMirror p) {
    margin: 0.5em 0;
    font-size: 15px;
    line-height: 1.8;
}

:deep(.editor-content-wrapper .ProseMirror h1) {
    font-size: 22px;
    font-weight: 700;
    margin: 16px 0 8px;
    color: #fff;
    border-bottom: 1px solid rgba(67, 243, 255, 0.2);
    padding-bottom: 4px;
}

:deep(.editor-content-wrapper .ProseMirror h2) {
    font-size: 18px;
    font-weight: 600;
    margin: 12px 0 6px;
    color: #e0faff;
}

:deep(.editor-content-wrapper .ProseMirror h3) {
    font-size: 16px;
    font-weight: 600;
    margin: 10px 0 4px;
    color: rgba(255, 255, 255, 0.9);
}

:deep(.editor-content-wrapper .ProseMirror strong) {
    color: #43f3ff;
    font-weight: 600;
}

:deep(.editor-content-wrapper .ProseMirror blockquote) {
    border-left: 3px solid rgba(67, 243, 255, 0.4);
    background: rgba(67, 243, 255, 0.03);
    padding: 8px 16px;
    margin: 12px 0;
    border-radius: 0 4px 4px 0;
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
}

:deep(.editor-content-wrapper .ProseMirror img) {
    max-width: 100%;
    border-radius: 8px;
    margin: 8px 0;
    border: 2px solid rgba(67, 243, 255, 0.2);
}

:deep(.editor-content-wrapper .ProseMirror a) {
    color: #43f3ff;
    text-decoration: underline;
}

:deep(.editor-content-wrapper .ProseMirror ul),
:deep(.editor-content-wrapper .ProseMirror ol) {
    padding-left: 20px;
}

/* ── 滚动条 ── */
.sidebar-content::-webkit-scrollbar,
.editor-main::-webkit-scrollbar {
    width: 4px;
}

.sidebar-content::-webkit-scrollbar-thumb,
.editor-main::-webkit-scrollbar-thumb {
    background: rgba(67, 243, 255, 0.15);
    border-radius: 2px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover,
.editor-main::-webkit-scrollbar-thumb:hover {
    background: rgba(67, 243, 255, 0.3);
}

/* ── el-dialog 弹窗 ── */
:deep(.el-dialog) {
    background: rgba(28, 38, 50, 0.95) !important;
    backdrop-filter: blur(15px);
    border: 1px solid rgba(67, 243, 255, 0.3);
    border-radius: 12px;
}

:deep(.el-dialog__title) {
    color: #43f3ff;
}

:deep(.el-dialog .el-input__wrapper) {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(67, 243, 255, 0.2) !important;
    box-shadow: none !important;
}

:deep(.el-dialog .el-input__inner) {
    color: #f0f2f5;
}
</style>
