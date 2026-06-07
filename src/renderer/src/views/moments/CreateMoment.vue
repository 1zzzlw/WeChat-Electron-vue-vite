<template>
    <div class="create-moment-container">
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
                    <div class="header-title">发布动态</div>
                </div>
                <div class="header-actions">
                    <el-button class="publish-btn" type="primary" @click="saveContent">发布</el-button>
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
        <WindowControls windowType="createMomentView" />

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
import { publishApi, uploadImageApi } from '../../api/Moments.js'
import WindowControls from '../../components/WindowControls.vue'
import { eventEmitter } from '../../utils/eventEmitter';

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

// 实时更新行号高度 - 采用绝对坐标定位法
const updateLineStyles = () => {
    nextTick(() => {
        const editorEl = editorMainRef.value?.querySelector('.ProseMirror')
        if (!editorEl) return

        const editorRect = editorEl.getBoundingClientRect()
        const children = Array.from(editorEl.children)

        lineStyles.value = children.map(child => {
            const childRect = child.getBoundingClientRect()
            // 计算子元素相对于编辑器容器顶部的绝对偏移
            const top = childRect.top - editorRect.top + editorEl.scrollTop

            // 获取该行文字的实际行高，用于垂直居中对齐数字
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
        // 精确计算当前光标所在的行号
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

// 初始化与尺寸监听
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
    updateLineStyles()
    // 监听编辑器尺寸变化（如图片加载、内容换行）
    const editorEl = editorMainRef.value?.querySelector('.ProseMirror')
    if (editorEl) {
        resizeObserver = new ResizeObserver(() => {
            updateLineStyles()
        })
        resizeObserver.observe(editorEl)
    }
})

// 提取标题列表
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

// 处理滚动：同步行号与 ScrollSpy
const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement
    if (lineNumbersRef.value) {
        lineNumbersRef.value.scrollTop = target.scrollTop
    }

    // ScrollSpy: 自动高亮当前可视区域标题
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

// 平滑滚动到标题
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

    // 上传照片接口
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

    const urlList = await saveImage()

    urlList.forEach((url: string, index: number) => {
        const tempUrl = pendingImages.value[index].tempUrl
        replaceTempUrl(tempUrl, url)
    })

    const data = {
        content: editor.value.getHTML()
    }
    await publishApi(data)

    ElMessage.success('发布成功')

    setTimeout(() => {
        eventEmitter.emit('moments:updated');

        (window as any).windowToolApi.windowControls('createMomentView', 'closeWindow')
    }, 1000)
}
</script>

<style scoped>
.create-moment-container {
    width: 100%;
    height: 100%;
    display: flex;
    background: rgba(28, 38, 50, 0.4);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    color: #f0f2f5;
    overflow: hidden;
}

/* 侧边导航栏样式 */
.sidebar {
    width: 220px;
    height: 100%;
    background: rgba(255, 255, 255, 0.03);
    border-right: 1px solid rgba(67, 243, 255, 0.15);
    display: flex;
    flex-direction: column;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    z-index: 10;
}

.sidebar.is-collapsed {
    width: 50px;
}

.sidebar-header {
    height: 50px;
    padding: 0 15px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(67, 243, 255, 0.1);
    color: #43f3ff;
    font-weight: 600;
    font-size: 14px;
}

.toggle-btn {
    background: transparent;
    border: none;
    color: #43f3ff;
    cursor: pointer;
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
}

.toggle-btn:hover {
    background: rgba(67, 243, 255, 0.1);
}

.sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 15px 0;
}

.nav-item {
    padding: 10px 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.2s;
    position: relative;
    font-size: 13px;
    color: rgba(240, 242, 245, 0.7);
}

.nav-item:hover {
    background: rgba(67, 243, 255, 0.08);
    color: #43f3ff;
}

.nav-item.is-active {
    background: rgba(67, 243, 255, 0.12);
    color: #43f3ff;
    font-weight: 600;
}

.nav-item.is-active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: #43f3ff;
    box-shadow: 0 0 8px #43f3ff;
}

.nav-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(67, 243, 255, 0.3);
    flex-shrink: 0;
}

.nav-item.level-1 {
    padding-left: 20px;
    font-weight: 500;
}

.nav-item.level-2 {
    padding-left: 35px;
    font-size: 12px;
}

.nav-item.level-3 {
    padding-left: 45px;
    font-size: 11px;
    opacity: 0.8;
}

.nav-item.level-4,
.nav-item.level-5,
.nav-item.level-6 {
    padding-left: 55px;
    font-size: 11px;
    opacity: 0.6;
}

.nav-item.level-2 .nav-dot {
    width: 4px;
    height: 4px;
}

.nav-item.level-3 .nav-dot {
    width: 3px;
    height: 3px;
}

.empty-nav {
    text-align: center;
    color: rgba(67, 243, 255, 0.3);
    font-size: 12px;
    margin-top: 20px;
}

/* 主内容区 */
.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    position: relative;
}

/* 编辑器布局：行号 + 内容 */
.editor-layout {
    display: flex;
    min-height: 100%;
    position: relative;
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
    /* 必须设为 relative 供子元素绝对定位 */
}

.line-number {
    position: absolute;
    /* 采用绝对定位 */
    width: 100%;
    font-size: 12px;
    color: rgba(67, 243, 255, 0.45) !important;
    font-family: 'Consolas', monospace;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s, background 0.2s, top 0.1s ease-out;
    /* top 也加入平滑过渡 */
    opacity: 1 !important;
    box-sizing: border-box;
}

