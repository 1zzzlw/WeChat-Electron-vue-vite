import path from 'path'

// 定义常见的图片/视频后缀
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm']
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'm4a']

/**
 * 文件类型映射表
 */
const FILE_TYPE_MAP = new Map([
  [2, '[图片]'],
  [3, '[视频]'],
  [4, '[音频]'],
  [5, '[文件]']
])

/**
 * 获取文件名称
 * @param filePath -- 文件路径 
 */
const getFileName = (filePath) => {
  const fileName = path.basename(filePath)
  return fileName
}

/**
 * 根据文件路径获取文件类型
 * @param filePath -- 文件路径 
 * @returns 
 */
const getFileType = (filePath) => {
  const fileName = getFileName(filePath)
  // 获取文件后缀
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  if (IMAGE_EXTENSIONS.includes(ext)) return 2 // 图片
  if (VIDEO_EXTENSIONS.includes(ext)) return 3 // 视频
  if (AUDIO_EXTENSIONS.includes(ext)) return 4 // 音频

  // 其他类型，统一设置为文件
  return 5
}

export {
  FILE_TYPE_MAP,
  getFileName,
  getFileType
}
