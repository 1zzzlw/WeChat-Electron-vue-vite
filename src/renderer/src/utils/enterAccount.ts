import { nextTick } from 'vue'
import type { Router } from 'vue-router'

export async function enterAccount(router: Router) {
  const bridge = window as typeof window & {
    loadApi: {
      onDataInitComplete(callback: (value: unknown) => void): () => void
      isNeedInitData(): Promise<boolean>
    }
    dbApi: { updateDBData(): Promise<void> }
    windowToolApi: { resizeWindow(type: string): Promise<void> }
  }
  const session = await window.accountApi.getSession()
  localStorage.setItem('token', session.accessToken)
  let removeListener: (() => void) | undefined
  const enterRequested = new Promise((resolve) => {
    removeListener = bridge.loadApi.onDataInitComplete(resolve)
  })
  try {
    if (await bridge.loadApi.isNeedInitData()) await enterRequested
    else await bridge.dbApi.updateDBData()
    await router.push('/main')
    await nextTick()
    await bridge.windowToolApi.resizeWindow('main')
  } finally {
    removeListener?.()
  }
}
