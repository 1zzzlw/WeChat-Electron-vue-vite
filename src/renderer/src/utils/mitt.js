import mitt from 'mitt'

const emitter = mitt()
let isGlobalListenerRegistered = false

// Save original methods for internal use
const _emit = emitter.emit.bind(emitter)
const _on = emitter.on.bind(emitter)

// Override emit: broadcast via IPC (the IPC listener will fire local callbacks)
emitter.emit = (eventName, payload = null) => {
    if (window.piniaShareApi) {
        // Broadcast via IPC to all windows (including this one)
        window.piniaShareApi.sendStoreInfo(
            '__events',
            JSON.stringify({ event: eventName, payload })
        )
    } else {
        // Fallback: local emit only (when IPC is not available)
        _emit(eventName, payload)
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