.line-number.is-active {
    color: #43f3ff !important;
    text-shadow: 0 0 8px rgba(67, 243, 255, 0.6);
    font-weight: bold;
    background: rgba(67, 243, 255, 0.08);
}

.header {
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(67, 243, 255, 0.2);
    -webkit-app-region: drag;
}

.header-title {
    font-size: 16px;
    font-weight: 600;
    color: #43f3ff;
    text-shadow: 0 0 8px rgba(67, 243, 255, 0.3);
}

.header-actions {
    -webkit-app-region: no-drag;
    margin-right: 110px;
    /* 预留给 WindowControls 的空间，解决重叠问题 */
}

.publish-btn {
    background: rgba(67, 243, 255, 0.2) !important;
    border: 1px solid rgba(67, 243, 255, 0.4) !important;
    color: #43f3ff !important;
    border-radius: 6px;
    padding: 6px 18px;
    height: 32px;
    font-weight: 600;
    font-size: 13px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
}

.publish-btn:hover {
    background: rgba(67, 243, 255, 0.35) !important;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(67, 243, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
}

.editor-toolbar {
    display: flex;
    align-items: center;
    padding: 8px 20px;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(67, 243, 255, 0.1);
    gap: 12px;
    flex-wrap: wrap;
}

.toolbar-group {
    display: flex;
    align-items: center;
    gap: 6px;
}

.toolbar-group.divider {
    padding-left: 12px;
    border-left: 1px solid rgba(67, 243, 255, 0.15);
}

.editor-toolbar button {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    color: rgba(67, 243, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.editor-toolbar button:hover {
    background: rgba(67, 243, 255, 0.15);
    color: #43f3ff;
    border-color: rgba(67, 243, 255, 0.3);
    transform: translateY(-1px);
}

.editor-toolbar button.is-active {
    background: rgba(67, 243, 255, 0.25);
    color: #fff;
    border-color: #43f3ff;
    box-shadow: 0 0 8px rgba(67, 243, 255, 0.3);
}

.editor-toolbar button .iconfont {
    font-size: 14px;
}

.editor-main {
    flex: 1;
    overflow-y: auto;
    background: rgba(255, 255, 255, 0.01);
}

.editor-content-wrapper {
    flex: 1;
    min-width: 0;
    width: fit-content;
}

/* 标题体系规范化样式 */
:deep(.ProseMirror) {
    min-height: 100%;
    padding: 30px 40px;
    outline: none;
    color: #f0f2f5;
    line-height: 1.8;
    font-size: 15px;
    margin: 0;
    width: auto;
    display: inline-block;
    min-width: 150px;
    padding: 15px;
    /* 允许在任何字符间断行，防止长英文撑爆宽度 */
    word-break: break-all;
    /* 保留空格和换行，但允许自动换行 */
    white-space: pre-wrap;

    caret-color: #43f3ff;

    filter:
        drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 3px rgba(0, 0, 0, 0.2));

    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
}

:deep(.ProseMirror:focus) {
    filter:
        drop-shadow(0 3px 8px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 5px rgba(0, 0, 0, 0.3));
    transition: filter 0.2s ease;
}

@keyframes cursor-blink {
    50% {
        opacity: 0;
    }
}

:deep(.ProseMirror h1) {
    font-size: 28px;
    font-weight: 700;
    color: #fff;
    margin: 1.5em 0 0.8em;
    padding-bottom: 0.3em;
    border-bottom: 2px solid rgba(67, 243, 255, 0.3);
    letter-spacing: -0.02em;
    line-height: 1.2;
}

:deep(.ProseMirror h2) {
    font-size: 22px;
    font-weight: 600;
    color: #e0faff;
    margin: 1.4em 0 0.6em;
    display: flex;
    align-items: center;
    line-height: 1.3;
}

:deep(.ProseMirror h2::before) {
    content: '';
    width: 4px;
    height: 18px;
    background: #43f3ff;
    margin-right: 12px;
    border-radius: 2px;
    box-shadow: 0 0 8px rgba(67, 243, 255, 0.5);
}

:deep(.ProseMirror h3) {
    font-size: 18px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    margin: 1.2em 0 0.5em;
    line-height: 1.4;
}

:deep(.ProseMirror h4),
:deep(.ProseMirror h5),
:deep(.ProseMirror h6) {
    color: rgba(255, 255, 255, 0.8);
    margin: 1em 0 0.4em;
    font-weight: 600;
}

:deep(.ProseMirror h4) {
    font-size: 16px;
}

:deep(.ProseMirror h5) {
    font-size: 14px;
}

:deep(.ProseMirror h6) {
    font-size: 13px;
}

:deep(.ProseMirror p) {
    margin: 0.5em 0;
    font-size: 15px;
    color: rgba(240, 242, 245, 0.9);
    line-height: 1.8;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
    content: '分享这一刻的想法...';
    float: left;
    color: rgba(67, 243, 255, 0.3);
    pointer-events: none;
    height: 0;
}

:deep(.ProseMirror blockquote) {
    border-left: 4px solid rgba(67, 243, 255, 0.5);
    background: rgba(67, 243, 255, 0.05);
    padding: 12px 20px;
    margin: 20px 0;
    border-radius: 0 8px 8px 0;
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
}

:deep(.ProseMirror img) {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 20px auto;
    display: block;
    border: 1px solid rgba(67, 243, 255, 0.2);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}

/* 响应式适配 */
@media (max-width: 768px) {
    .sidebar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        background: rgba(28, 38, 50, 0.95);
        box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5);
    }

    .sidebar.is-collapsed {
        width: 0;
        border: none;
        overflow: hidden;
    }

    :deep(.ProseMirror) {
        padding: 20px;
    }
}

/* 滚动条 */
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
