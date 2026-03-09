<template>
    <div class="note-count">
        <div class="note-content">
            <div class="title">
                笔记
            </div>
            <div class="note-content-view">
                <el-scrollbar ref="scrollbarRef" noresize style="height: 100%; width: 100%">
                    <div v-for="note in favoritesList" class="note-item" @click="openInNote(note.id)">
                        <div class="note-title">{{ note.title }}</div>
                        <div class="note-content-html" v-html="note.content"></div>
                        <div class="time">
                            {{ formatMessageTime(note.updatedAt) }}
                        </div>
                    </div>
                </el-scrollbar>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getFavorites, addFavorites } from '../../db/dualDB';
import { formatMessageTime } from '../../utils/utils'
import { getFavoritesApi } from '../../api/Favorites'

const favoritesList = ref<any>([])

const openInNote = (id: string | number) => {
    const noteData = favoritesList.value.find((note: any) => {
        return String(note.id) === String(id)
    });

    // 去除相应格式，否则无法在IPC进程间传递
    const data = { ...noteData };

    (window as any).windowToolApi.createNewWindow('createNote', data)

}

onMounted(async () => {
    // 从本地拉取
    favoritesList.value = await getFavorites()

    console.log(favoritesList)

    if (favoritesList.value.length === 0) {
        // 本地数据库没有，尝试从服务端拉取
        const res = await getFavoritesApi()
        favoritesList.value = res.data
        console.log(favoritesList.value)
        // 将从服务端拿到的数据存储到本地
        const favoritesPackList: any = []
        favoritesList.value.forEach((item: any) => {
            favoritesPackList.push({
                id: item.id,
                userId: String(item.userId),
                title: item.title,
                content: item.content,
                sourceUsername: item.sourceUsername,
                type: item.type,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
            })
        })
        addFavorites(favoritesPackList)
    }

})
</script>
<style scoped>
.note-count {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    -webkit-app-region: no-drag;
    background: rgba(40, 50, 65, 0.95);
}

.note-content {
    width: 90%;
    height: 90%;
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(66, 153, 225, 0.4);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(66, 153, 225, 0.1);
    background: rgba(40, 50, 65, 0.95);
}

.title {
    width: 100%;
    height: 48px;
    line-height: 48px;
    text-align: center;
    font-size: 18px;
    font-weight: 500;
    color: #f5f5f5;
    background: rgba(50, 65, 85, 0.9);
    border-bottom: 1px solid rgba(66, 153, 225, 0.3);
    -webkit-app-region: drag;
}

.note-content-view {
    width: 100%;
    height: 100%;
    flex: 1;
    display: flex;
    background: rgba(40, 50, 65, 0.8);
    overflow: hidden;
}

.note-item {
    margin: 8px 12px;
    padding: 12px 16px;
    background: rgba(50, 65, 85, 0.8);
    border-radius: 10px;
    border: 1px solid rgba(66, 153, 225, 0.25);
    transition: all 0.2s ease;
    position: relative;
}

.note-item:hover {
    background: rgba(55, 70, 90, 1);
    border-color: rgba(66, 153, 225, 0.4);
    box-shadow: 0 2px 8px rgba(66, 153, 225, 0.15);
}

.note-title {
    font-size: 16px;
    font-weight: 600;
    color: #7cb7f5;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(66, 153, 225, 0.2);
}

.note-content-html {
    font-size: 14px;
    color: #f0f2f5;
    line-height: 1.6;
}

.time {
    position: absolute;
    right: 12px;
    bottom: 8px;
    font-size: 12px;
    color: rgba(160, 180, 220, 0.7);
    z-index: 1;
    white-space: nowrap;
    opacity: 0.8;
}

:deep(.note-content-html img) {
    max-width: 50%;
    height: auto;
    border-radius: 8px;
    margin: 8px auto;
    border: 2px solid rgba(66, 153, 225, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
}

:deep(.note-content-html img:hover) {
    border-color: rgba(66, 153, 225, 0.4);
    box-shadow: 0 4px 12px rgba(66, 153, 225, 0.2);
}

:deep(.el-scrollbar__bar) {
    background: rgba(66, 153, 225, 0.1);
}

:deep(.el-scrollbar__thumb) {
    background: rgba(66, 153, 225, 0.4);
    border-radius: 4px;
}

:deep(.note-content-html strong),
:deep(.note-content-html b) {
    font-weight: 900;
    color: #fff;
    background: rgba(66, 153, 225, 0.15);
    padding: 0 3px;
    border-radius: 2px;
}

:deep(.note-content-html em),
:deep(.note-content-html i) {
    font-style: italic;
    color: #e0e0e0;
}

:deep(.note-content-html h1) {
    font-size: 2em;
    font-weight: bold;
    margin: 0.8em 0 0.4em;
    color: #fff;
    border-bottom: 2px solid rgba(66, 153, 225, 0.5);
    padding-bottom: 0.3em;
}

:deep(.note-content-html h2) {
    font-size: 1.5em;
    font-weight: bold;
    margin: 0.7em 0 0.3em;
    color: #fff;
}

:deep(.note-content-html h3) {
    font-size: 1.2em;
    font-weight: bold;
    margin: 0.6em 0 0.3em;
    color: #e0e0e0;
}

:deep(.note-content-html p) {
    margin: 0.5em 0;
}

:deep(.note-content-html ul),
:deep(.note-content-html ol) {
    padding-left: 1.5rem;
    margin: 0.8em 0;
}

:deep(.note-content-html li) {
    margin: 0.3em 0;
}

:deep(.note-content-html blockquote) {
    border-left: 4px solid rgba(66, 153, 225, 0.6);
    padding-left: 1rem;
    margin: 1em 0;
    color: #b0b0b0;
    font-style: italic;
    background: rgba(66, 153, 225, 0.05);
    padding: 0.5em 1rem;
    border-radius: 0 4px 4px 0;
}

:deep(.note-content-html code) {
    background: rgba(66, 153, 225, 0.15);
    color: #409eff;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.9em;
}

:deep(.note-content-html pre) {
    background: rgba(20, 25, 35, 0.8);
    border: 1px solid rgba(66, 153, 225, 0.3);
    border-radius: 6px;
    padding: 12px;
    margin: 1em 0;
    overflow-x: auto;
}

:deep(.note-content-html pre code) {
    background: none;
    color: #a0d8f1;
    padding: 0;
    font-size: 0.9em;
    line-height: 1.5;
}

:deep(.note-content-html hr) {
    border: none;
    border-top: 2px solid rgba(66, 153, 225, 0.3);
    margin: 2em 0;
}

:deep(.note-content-html s),
:deep(.note-content-html strike) {
    text-decoration: line-through;
    color: #999;
}

:deep(.note-content-html a) {
    color: #60a5fa;
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: color 0.2s ease;
}

:deep(.note-content-html a:hover) {
    color: #93c5fd;
}
</style>