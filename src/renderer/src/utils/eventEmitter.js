const listeners = {}
let isGlobalListenerRegistered = false

export const eventEmitter = {
    // 监听事件
    on(eventName, callback) {
        if (!listeners[eventName]) {
            listeners[eventName] = []
        }
        listeners[eventName].push(callback)

        // 注册全局 IPC 监听
        if (!isGlobalListenerRegistered) {
            isGlobalListenerRegistered = true
            window.piniaShareApi.setStoreInfo((event, storeName, data) => {
                // 使用特殊 store 名称 '__events' 区分事件和普通 store
                if (storeName === '__events') {
                    try {
                        const { event: evt, payload } = JSON.parse(data)
                        if (listeners[evt]) {
                            listeners[evt].forEach(cb => cb(payload))
                        }
                    } catch (e) {
                        console.error('解析事件数据失败', e)
                    }
                }
            })
        }

        // 返回取消监听函数
        return () => {
            const index = listeners[eventName]?.indexOf(callback)
            if (index > -1) {
                listeners[eventName].splice(index, 1)
            }
        }
    },

    // 发送事件
    emit(eventName, payload = null) {
        window.piniaShareApi.sendStoreInfo(
            '__events', // 专用事件通道名称
            JSON.stringify({ event: eventName, payload })
        )
    },

    // 移除监听
    off(eventName, callback) {
        if (!listeners[eventName]) return
        const index = listeners[eventName].indexOf(callback)
        if (index > -1) {
            listeners[eventName].splice(index, 1)
        }
    }
}