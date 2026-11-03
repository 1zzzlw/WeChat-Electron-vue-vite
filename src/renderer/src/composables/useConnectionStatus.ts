import { computed, onMounted, onUnmounted, ref } from 'vue'

export function useConnectionStatus() {
  const status = ref(3)
  let unsubscribe: (() => void) | undefined
  let changed = false
  let disposed = false
  onMounted(async () => {
    const api = (window as any).wsApi
    unsubscribe = api.onConnectionStatus((value: number) => {
      changed = true
      status.value = value
    })
    const initial = await api.getConnectionStatus()
    if (!disposed && !changed) status.value = initial
  })
  onUnmounted(() => {
    disposed = true
    unsubscribe?.()
  })
  return {
    isConnected: computed(() => status.value === 1),
    connectionLabel: computed(() =>
      status.value === 1 ? '在线' : status.value === 0 ? '离线 · 正在连接' : '离线'
    )
  }
}
