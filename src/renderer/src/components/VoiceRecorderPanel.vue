<template>
  <section class="voice-panel" aria-label="录音面板" :style="{ '--voice-level': level }">
    <header>
      <div>
        <span class="voice-kicker">VOICE MESSAGE</span>
        <h3>{{ phase === 'preview' ? '把声音发送出去' : '用声音，靠近一点' }}</h3>
      </div>
      <button
        class="voice-close"
        type="button"
        aria-label="关闭录音"
        :disabled="sending"
        @click="emit('close')"
      >
        <el-icon><Close /></el-icon>
      </button>
    </header>
    <div v-if="phase === 'preview'" class="voice-preview">
      <ChatAudioView :remote-url="previewUrl" :content="`[语音] ${duration.toFixed(1)}秒`" /><span
        >听一听，满意后再发送</span
      >
    </div>
    <div v-else class="voice-capture">
      <div class="voice-orb" :class="{ 'is-recording': phase === 'recording' }">
        <el-icon><Microphone /></el-icon>
      </div>
      <div class="voice-meter" aria-hidden="true">
        <i v-for="(value, i) in bars" :key="i" :style="{ height: `${5 + value * 31}px` }" />
      </div>
      <strong class="voice-time">{{ timeText }}</strong>
      <p role="status">
        {{
          error ||
          (phase === 'requesting'
            ? '正在等待麦克风授权…'
            : phase === 'processing'
              ? '正在生成试听…'
              : '正在聆听，最长可录制 60 秒')
        }}
      </p>
    </div>
    <p v-if="sendError" class="voice-error" role="alert">{{ sendError }}</p>
    <footer>
      <template v-if="phase === 'preview'"
        ><el-button :disabled="sending" @click="begin">重新录制</el-button
        ><el-button type="primary" :loading="sending" @click="submit">发送语音</el-button></template
      >
      <template v-else-if="phase === 'error'"
        ><el-button @click="emit('close')">取消</el-button
        ><el-button type="primary" @click="begin">重新尝试</el-button></template
      >
      <template v-else
        ><el-button @click="emit('close')">取消</el-button
        ><el-button type="primary" :disabled="phase !== 'recording'" @click="stop"
          ><span class="stop-dot" />结束录音</el-button
        ></template
      >
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Close, Microphone } from '@element-plus/icons-vue'
import { useVoiceRecorder } from '@/composables/useVoiceRecorder'
import type { VoiceRecording } from '@/types/voice'
import ChatAudioView from './ChatAudioView.vue'

const props = defineProps<{ sendRecording: (recording: VoiceRecording) => Promise<void> }>()
const emit = defineEmits<{ (event: 'close'): void }>()
const { phase, duration, level, bars, previewUrl, error, begin, stop, getRecording } =
  useVoiceRecorder()
const sending = ref(false)
const sendError = ref('')
const timeText = computed(
  () =>
    `${String(Math.floor(duration.value / 60)).padStart(2, '0')}:${String(Math.floor(duration.value % 60)).padStart(2, '0')}`
)
async function submit() {
  if (sending.value) return
  sending.value = true
  sendError.value = ''
  try {
    await props.sendRecording(await getRecording())
    emit('close')
  } catch (error) {
    sendError.value = error instanceof Error ? error.message : '语音发送失败，请重试'
  } finally {
    sending.value = false
  }
}
onMounted(begin)
</script>

<style scoped>
.voice-panel {
  margin: 8px 18px;
  padding: 18px 22px 16px;
  border: 1px solid var(--color-border-primary);
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(var(--color-surface-rgb), 0.92), var(--color-surface-3));
  backdrop-filter: blur(24px);
  box-shadow: var(--shadow-md);
  color: var(--color-text-primary);
  animation: voice-enter 0.24s ease-out;
}
header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.voice-kicker {
  color: var(--color-text-accent);
  font-size: 9px;
  letter-spacing: 2px;
}
h3 {
  margin: 5px 0 0;
  font-size: 15px;
  font-weight: 600;
}
.voice-close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--color-surface-1);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.voice-close:hover {
  background: var(--color-surface-3);
}
.voice-capture {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 13px;
}
.voice-orb {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 9px;
  border: 1px solid var(--color-border-primary);
  border-radius: 50%;
  background: var(--color-accent-soft);
  color: var(--color-text-accent);
  font-size: 27px;
}
.voice-orb.is-recording {
  transform: scale(calc(1 + var(--voice-level) * 0.22));
  box-shadow:
    0 0 0 calc(6px + var(--voice-level) * 18px) rgba(var(--color-accent-rgb), 0.1),
    0 0 24px rgba(var(--color-accent-rgb), 0.2);
  transition:
    transform 0.1s ease-out,
    box-shadow 0.1s ease-out;
}
.voice-meter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 35px;
  margin: 10px 0 3px;
}
.voice-meter i {
  width: 3px;
  border-radius: 3px;
  background: var(--color-accent);
  opacity: 0.7;
  transition: height 0.09s ease-out;
}
.voice-time {
  font-size: 21px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: 2px;
}
.voice-capture p {
  margin: 7px 0 14px;
  color: var(--color-text-muted);
  font-size: 11px;
  text-align: center;
}
.voice-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 22px 0;
}
.voice-preview > span {
  font-size: 11px;
  color: var(--color-text-muted);
}
footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
footer :deep(.el-button) {
  margin: 0;
  border-radius: 10px;
  padding-inline: 17px;
}
.stop-dot {
  width: 8px;
  height: 8px;
  margin-right: 7px;
  border-radius: 2px;
  background: currentColor;
}
.voice-error {
  font-size: 12px;
  color: var(--color-danger);
}
@keyframes voice-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-height: 680px) {
  .voice-panel {
    padding: 12px 18px;
  }
  .voice-orb {
    width: 42px;
    height: 42px;
    margin: 5px;
    font-size: 23px;
  }
  .voice-capture {
    padding-top: 5px;
  }
  .voice-meter {
    margin: 3px 0;
    height: 24px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .voice-panel,
  .voice-panel * {
    animation: none !important;
    transition: none !important;
  }
}
</style>
