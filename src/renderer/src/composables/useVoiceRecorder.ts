import { onBeforeUnmount, ref } from 'vue'

/** 只负责采集和试听；保存及上传继续交给现有文件消息链路。 */
export function useVoiceRecorder() {
  const phase = ref<'idle' | 'requesting' | 'recording' | 'processing' | 'preview' | 'error'>(
    'idle'
  )
  const duration = ref(0)
  const level = ref(0)
  const bars = ref<number[]>(Array(20).fill(0))
  const previewUrl = ref('')
  const error = ref('')
  let stream: MediaStream | undefined
  let recorder: MediaRecorder | undefined
  let context: AudioContext | undefined
  let analyser: AnalyserNode | undefined
  let frame = 0
  let limit: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  let started = 0
  let recording: Blob | undefined

  function releaseCapture() {
    cancelAnimationFrame(frame)
    clearTimeout(limit)
    stream?.getTracks().forEach((track) => track.stop())
    stream = undefined
    analyser?.disconnect()
    analyser = undefined
    void context?.close().catch(() => {})
    context = undefined
    level.value = 0
  }

  function reset() {
    generation++
    if (recorder) {
      recorder.ondataavailable = recorder.onstop = recorder.onerror = null
      if (recorder.state !== 'inactive') recorder.stop()
      recorder = undefined
    }
    releaseCapture()
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
    recording = undefined
    duration.value = 0
    bars.value = Array(20).fill(0)
    error.value = ''
    phase.value = 'idle'
  }

  function fail(message: string) {
    reset()
    error.value = message
    phase.value = 'error'
  }

  function stop() {
    if (phase.value !== 'recording' || recorder?.state !== 'recording') return
    duration.value = Math.min(60, (performance.now() - started) / 1000)
    phase.value = 'processing'
    recorder.stop()
    releaseCapture()
  }

  async function begin() {
    reset()
    const current = generation
    phase.value = 'requesting'
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('当前环境不支持录音，请使用桌面客户端')
      }
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      })
      // 权限弹窗期间取消、切换会话或关闭窗口，迟到的麦克风也必须释放。
      if (current !== generation) {
        acquired.getTracks().forEach((track) => track.stop())
        return
      }
      stream = acquired
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4'
      ].find((type) => MediaRecorder.isTypeSupported(type))
      if (!mimeType) throw new Error('当前设备没有可用的录音编码格式')
      recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 })
      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => {
        if (current === generation && event.data.size) chunks.push(event.data)
      }
      recorder.onerror = () => fail('录音中断，请检查麦克风后重试')
      recorder.onstop = () => {
        if (current !== generation) return
        releaseCapture()
        if (duration.value < 1) return fail('录音太短，请至少说 1 秒')
        recording = new Blob(chunks, { type: mimeType })
        if (!recording.size) return fail('没有录到声音，请重新录制')
        previewUrl.value = URL.createObjectURL(recording)
        phase.value = 'preview'
      }
      context = new AudioContext()
      analyser = context.createAnalyser()
      analyser.fftSize = 256
      context.createMediaStreamSource(stream).connect(analyser)
      await context.resume()
      if (current !== generation) return
      const spectrum = new Uint8Array(analyser.frequencyBinCount)
      const waveform = new Uint8Array(analyser.fftSize)
      started = performance.now()
      recorder.start(250)
      phase.value = 'recording'
      stream
        .getAudioTracks()
        .forEach((track) => track.addEventListener('ended', stop, { once: true }))
      let lastPaint = 0
      const paint = (now: number) => {
        if (phase.value !== 'recording' || !analyser) return
        if (now - lastPaint >= 50) {
          lastPaint = now
          analyser.getByteTimeDomainData(waveform)
          const rms = Math.sqrt(
            waveform.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / waveform.length
          )
          level.value = level.value * 0.55 + Math.min(1, rms * 6) * 0.45
          analyser.getByteFrequencyData(spectrum)
          bars.value = Array.from({ length: 20 }, (_, i) => spectrum[i * 3] / 255)
          duration.value = Math.min(60, (now - started) / 1000)
        }
        frame = requestAnimationFrame(paint)
      }
      frame = requestAnimationFrame(paint)
      limit = setTimeout(stop, 60000)
    } catch (cause) {
      if (current !== generation) return
      const name = cause instanceof DOMException ? cause.name : ''
      fail(
        name === 'NotAllowedError'
          ? '麦克风权限未开启，请在系统设置中允许后重试'
          : name === 'NotFoundError'
            ? '没有找到麦克风，请连接设备后重试'
            : name === 'NotReadableError'
              ? '麦克风被占用或无法读取，请检查设备'
              : cause instanceof Error
                ? cause.message
                : '无法启动录音，请重试'
      )
    }
  }

  async function getRecording() {
    if (!recording || phase.value !== 'preview') throw new Error('请先完成录音')
    return {
      data: await recording.arrayBuffer(),
      mimeType: recording.type,
      duration: duration.value
    }
  }

  onBeforeUnmount(reset)
  return { phase, duration, level, bars, previewUrl, error, begin, stop, reset, getRecording }
}
