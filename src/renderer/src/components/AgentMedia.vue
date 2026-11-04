<template>
  <div class="agent-media">
    <span v-if="error" role="status">{{ error }}</span>
    <img v-else-if="kind === 'image' && url" :src="url" alt="聊天图片" @click="preview = true" />
    <audio v-else-if="url" :src="url" controls preload="metadata"></audio>
    <span v-else>正在加载…</span>
    <el-dialog v-model="preview" title="图片" width="75%" append-to-body>
      <img :src="url" class="preview-image" alt="图片预览" />
    </el-dialog>
  </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { loadAgentMedia } from '@/api/AgentPerson'
const props = defineProps<{ userId: string; assetId: string; kind: string }>()
const url = ref('')
const error = ref('')
const preview = ref(false)
let generation = 0
watch(
  () => [props.userId, props.assetId],
  async () => {
    const current = ++generation
    if (url.value) URL.revokeObjectURL(url.value)
    url.value = ''
    error.value = ''
    try {
      const blob = await loadAgentMedia(props.userId, props.assetId)
      if (current === generation) url.value = URL.createObjectURL(blob)
    } catch {
      if (current === generation) error.value = '媒体暂时无法加载'
    }
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  generation++
  if (url.value) URL.revokeObjectURL(url.value)
})
</script>
<style scoped>
.agent-media {
  margin-top: 8px;
}
.agent-media > img {
  max-width: 260px;
  max-height: 300px;
  border-radius: 10px;
  cursor: zoom-in;
  object-fit: contain;
}
.agent-media audio {
  max-width: 260px;
  height: 36px;
}
.preview-image {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  margin: auto;
}
.agent-media > span {
  font-size: 12px;
  opacity: 0.7;
}
</style>
