<template>
    <div class="video-preview">
        <div class="video-header">
            <div class="iconfont icon-fangxiang-xiangzuo" @click="prev" title="上一张"></div>
            <div class="iconfont icon-fangxiang-xiangyou" @click="next" title="下一张"></div>
            <div class="iconfont icon-xiazai-wenjianxiazai-05" @click="dowload" title="下载"></div>
        </div>
        <div class="player" ref="player">

        </div>
        <WindowControls :showSetFullScreen="false" windowType="videoPreview" />
    </div>
</template>
<script lang="ts" setup>
import WindowControls from '../../components/WindowControls.vue'
import DPlayer from 'dplayer';
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';

const player = ref()
const dPlayer = ref()
const videoList = ref<any>([])
const currVideoIndex = ref()
const fileInfo = ref({
    fileId: '',
    fileName: '',
    fileSize: '',
    remoteUrl: ''
})

const initPlayer = () => {
    dPlayer.value = new DPlayer({
        container: player.value,
        // 主题
        theme: '#b7daff',
        // 开启截屏
        screenshot: true,
        video: {
            url: ''
        }
    })
}

const prev = () => {
    if (currVideoIndex.value > 0) {
        currVideoIndex.value--
        dPlayer.value.switchVideo({
            url: videoList.value[currVideoIndex.value].remoteUrl,
        })
        getCurrentFileInfo(videoList.value[currVideoIndex.value])
    } else {
        // 提示没有视频
        ElMessage.info('已没有视频')
    }
}

const next = () => {
    if (currVideoIndex.value < videoList.value.length - 1) {
        currVideoIndex.value++
        dPlayer.value.switchVideo({
            url: videoList.value[currVideoIndex.value].remoteUrl,
        })
        getCurrentFileInfo(videoList.value[currVideoIndex.value])
    } else {
        ElMessage.info('已没有视频')
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

onMounted(() => {
    initPlayer();

    (window as any).windowToolApi.sendWindowInfo((e: any, data: any) => {
        console.log(data)
        const videoUrlList = data.videoUrlList
        dPlayer.value.switchVideo({
            url: data.remoteUrl,
        })
        videoList.value = videoUrlList
        console.log(videoList.value.length)
        currVideoIndex.value = videoUrlList.findIndex((item: any) => item.fileId === data.currentVideoId)
        getCurrentFileInfo(videoUrlList[currVideoIndex.value])
    })
})

</script>
<style scoped>
.video-preview {
    width: 100%;
    height: 100%;
    background-color: #2d2d2d;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.video-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background-color: #1e1e1e;
    color: #ccc;
    font-size: 18px;
    -webkit-app-region: drag;
}

.video-header div {
    -webkit-app-region: no-drag;
}

.video-header .iconfont {
    cursor: pointer;
    transition: color 0.2s;
}

.video-header .iconfont:hover {
    color: #fff;
}

.player {
    display: flex;
    flex: 1;
}
</style>