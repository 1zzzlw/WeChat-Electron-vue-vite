<template>
  <section class="file-preview-view" aria-label="待发送附件">
    <header class="attachment-heading"><strong>待发送附件 <span>{{ fileInfoList.length }}</span></strong><span>{{ formatSize(totalSize) }} · 点击查看预览</span></header>
    <div class="attachment-list">
      <article v-for="file in fileInfoList" :key="file.fileId" class="attachment-card">
        <button type="button" class="attachment-preview" :aria-label="'预览 ' + file.fileName" @click="openPreview(file)">
          <img v-if="[2, 3].includes(file.fileType) && file.previewUrl" :src="file.previewUrl" alt="" />
          <el-icon v-else aria-hidden="true"><Headset v-if="file.fileType === 4" /><Document v-else /></el-icon>
          <span v-if="file.fileType === 3" class="video-badge" aria-hidden="true"><el-icon><VideoPlay /></el-icon></span>
        </button>
        <div class="attachment-info"><strong :title="file.fileName">{{ file.fileName }}</strong><span>{{ typeLabel(file.fileType) }} · {{ formatSize(file.fileSize) }}</span></div>
        <button type="button" class="remove-file" :aria-label="'移除 ' + file.fileName" @click="removeFile(file.fileId)"><el-icon aria-hidden="true"><Close /></el-icon></button>
      </article>
    </div>
    <el-dialog v-model="previewVisible" :title="previewFile?.fileName" width="min(760px, calc(100vw - 48px))" align-center destroy-on-close>
      <template v-if="previewFile">
        <div class="preview-stage">
          <p v-if="previewError" class="preview-error" role="status">无法预览此文件，你仍可返回编辑并发送附件。</p>
          <img v-else-if="previewFile.fileType === 2" class="full-image" :src="localSource(previewFile)" alt="待发送的图片" @error="previewError = true" />
          <video v-else-if="previewFile.fileType === 3" class="full-video" :src="localSource(previewFile)" :poster="previewFile.previewUrl" controls preload="metadata" @error="previewError = true"></video>
          <audio v-else-if="previewFile.fileType === 4" :src="localSource(previewFile)" controls preload="metadata" @error="previewError = true"></audio>
          <div v-else class="document-preview"><el-icon aria-hidden="true"><Document /></el-icon><strong>{{ previewFile.fileName }}</strong><p>文件已就绪，发送后对方可以下载查看。</p></div>
        </div>
        <div class="preview-meta"><span>{{ typeLabel(previewFile.fileType) }}</span><span>{{ formatSize(previewFile.fileSize) }}</span><span>待发送</span></div>
      </template>
      <template #footer><el-button type="primary" @click="previewVisible = false">返回编辑</el-button></template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Close, Document, Headset, VideoPlay } from '@element-plus/icons-vue'
import type { FileBaseInfo } from '@/types/fileBaseInfo'

const props = withDefaults(defineProps<{ fileInfoList?: FileBaseInfo[] }>(), { fileInfoList: () => [] })
const emit = defineEmits<{ 'delete-file': [fileId: string] }>()
const previewFile = ref<FileBaseInfo | null>(null)
const previewVisible = ref(false)
const previewError = ref(false)
const totalSize = computed(() => props.fileInfoList.reduce((sum, file) => sum + Number(file.fileSize), 0))
const typeLabel = (type: number) => ({ 2: '图片', 3: '视频', 4: '音频' })[type] || '文件'
const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB'
}
const localSource = (file: FileBaseInfo) => {
  if (!file.localPath) return file.previewUrl || ''
  if (/^(file|blob|data|https?):/i.test(file.localPath)) return file.localPath
  const url = new URL('file:///')
  url.pathname = '/' + file.localPath.replace(/\\/g, '/').replace(/^\//, '')
  return url.href
}
const openPreview = (file: FileBaseInfo) => {
  previewFile.value = file
  previewError.value = false
  previewVisible.value = true
}
const removeFile = (fileId: string) => {
  if (previewFile.value?.fileId === fileId) previewVisible.value = false
  emit('delete-file', fileId)
}
</script>

<style scoped>
.file-preview-view { flex-shrink: 0; min-width: 0; padding: 12px 16px; color: var(--color-text-primary); background: var(--color-composer-surface); border-top: 1px solid var(--color-border-subtle); }
.attachment-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px; font-size: 11px; color: var(--color-text-secondary); }
.attachment-heading strong { font-size: 12px; font-weight: 500; color: var(--color-text-primary); }
.attachment-heading strong span { margin-left: 4px; color: var(--color-accent); font-variant-numeric: tabular-nums; }
.attachment-list { display: flex; gap: 10px; overflow-x: auto; padding: 2px; }
.attachment-card { position: relative; display: flex; align-items: center; gap: 10px; flex: 0 0 224px; min-width: 0; padding: 8px 32px 8px 8px; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); background: var(--color-bg-deep); }
.attachment-preview { position: relative; display: grid; place-items: center; flex: 0 0 56px; width: 56px; height: 56px; overflow: hidden; border-radius: var(--radius-sm); background: var(--color-surface-1); color: var(--color-accent); cursor: var(--cursor-pointer, pointer); }
.attachment-preview img { width: 100%; height: 100%; object-fit: contain; }
.attachment-preview > .el-icon { font-size: 28px; }
.video-badge { position: absolute; inset: 0; display: grid; place-items: center; background: #00000045; color: #ffffff; font-size: 24px; }
.attachment-info { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.attachment-info strong { color: var(--color-text-primary); font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.attachment-info > span { color: var(--color-text-secondary); font-size: 11px; white-space: nowrap; }
.remove-file { position: absolute; top: 4px; right: 4px; display: grid; place-items: center; width: 26px; height: 26px; color: var(--color-text-secondary); border-radius: var(--radius-sm); cursor: var(--cursor-pointer, pointer); }
.remove-file:hover { color: var(--color-danger); background: var(--color-surface-2); }
.preview-stage { display: grid; place-items: center; min-height: 180px; max-height: 60vh; padding: 16px; overflow: auto; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); background: var(--color-surface-1); }
.full-image, .full-video { display: block; max-width: 100%; max-height: 52vh; object-fit: contain; }
.full-video { width: 100%; }
.preview-stage audio { max-width: 100%; }
.document-preview { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 24px; color: var(--color-text-primary); text-align: center; overflow-wrap: anywhere; }
.document-preview .el-icon { font-size: 52px; color: var(--color-accent); }
.document-preview strong { font-size: 16px; font-weight: 500; }
.document-preview p, .preview-error { font-size: 13px; color: var(--color-text-secondary); }
.preview-meta { display: flex; flex-wrap: wrap; gap: 16px; padding-top: 14px; font-size: 12px; color: var(--color-text-secondary); }
:deep(.el-dialog__title) { display: block; padding-right: 24px; font-size: 16px; overflow-wrap: anywhere; }
@media (max-width: 600px) { .attachment-heading > span { display: none; } .attachment-card { flex-basis: 210px; } }
</style>
