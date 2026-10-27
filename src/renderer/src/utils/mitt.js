import mitt from 'mitt'

const emitter = mitt()
let isGlobalListenerRegistered = false

// Save original methods for internal use
const _emit = emitter.emit.bind(emitter)
const _on = emitter.on.bind(emitter)

// 当前窗口立即派发；主进程的 store 广播只发送给其他窗口，不会回送来源窗口。
emitter.emit = (eventName, payload = null) => {
    _emit(eventName, payload)

    // WS 已向各窗口分发通知，卡片只在本地显示；Vue 组件包含函数，不能转为 JSON 传输。
    if (eventName === 'addNotification') return

    if (window.piniaShareApi) {
        // 其余业务事件携带可序列化的数据，继续同步其他窗口。
        window.piniaShareApi.sendStoreInfo(
            '__events',
            JSON.stringify({ event: eventName, payload })
        )
    }
}

// Override on: register local listener AND global IPC listener (only once)
emitter.on = (eventName, callback) => {
    const unsub = _on(eventName, callback)

    // Register global IPC listener once to receive cross-window events
    if (!isGlobalListenerRegistered && window.piniaShareApi) {
        isGlobalListenerRegistered = true
        window.piniaShareApi.setStoreInfo((event, storeName, data) => {
            if (storeName === '__events') {
                try {
                    const { event: evt, payload } = JSON.parse(data)
                    // Use internal emit to avoid IPC re-broadcast loop
                    _emit(evt, payload)
                } catch (e) {
                    console.error('解析事件数据失败', e)
                }
            }
        })
    }

    return unsub
}

export default emitter
