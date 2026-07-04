<template>
    <div class="image-preview">
        <div class="image-header">
            <div class="iconfont icon-fangxiang-xiangzuo" @click="prev" title="上一张"></div>
            <div class="iconfont icon-fangxiang-xiangyou" @click="next" title="下一张"></div>
            <el-divider direction="vertical" />
            <div class="iconfont icon-fangda" @click="changeSize(0.1)" title="放大"></div>
            <div class="iconfont icon-suoxiao" @click="changeSize(-0.1)" title="缩小"></div>
            <div class="iconfont icon-yuanshidaxiao" @click="resize" title="还原"></div>
            <el-divider direction="vertical" />
            <div class="iconfont icon-xuanzhuan" @click="rotate" title="旋转"></div>
            <div class="iconfont icon-xiazai-wenjianxiazai-05" @click="dowload" title="下载"></div>
        </div>
        <div class="image-content">
            <viewer :images="imageUrl" :options="options" @inited="inited">
                <img :src="imageUrl" style="display: none;">
            </viewer>
        </div>
        <WindowControls :showSetFullScreen="false" windowType="imagePreview" />
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import WindowControls from '@/components/WindowControls.vue'
import { ElMessage } from 'element-plus';
import { component as Viewer } from 'v-viewer';
import 'viewerjs/dist/viewer.css';

const options = ref({
    // 嵌入页面，不是弹窗
    inline: true,
    // 隐藏工具栏
    toolbar: false,
    // 隐藏缩略图导航
    navbar: false,
    //  隐藏关闭按钮
    button: false,
    // 隐藏标题
    title: false,
    // 缩放步长
    zoomRatio: 0.1,
    // 禁止滚轮缩放
    zoomOnWheel: false,
    // 禁止拖动
    movable: false
})

const imageUrl = ref()
const imageList = ref<any>([])
const currImageIndex = ref()
const myViewer = ref()
const fileInfo = ref({
    fileId: '',
    fileName: '',
    fileSize: '',
    remoteUrl: ''
})

const inited = (e: any) => {
    myViewer.value = e
    myViewer.value.view(currImageIndex.value)
}

const prev = () => {
    if (!myViewer.value) return
    if (currImageIndex.value > 0) {
        currImageIndex.value--
        imageUrl.value = imageList.value[currImageIndex.value].remoteUrl
        getCurrentFileInfo(imageList.value[currImageIndex.value])
    } else {
        // 提示没有图片
        ElMessage.info('已没有图片')
    }
}

const next = () => {
    if (!myViewer.value) return
    if (currImageIndex.value < imageList.value.length - 1) {
        currImageIndex.value++
        imageUrl.value = imageList.value[currImageIndex.value].remoteUrl
        getCurrentFileInfo(imageList.value[currImageIndex.value])
    } else {
        ElMessage.info('已没有图片')
    }
}

const changeSize = (zoomRatio: number) => {
    if (!myViewer.value) {
        return
    }
    myViewer.value.zoom(zoomRatio, true)
}

const rotate = () => {
    if (!myViewer.value) {
        return
    }
    myViewer.value.rotate(90, true)
}

const resize = () => {
    if (!myViewer.value) {
        return
    }
    myViewer.value.reset()
}

const onWheel = (e: any) => {
    if (e.deltaY < 0) {
        changeSize(0.1)
    } else {
        changeSize(-0.1)
    }
}

const dowload = () => {
    console.log(fileInfo.value)
    const downloadParams = {
        fileId: fileInfo.value.fileId,
        fileName: fileInfo.value.fileName,
        fileSize: fileInfo.value.fileSize,
        remoteUrl: fileInfo.value.remoteUrl,
    };
    (window as any).uploadFileApi.saveAsMedia(downloadParams)
}

const getCurrentFileInfo = (fileBaseInfo: any) => {
    fileInfo.value.fileId = fileBaseInfo.fileId
    fileInfo.value.fileName = fileBaseInfo.fileName
    fileInfo.value.fileSize = fileBaseInfo.fileSize
    fileInfo.value.remoteUrl = fileBaseInfo.remoteUrl
}

let dataReceived = false
const handleWindowData = (data: any) => {
    if (!data || dataReceived) return
    dataReceived = true
    console.log('imagePreview received data:', data)
    imageUrl.value = data.remoteUrl
    imageList.value = data.imageUrlList
    currImageIndex.value = data.imageUrlList.findIndex((item: any) => item.fileId === data.currentImageId)
    getCurrentFileInfo(imageList.value[currImageIndex.value])
}

onMounted(async () => {
    // 先尝试主动拉取缓存数据（解决路由懒加载导致组件挂载晚于 show 事件的问题）
    const pendingData = await (window as any).windowToolApi.getPendingData()
    if (pendingData) {
        handleWindowData(pendingData)
    }
    // 兜底：如果 show 事件在组件挂载后才触发，仍能通过监听器接收
    ;(window as any).windowToolApi.sendWindowInfo((_e: any, data: any) => {
        handleWindowData(data)
    })
    // 添加滚轮事件监听
    window.addEventListener('wheel', onWheel)
})

onUnmounted(() => {
    window.removeEventListener('wheel', onWheel)
})
</script>
<style scoped>
.image-preview {
    width: 100%;
    height: 100%;
    background-color: #2d2d2d;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.image-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background-color: #1e1e1e;
    color: #ccc;
    font-size: 18px;
    -webkit-app-region: drag;
}

.image-header div {
    -webkit-app-region: no-drag;
}

.image-header .iconfont {
    cursor: pointer;
    transition: color 0.2s;
}

.image-header .iconfont:hover {
    color: #fff;
}

.el-divider--vertical {
    height: 16px;
    margin: 0 4px;
    background-color: #444;
}

.image-content {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    overflow: hidden;
    background-color: #2d2d2d;
    position: relative;
}

.image-content :deep(.viewer-container) {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: #2d2d2d;
}

.image-content :deep(.viewer-canvas) {
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.image-content img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    border-radius: 4px;
}
</style>
