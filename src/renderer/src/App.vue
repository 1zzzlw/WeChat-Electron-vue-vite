<template>
  <!--打开调试工具-->
  <p class="tip"></p>
  <router-view></router-view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { registerWsHandlers } from '@/handlers/wsHandlers'
import { registerFileTransferHandlers } from '@/handlers/fileTransferHandlers'
import { initWallpaper, registerWallpaperHandlers } from '@/handlers/wallpaperHandlers'

let audio: any = null
let removeSoundListener: any = null

onMounted(async () => {
  // 壁纸初始化
  initWallpaper()
  registerWsHandlers()
  registerFileTransferHandlers()
  registerWallpaperHandlers()

  // 注册消息提示音监听
  if ((window as any).soundApi) {
    removeSoundListener = (window as any).soundApi.onPlayMessageSound((soundUrl: string) => {
      try {
        if (audio) {
          audio.pause()
          audio.currentTime = 0
        }
        audio = new Audio(soundUrl)
        audio.volume = 0.8
        audio.play().catch(() => {
          // 浏览器自动播放策略限制时静默失败
        })
      } catch (e) {
        // 非关键功能，静默失败
      }
    })
  }
})

onUnmounted(() => {
  if (removeSoundListener) {
    removeSoundListener()
  }
  if (audio) {
    audio.pause()
    audio = null
  }
})
</script>
