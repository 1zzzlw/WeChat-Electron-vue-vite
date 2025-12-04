// 定义常见的图片/视频后缀
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm']
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'm4a']

// 核心判断函数
export const getFileType = (file: File): number => {
  // 1. 获取文件后缀
  const fileName = file.name || ''
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  // 2. 优先用MIME类型判断
  if (file.type) {
    if (file.type.startsWith('image/')) return 2 // 图片
    if (file.type.startsWith('video/')) return 3 // 视频
    if (file.type.startsWith('audio/')) return 4 // 音频
  }

  // 3. MIME类型失效时，用后缀兜底
  if (IMAGE_EXTENSIONS.includes(ext)) return 2 // 图片
  if (VIDEO_EXTENSIONS.includes(ext)) return 3 // 视频
  if (AUDIO_EXTENSIONS.includes(ext)) return 4 // 音频

  // 4. 其他类型，统一设置为文件
  return 5
}
