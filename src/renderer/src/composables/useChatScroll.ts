import { ref, nextTick, type Ref } from 'vue'

/**
 * Options for configuring chat scroll behavior.
 */
export interface UseChatScrollOptions {
  /**
   * Whether more messages can be loaded.
   * A getter function returning `true` when there are more messages to fetch.
   * Corresponds to e.g. `pageNO > 0` in pagination.
   */
  canLoadMore: () => boolean

  /**
   * Callback to load more messages (e.g. an earlier page).
   * Should be an async function. The composable manages `loading` state around this call.
   */
  onLoadMore: () => Promise<void>

  /**
   * Get the ID of the first (oldest) currently visible message.
   * Used for scroll anchoring — after loading older messages,
   * the view scrolls back to this message so the user's position is preserved.
   */
  getFirstMessageId: () => string | number | undefined
}

/**
 * Composable providing chat scroll helpers: scroll-to-bottom, load-more-on-scroll,
 * and reactive states for loading / no-more / near-bottom detection.
 *
 * @param scrollbarRef - A template ref pointing to the `<el-scrollbar>` element.
 * @param options      - Configuration: `canLoadMore`, `onLoadMore`, `getFirstMessageId`.
 * @returns `{ scrollToBottom, handleScroll, loading, noMore, isNearBottom }`
 */
export function useChatScroll(
  scrollbarRef: Ref<any>,
  options: UseChatScrollOptions
) {
  /** True while older messages are being fetched */
  const loading = ref(false)

  /** Set to `true` by the caller when there are no more messages to load */
  const noMore = ref(false)

  /** True when the user's scroll position is within 50px of the bottom */
  const isNearBottom = ref(false)

  /**
   * Instantly scroll to the bottom of the chat.
   * Uses `setScrollTop` with a large value to ensure we reach the end.
   */
  function scrollToBottom() {
    if (scrollbarRef.value) {
      scrollbarRef.value.setScrollTop(1000000)
    }
  }

  /**
   * Handler for the `@scroll` event on `<el-scrollbar>`.
   *
   * - Updates `isNearBottom` based on current scroll position.
   * - When the user scrolls to the very top AND more messages can be loaded,
   *   triggers `onLoadMore` and anchors the view to the previous first message.
   */
  async function handleScroll({ scrollTop }: { scrollTop: number }) {
    // --- Is-near-bottom detection ---
    if (scrollbarRef.value) {
      const wrap: HTMLElement | undefined =
        scrollbarRef.value.$el?.querySelector?.('.el-scrollbar__wrap')
      if (wrap) {
        const { scrollHeight, clientHeight } = wrap
        isNearBottom.value = scrollHeight - scrollTop - clientHeight < 50
      }
    }

    // --- Load more when scrolled to top ---
    if (scrollTop === 0 && options.canLoadMore()) {
      const lastMessageId = options.getFirstMessageId()

      loading.value = true
      try {
        await options.onLoadMore()
        await nextTick()

        // Anchor: scroll the previously-first message back into view
        if (lastMessageId != null) {
          document
            .querySelector('#message' + lastMessageId)
            ?.scrollIntoView()
        }
      } finally {
        loading.value = false
      }
    }
  }

  return {
    scrollToBottom,
    handleScroll,
    loading,
    noMore,
    isNearBottom,
  }
}
