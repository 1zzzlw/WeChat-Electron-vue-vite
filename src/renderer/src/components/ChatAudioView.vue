<template>
  <div
    class="chat-audio"
    :class="{ 'is-mine': isUpload, 'is-playing': playing, 'has-error': failed }"
  >
    <audio
      ref="audio"
      :src="source"
      preload="metadata"
      @loadedmetadata="readDuration"
      @durationchange="readDuration"
      @timeupdate="position = audio?.currentTime || 0"
      @play="playing = true"
      @pause="playing = false"
      @ended="ended"
      @error="onError"
    />
    <button
      class="audio-toggle"
      type="button"
      :disabled="!source"
      :aria-label="playing ? '暂停语音' : failed ? '重试播放语音' : '播放语音'"
      :aria-pressed="playing"
      @click="toggle"
    >
      <el-icon v-if="loading" class="audio-loading"><Loading /></el-icon>
      <el-icon v-else-if="playing"><VideoPause /></el-icon>
      <el-icon v-else><VideoPlay /></el-icon>
    </button>
    <div class="audio-body">
      <div class="audio-caption">
        <span>{{ caption }}</span
        ><span class="audio-duration">{{ timeText(playing ? position : duration) }}</span>
      </div>
      <div class="audio-wave" aria-hidden="true">
        <i
          v-for="(height, index) in heights"
          :key="index"
          :class="{ passed: duration > 0 && index / heights.length <= position / duration }"
          :style="{ '--bar-height': `${height}px`, '--bar-delay': `${index * -73}ms` }"
        />
      </div>
      <input
        class="audio-seek"
        type="range"
        min="0"
        :max="duration || 1"
        step="0.1"
        :value="position"
        :disabled="!duration || failed"
        aria-label="语音播放进度"
        :aria-valuetext="`${timeText(position)} / ${timeText(duration)}`"
        @input="seek"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Loading, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import { fileStatusListInfo } from '@/stores/modules/FileStatusInfoStore'
import { statusMap } from '@/utils/constants'

defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{
    remoteUrl?: string
    localPath?: string
    content?: string
    fileId?: string
    isUpload?: boolean
    sendStatus?: number
  }>(),
  { remoteUrl: '', localPath: '', content: '', fileId: '', isUpload: false, sendStatus: 1 }
)
const audio = ref<HTMLAudioElement>()
const playing = ref(false)
const loading = ref(false)
const failed = ref(false)
const remoteFallback = ref(false)
const position = ref(0)
const measuredDuration = ref(0)
const transfers = fileStatusListInfo()
const upload = computed(() => transfers.getFileUploadUpdateInfo(props.fileId))
const hint = computed(() => Number(props.content.match(/^\[语音\]\s*(\d+(?:\.\d+)?)秒$/)?.[1]) || 0)
const duration = computed(() => measuredDuration.value || hint.value)
const source = computed(() => {
  if (props.localPath && !remoteFallback.value) {
    if (/^(file|blob|https?):/i.test(props.localPath)) return props.localPath
    const url = new URL('file:///')
    url.pathname = '/' + props.localPath.replace(/\\/g, '/').replace(/^\//, '')
    return url.href
  }
  return props.remoteUrl
})
const caption = computed(() => {
  if (failed.value) return '加载失败，点击重试'
  if (props.sendStatus === 2 || upload.value?.uploadStatus === statusMap.fail.value)
    return '发送失败'
  if (
    props.isUpload &&
    props.sendStatus === 0 &&
    upload.value?.uploadStatus === statusMap.uploading.value
  ) {
    return `正在上传 ${Math.min(100, Math.round(upload.value.uploadProgress))}%`
  }
  return loading.value ? '正在加载…' : playing.value ? '正在播放' : '语音消息'
})
// 静态波形仅作播放提示；录音面板中的音量来自真实麦克风。
const heights = [8, 14, 22, 12, 26, 18, 10, 24, 30, 16, 22, 12, 28, 20, 10, 18, 26, 14, 20, 8]
function timeText(value: number) {
  const seconds = Math.max(0, Math.floor(value || 0))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
function readDuration() {
  if (audio.value && Number.isFinite(audio.value.duration))
    measuredDuration.value = audio.value.duration
}
function ended() {
  playing.value = false
  position.value = 0
  if (audio.value) audio.value.currentTime = 0
}
function onError() {
  loading.value = false
  if (props.localPath && props.remoteUrl && !remoteFallback.value) remoteFallback.value = true
  else failed.value = true
}
async function toggle() {
  const player = audio.value
  if (!player) return
  if (!player.paused) {
    player.pause()
    return
  }
  if (failed.value) {
    failed.value = false
    player.load()
  }
  loading.value = true
  // 同一窗口只播放一段语音，其他语音自动暂停。
  document.querySelectorAll<HTMLAudioElement>('.chat-audio audio').forEach((other) => {
    if (other !== player) other.pause()
  })
  try {
    await player.play()
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) failed.value = true
  } finally {
    loading.value = false
  }
}
function seek(event: Event) {
  if (audio.value) audio.value.currentTime = Number((event.target as HTMLInputElement).value)
}
watch(source, () => {
  position.value = 0
  measuredDuration.value = 0
  failed.value = false
  playing.value = false
})
watch(
  () => [props.localPath, props.remoteUrl],
  () => {
    remoteFallback.value = false
  }
)
onBeforeUnmount(() => audio.value?.pause())
</script>

<style scoped>
.chat-audio {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 224px;
  max-width: 100%;
  box-sizing: border-box;
  padding: 12px 15px;
  border: 1px solid var(--color-border-subtle);
  border-radius: 5px 18px 18px;
  background: var(--color-bubble-incoming);
  box-shadow: var(--shadow-sm);
  color: var(--color-text-primary);
  transition:
    box-shadow 0.25s,
    transform 0.25s;
}
.chat-audio.is-mine {
  border-radius: 18px 5px 18px 18px;
  background: var(--color-bubble-outgoing);
}
.chat-audio.is-playing {
  box-shadow: 0 4px 20px rgba(var(--color-accent-rgb), 0.16);
}
.chat-audio audio {
  display: none;
}
.audio-toggle {
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(var(--color-accent-rgb), 0.15);
  color: var(--color-text-accent);
  font-size: 25px;
  cursor: pointer;
  transition:
    background 0.2s,
    transform 0.2s;
}
.audio-toggle:hover {
  background: rgba(var(--color-accent-rgb), 0.26);
  transform: scale(1.06);
}
.audio-toggle:focus-visible,
.audio-seek:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}
.audio-toggle:disabled {
  opacity: 0.45;
  cursor: default;
}
.audio-body {
  position: relative;
  min-width: 0;
  flex: 1;
}
.audio-caption {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: var(--color-text-secondary);
}
.audio-caption > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.audio-duration {
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.audio-wave {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  gap: 3px;
  margin-top: 3px;
}
.audio-wave i {
  display: block;
  width: 3px;
  height: var(--bar-height);
  border-radius: 3px;
  background: var(--color-accent);
  opacity: 0.4;
}
.audio-wave i.passed {
  opacity: 1;
}
.is-playing .audio-wave i {
  animation: voice-wave 0.85s ease-in-out infinite alternate;
  animation-delay: var(--bar-delay);
}
.audio-seek {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 30px;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
.audio-seek:focus-visible {
  opacity: 0.8;
  accent-color: var(--color-accent);
}
.has-error {
  border-color: var(--color-danger);
}
.audio-loading {
  animation: audio-spin 1s linear infinite;
}
@keyframes voice-wave {
  from {
    transform: scaleY(0.4);
  }
  to {
    transform: scaleY(1);
  }
}
@keyframes audio-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .chat-audio *,
  .chat-audio {
    animation: none !important;
    transition: none !important;
  }
}
</style>
