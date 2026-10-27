/** 卡片只显示文本与首张图片，不直接注入帖子中的 HTML。 */
export const momentPreview = (content: string) => {
  const doc = new DOMParser().parseFromString(content || '', 'text/html')
  doc.querySelectorAll('script, style').forEach(node => node.remove())
  const image = doc.querySelector('img')?.getAttribute('src') || ''
  return {
    text: (doc.body.textContent || '').replace(/\s+/g, ' ').trim(),
    image: /^(https?:\/\/|data:image\/)/i.test(image) ? image : ''
  }
}
