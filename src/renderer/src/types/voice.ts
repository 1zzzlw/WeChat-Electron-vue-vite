export interface VoiceRecording {
  data: ArrayBuffer
  mimeType: string
  /** 实际录音时长，单位为秒。 */
  duration: number
}
