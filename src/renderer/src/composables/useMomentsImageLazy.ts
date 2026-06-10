import { ref, type Ref } from 'vue'

/**
 * 朋友圈图片懒加载 composable
 *
 * 策略（完全兼容 Masonry 布局）：
 * 1. 处理 v-html 内容：把 <img src=> 替换为 <img data-src=> 延迟加载
 * 2. IntersectionObserver 监听帖子卡片靠近视口时，激活图片 src
 * 3. 远离子视口的帖子：清空 .post-content 的 innerHTML（保留卡片外框高度）节省 DOM 节点
 *
 * 注意：不使用真正的虚拟滚动（移除 DOM），因为 Masonry 依赖所有元素的真实尺寸来计算布局
 */

export interface LazyOptions {
    /** 提前多少像素开始加载图片（rootMargin），默认 800 */
    preloadMargin?: number
    /** 超过多少视口高度后清理 DOM 内容，默认 3（3 倍屏幕高度） */
    pruneThreshold?: number
    /** 最多同时保持多少条帖子的完整 DOM，超过此数量的远离子帖子会被清理，默认 80 */
    maxRenderedPosts?: number
}

export function useMomentsImageLazy(
    postListRef: Ref<HTMLElement | null>,
    options: LazyOptions = {}
) {
    const {
        preloadMargin = 800,
        pruneThreshold = 3,
        maxRenderedPosts = 80
    } = options

    let observer: IntersectionObserver | null = null
    // 记录已激活过图片的帖子（避免重复激活）
    const activatedPosts = new Set<string>()
    // 记录被清理了内容的帖子及原始 HTML
    const prunedContentCache = new Map<string, string>()

    /**
     * 处理帖子 HTML 内容：img src → data-src，阻止立即加载
     */
    function processContent(rawHtml: string): string {
        if (!rawHtml) return rawHtml
        // 匹配 <img ... src="..." ...>，将其替换为 data-src
        return rawHtml.replace(
            /(<img[^>]*?)\s+src=(["'])([^"']+)\2/gi,
            '$1 data-src=$2$3$2'
        )
    }

    /**
     * 激活指定帖子卡片内的所有延迟图片
     */
    function activateImages(cardEl: HTMLElement) {
        const images = cardEl.querySelectorAll<HTMLImageElement>('img[data-src]')
        let activated = false
        images.forEach((img) => {
            const dataSrc = img.getAttribute('data-src')
            if (dataSrc) {
                img.src = dataSrc
                img.removeAttribute('data-src')
                activated = true
            }
        })
        if (activated) {
            // 图片激活后可能需要触发 masonry 重排，通过事件通知
            cardEl.dispatchEvent(new CustomEvent('images-activated', { bubbles: true }))
        }
    }

    /**
     * 清理帖子内容区 DOM（保留卡片骨架高度），减少内存占用
     */
    function pruneContent(cardEl: HTMLElement): boolean {
        const contentEl = cardEl.querySelector('.post-text-wrapper') as HTMLElement
        if (!contentEl || !contentEl.innerHTML) return false

        const postId = cardEl.getAttribute('data-post-id')
        if (!postId) return false

        // 只清理有图片的富文本内容（纯文本内存占用极小，不值得清理）
        const hasImages = contentEl.querySelectorAll('img, img[data-src]').length > 0
        if (!hasImages) return false

        prunedContentCache.set(postId, contentEl.innerHTML)
        contentEl.innerHTML = ''
        return true
    }

    /**
     * 恢复被清理的帖子内容
     */
    function restoreContent(cardEl: HTMLElement): boolean {
        const contentEl = cardEl.querySelector('.post-text-wrapper') as HTMLElement
        if (!contentEl) return false

        const postId = cardEl.getAttribute('data-post-id')
        if (!postId) return false

        const cached = prunedContentCache.get(postId)
        if (cached && !contentEl.innerHTML) {
            contentEl.innerHTML = cached
            prunedContentCache.delete(postId)
            return true
        }
        return false
    }

    /**
     * 统计当前有多少帖子保持了完整 DOM
     */
    function countRenderedPosts(): number {
        if (!postListRef.value) return 0
        const allCards = postListRef.value.querySelectorAll<HTMLElement>('.post-item')
        let count = 0
        allCards.forEach((card) => {
            const contentEl = card.querySelector('.post-text-wrapper') as HTMLElement
            if (contentEl && contentEl.innerHTML) count++
        })
        return count
    }

    /**
     * 初始化 IntersectionObserver
     */
    function initObserver() {
        if (observer) observer.disconnect()

        const viewportHeight = window.innerHeight

        observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const cardEl = entry.target as HTMLElement

                    if (entry.isIntersecting) {
                        // 进入可视区域附近：激活图片
                        activateImages(cardEl)
                        // 如果之前被清理了，恢复内容
                        if (restoreContent(cardEl)) {
                            // 内容恢复后触发 masonry 重排
                            cardEl.dispatchEvent(new CustomEvent('content-restored', { bubbles: true }))
                        }
                    } else {
                        // 离开可视区域：判断是否需要清理 DOM
                        const rect = entry.boundingClientRect
                        const distanceFromViewport = Math.min(
                            Math.abs(rect.top) / viewportHeight,
                            Math.abs(rect.bottom) / viewportHeight
                        )

                        // 只有当帖子远离子视口（超过 pruneThreshold 倍屏幕高度）时才考虑清理
                        if (distanceFromViewport > pruneThreshold) {
                            // 检查是否超过最大渲染数量
                            const rendered = countRenderedPosts()
                            if (rendered > maxRenderedPosts) {
                                pruneContent(cardEl)
                            }
                        }
                    }
                })
            },
            {
                rootMargin: `${preloadMargin}px 0px ${preloadMargin}px 0px`
            }
        )
    }

    /**
     * 开始观察帖子列表中的所有卡片
     */
    function observeAll() {
        if (!postListRef.value || !observer) return

        const cards = postListRef.value.querySelectorAll<HTMLElement>('.post-item')
        cards.forEach((card) => {
            // 确保每张卡片有 data-post-id 用于追踪
            if (!card.getAttribute('data-post-id')) {
                const postId =
                    card.querySelector('[data-post-id]')?.getAttribute('data-post-id') ||
                    `post-${Math.random().toString(36).slice(2)}`
                card.setAttribute('data-post-id', postId)
            }
            observer!.observe(card)
        })
    }

    /**
     * 销毁 observer，释放资源
     */
    function destroy() {
        if (observer) {
            observer.disconnect()
            observer = null
        }
        activatedPosts.clear()
        prunedContentCache.clear()
    }

    return {
        processContent,
        initObserver,
        observeAll,
        activateImages,
        destroy
    }
}
