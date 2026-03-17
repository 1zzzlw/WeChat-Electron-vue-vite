import { PiniaPluginContext } from "pinia"

// 需要共享数据的pinia
const SHARED_STORES = ['aiMessageInfo', 'messageInfo', 'conversationInfo']

// 处理electron多窗口，pinia共享问题
export function shareStorePlugin({ store }: PiniaPluginContext) {
    // 不在白名单内的就不需要共享，直接跳过
    if (!SHARED_STORES.includes(store.$id)) return

    console.log(store.$id)

    let isPassiveUpdate = false;

    // 收到其他窗口的广播，更新自己
    (window as any).piniaShareApi.setStoreInfo((event: any, targetStoreName: string, data: string) => {
        if (store.$id === targetStoreName) {
            isPassiveUpdate = true
            store.$patch(JSON.parse(data))
        }
    })

    // 监听自己的变化，广播出去
    store.$subscribe(() => {
        console.log(2222114444411);
        if (isPassiveUpdate) {
            // 更新过了，直接跳过
            isPassiveUpdate = false
            return
        }
        (window as any).piniaShareApi.sendStoreInfo(store.$id, JSON.stringify(store.$state))
    })
}