<template>
  <!--打开调试工具-->
  <p class="tip"></p>
  <router-view></router-view>
</template>

<script setup>
import { onMounted } from 'vue'
import { registerWsHandlers } from './handlers/wsHandlers'
import { registerFileTransferHandlers } from './handlers/fileTransferHandlers'
import { initWallpaper, registerWallpaperHandlers } from './handlers/wallpaperHandlers'

onMounted(async () => {
  // 壁纸初始化
  initWallpaper()
  registerWsHandlers()
  registerFileTransferHandlers()
  registerWallpaperHandlers()
})

</script>
