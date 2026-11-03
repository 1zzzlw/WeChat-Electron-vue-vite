import type { Ref } from 'vue'

/** 只延迟图片加载；卡片数量由频道页限制，避免直接清空 Vue 管理的内容造成高度跳变。 */
export function useMomentsImageLazy(
  postListRef: Ref<HTMLElement | null>,
  options: { preloadMargin?: number } = {}
) {
  let observer: IntersectionObserver | null = null
  const observedCards = new Set<HTMLElement>()

  function processContent(rawHtml: string): string {
    return (rawHtml || '').replace(
      /(<img[^>]*?)\s+src=(["'])([^"']+)\2/gi,
      '$1 decoding="async" data-src=$2$3$2'
    )
  }

  function activateImages(card: HTMLElement) {
    card.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((image) => {
      const source = image.dataset.src
      if (!source) return
      image.decoding = 'async'
      image.src = source
      image.removeAttribute('data-src')
    })
  }

  function initObserver() {
    observer?.disconnect()
    observedCards.clear()
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) activateImages(entry.target as HTMLElement)
      },
      {
        root: postListRef.value?.closest('.el-scrollbar__wrap') || null,
        rootMargin: (options.preloadMargin ?? 800) + 'px 0px'
      }
    )
  }

  function observeAll() {
    if (!postListRef.value || !observer) return
    const cards = new Set(postListRef.value.querySelectorAll<HTMLElement>('.post-item'))
    for (const card of observedCards) {
      if (!cards.has(card)) {
        observer.unobserve(card)
        observedCards.delete(card)
      }
    }
    for (const card of cards) {
      if (!observedCards.has(card)) {
        observedCards.add(card)
        observer.observe(card)
      }
    }
  }

  function destroy() {
    observer?.disconnect()
    observer = null
    observedCards.clear()
  }

  return { processContent, initObserver, observeAll, activateImages, destroy }
}
