import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'

/** 渲染进程只能提交录音字节，文件名和落盘目录由主进程决定。 */
export async function saveVoiceRecording(recording, directory) {
  const { data, mimeType, duration } = recording || {}
  const extension = new Map([
    ['audio/webm', 'webm'],
    ['audio/ogg', 'ogg'],
    ['audio/mp4', 'm4a']
  ]).get(typeof mimeType === 'string' ? mimeType.split(';')[0].trim().toLowerCase() : '')
  if (!extension || !(data instanceof ArrayBuffer || ArrayBuffer.isView(data))) {
    throw new Error('录音数据格式无效，请重新录制')
  }
  const bytes =
    data instanceof ArrayBuffer
      ? Buffer.from(data)
      : Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  if (
    !bytes.length ||
    bytes.length > 8 * 1024 * 1024 ||
    !Number.isFinite(duration) ||
    duration < 1 ||
    duration > 65
  ) {
    throw new Error('录音大小或时长无效，请录制 1 到 60 秒的语音')
  }
  await fs.mkdir(directory, { recursive: true })
  const fileName = `voice_${Date.now()}_${randomUUID().slice(0, 8)}.${extension}`
  const localPath = path.join(directory, fileName)
  await fs.writeFile(localPath, bytes, { flag: 'wx' })
  // WebM 也可能是纯音频，必须显式使用音频类型，不能按视频扩展名推断。
  return {
    fileId: createHash('md5').update(bytes).digest('hex'),
    fileName,
    fileSize: bytes.length,
    fileType: 4,
    content: `[语音] ${duration.toFixed(1)}秒`,
    localPath,
    remotePath: ''
  }
}
