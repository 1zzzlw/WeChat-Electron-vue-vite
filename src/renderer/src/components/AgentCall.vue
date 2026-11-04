<template>
  <el-dialog
    :model-value="modelValue"
    title="语音通话"
    width="420px"
    append-to-body
    :close-on-click-modal="false"
    :before-close="close"
  >
    <div class="call-body">
      <div :class="['call-avatar', { speaking: phase === '正在说话' }]">{{ name.slice(0, 1) }}</div>
      <h2>{{ name }}</h2>
      <p role="status">{{ error || phase }}</p>
      <p class="call-caption">{{ caption }}</p>
      <button @click="close">挂断</button>
    </div>
  </el-dialog>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import {
  startAgentCall,
  endAgentCall,
  interruptAgentCall,
  agentCallTurn,
  hearAgentCall,
  loadAgentMedia,
  getAgentCall
} from '@/api/AgentPerson'
const props = defineProps<{ modelValue: boolean; userId: string; name: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()
const phase = ref('正在呼叫…'),
  error = ref(''),
  caption = ref('')
let identity = '',
  epoch = 0,
  requestVersion = 0,
  closed = true
let stream: MediaStream | null = null,
  recorder: MediaRecorder | null = null,
  audioContext: AudioContext | null = null
let audio: HTMLAudioElement | null = null,
  audioUrl = '',
  timer = 0
let speaking = false,
  speechStarted = 0,
  silentSince = 0,
  startedAt = 0
let interruption: Promise<void> = Promise.resolve()
let callPoll: ReturnType<typeof setInterval> | undefined
const errorText = (e: any) => e?.response?.data?.detail?.message || e?.message || '通话暂时无法继续'
function stopPlayback() {
  audio?.pause()
  audio = null
  if (audioUrl) URL.revokeObjectURL(audioUrl)
  audioUrl = ''
}
async function interrupt() {
  requestVersion++
  stopPlayback()
  if (!identity || closed) return
  interruption = interruption
    .then(async () => {
      const result = await interruptAgentCall(identity, { userId: props.userId, epoch })
      epoch = result.epoch
    })
    .catch((e) => {
      error.value = errorText(e)
    })
  await interruption
}
function record() {
  if (!stream || closed) return
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((s) =>
    MediaRecorder.isTypeSupported(s)
  )
  recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data)
  }
  const instance = recorder
  let hasSpeech = false
  recorder.onstop = () => {
    if (closed) return
    if (hasSpeech) void turn(new Blob(chunks, { type: instance.mimeType }))
    record()
  }
  ;(recorder as any).finishSpeech = () => {
    hasSpeech = true
    recorder?.stop()
  }
  startedAt = performance.now()
  recorder.start(250)
}
async function turn(blob: Blob) {
  const version = requestVersion
  phase.value = '正在听你说'
  try {
    await interruption
    const result = await agentCallTurn(
      identity,
      props.userId,
      epoch,
      new File([blob], 'voice.webm', { type: blob.type })
    )
    if (closed || version !== requestVersion) return
    epoch = result.epoch
    caption.value = result.transcript
    if (result.status !== 'connected') {
      phase.value = '通话已结束'
      await cleanup()
      return
    }
    for (const segment of result.segments) {
      if (closed || version !== requestVersion) break
      const media = await loadAgentMedia(props.userId, segment.assetId)
      if (closed || version !== requestVersion) break
      stopPlayback()
      audioUrl = URL.createObjectURL(media)
      audio = new Audio(audioUrl)
      phase.value = '正在说话'
      const player = audio
      const fullyPlayed = await new Promise<boolean>((resolve) => {
        player.onended = () => resolve(true)
        player.onpause = () => resolve(false)
        player.onerror = () => resolve(false)
        player.play().catch(() => resolve(false))
      })
      if (fullyPlayed && !closed && version === requestVersion)
        await hearAgentCall(identity, { userId: props.userId, epoch, segmentId: segment.id })
    }
    if (!closed && version === requestVersion) {
      stopPlayback()
      phase.value = '正在聆听…'
    }
  } catch (e) {
    if (!closed && version === requestVersion) {
      error.value = errorText(e)
      phase.value = '正在聆听…'
    }
  }
}
async function begin() {
  closed = false
  identity = ''
  error.value = ''
  caption.value = ''
  phase.value = '正在呼叫…'
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    })
    if (closed) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }
    const call = await startAgentCall({ userId: props.userId, clientCallId: crypto.randomUUID() })
    identity = call.id
    epoch = call.epoch
    if (closed) {
      await endAgentCall(identity, { userId: props.userId })
      return
    }
    if (call.status !== 'connected') {
      phase.value = '对方暂时没有接听'
      await cleanup()
      return
    }
    callPoll = setInterval(async () => {
      if (closed || !identity) return
      try {
        const state = await getAgentCall(identity, props.userId)
        if (state.status !== 'connected') {
          phase.value = '通话已结束'
          await cleanup()
        }
      } catch {
        /* 由下一次轮询或语音请求判断连接状态。 */
      }
    }, 1500)
    audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream),
      analyser = audioContext.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)
    const samples = new Float32Array(analyser.fftSize)
    record()
    phase.value = '正在聆听…'
    speaking = false
    const inspect = () => {
      if (closed) return
      analyser.getFloatTimeDomainData(samples)
      const rms = Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length),
        now = performance.now()
      if (rms > 0.025) {
        silentSince = 0
        if (!speaking) {
          speaking = true
          speechStarted = now
          error.value = ''
          void interrupt()
          phase.value = '正在听你说'
        }
      } else if (speaking) {
        if (!silentSince) silentSince = now
        if (now - silentSince > 800) {
          speaking = false
          if (now - speechStarted > 350 && recorder?.state === 'recording')
            (recorder as any).finishSpeech()
        }
      }
      if (now - startedAt > 25000 && recorder?.state === 'recording') {
        if (speaking) {
          speaking = false
          ;(recorder as any).finishSpeech()
        } else recorder.stop()
      }
      timer = requestAnimationFrame(inspect)
    }
    timer = requestAnimationFrame(inspect)
  } catch (e) {
    error.value = errorText(e)
    await cleanup()
  }
}
async function cleanup() {
  clearInterval(callPoll)
  closed = true
  requestVersion++
  cancelAnimationFrame(timer)
  stopPlayback()
  if (recorder?.state === 'recording') recorder.stop()
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  if (audioContext) await audioContext.close().catch(() => {})
  audioContext = null
}
async function close() {
  const call = identity
  await cleanup()
  if (call) await endAgentCall(call, { userId: props.userId }).catch(() => {})
  emit('update:modelValue', false)
}
watch(
  () => props.modelValue,
  (open) => {
    if (open) void begin()
    else void cleanup()
  }
)
onBeforeUnmount(() => {
  void close()
})
</script>
<style scoped>
.call-body {
  text-align: center;
  padding: 28px 10px;
}
.call-avatar {
  margin: auto;
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  background: var(--color-accent-soft);
  color: var(--color-text-accent);
  border-radius: 30px;
  font-size: 30px;
}
.speaking {
  box-shadow: 0 0 0 12px var(--color-accent-soft);
}
h2 {
  margin-top: 28px;
  font-size: 22px;
}
p {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.call-caption {
  min-height: 48px;
  line-height: 1.8;
}
button {
  margin-top: 20px;
  padding: 12px 28px;
  border: 0;
  border-radius: 24px;
  color: white;
  background: #c65353;
}
</style>
