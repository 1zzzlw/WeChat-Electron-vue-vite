// 创建一个【任务中止】的标准错误对象，用于取消任务时抛出
function createAbortError() {
    const err = new Error('Aborted')
    err.name = 'AbortError'
    return err
}

/**
 * 可控并发 + 限流的异步任务消息队列
 * 文件分片上传、接口请求限流、批量任务控制
 */
export class MessageQueue {
    /**
     * 构造函数：初始化队列配置
     * @param {Object} options - 配置项
     * @param {number} intervalMs - 任务执行间隔（毫秒），防止密集执行
     * @param {number} concurrency - 最大并发数（同时执行的任务数量）
     * @param {number} maxQueueSize - 队列最大容量，超出则报错
     * @param {boolean} autoStart - 是否自动启动队列（默认true）
     */
    constructor(options = {}) {
        const {
            intervalMs = 0,
            concurrency = 1,
            maxQueueSize = Infinity,
            autoStart = true
        } = options

        // 执行间隔，最小0
        this._intervalMs = Math.max(0, Number(intervalMs) || 0)
        // 最大并发，最小1
        this._concurrency = Math.max(1, Math.floor(Number(concurrency) || 1))
        // 队列最大长度，最多允许排队多少个分块上传任务
        this._maxQueueSize = Number.isFinite(maxQueueSize) ? Math.max(0, maxQueueSize) : Infinity

        // 待执行的任务队列
        this._pending = []
        // 当前正在执行的任务数量
        this._running = 0
        // 是否暂停队列
        this._paused = !autoStart
        // 定时器：用于控制任务执行间隔
        this._timer = null
        // 上一个任务开始执行的时间戳
        this._lastStartAt = 0
        // 等待【队列空闲】的回调列表
        this._idleWaiters = []
    }

    // 获取待执行任务数量
    get size() {
        return this._pending.length
    }

    // 获取正在执行的任务数量
    get running() {
        return this._running
    }

    // 获取队列是否暂停
    get paused() {
        return this._paused
    }

    enqueue(task, options = {}) {
        if (typeof task !== 'function') {
            return Promise.reject(new TypeError('task must be a function'))
        }

        if (this._pending.length >= this._maxQueueSize) {
            return Promise.reject(new Error('Queue overflow'))
        }

        const { signal, meta } = options

        return new Promise((resolve, reject) => {
            if (signal?.aborted) {
                reject(createAbortError())
                return
            }

            const item = { task, resolve, reject, signal, meta }
            this._pending.push(item)
            this._pump()
        })
    }

    pause() {
        this._paused = true
        this._clearTimer()
    }

    resume() {
        if (!this._paused) return
        this._paused = false
        this._pump()
    }

    clear(reason) {
        const err = reason instanceof Error ? reason : new Error(reason || 'Queue cleared')
        const items = this._pending.splice(0, this._pending.length)
        for (const item of items) {
            item.reject(err)
        }
        this._maybeResolveIdle()
    }

    onIdle() {
        if (this._pending.length === 0 && this._running === 0) {
            return Promise.resolve()
        }
        return new Promise((resolve) => {
            this._idleWaiters.push(resolve)
        })
    }

    _clearTimer() {
        if (this._timer) {
            clearTimeout(this._timer)
            this._timer = null
        }
    }

    _scheduleAfter(ms) {
        if (this._timer) return
        this._timer = setTimeout(() => {
            this._timer = null
            this._pump()
        }, Math.max(0, ms))
    }

    _maybeResolveIdle() {
        if (this._pending.length !== 0 || this._running !== 0) return
        const waiters = this._idleWaiters.splice(0, this._idleWaiters.length)
        for (const resolve of waiters) resolve()
    }

    /**
      * 调度器：控制任务执行（并发、间隔、启停）
      * 整个队列的大脑，负责：
      * 1. 判断是否可以执行新任务
      * 2. 控制并发数
      * 3. 控制任务间隔
      * 4. 执行任务/处理回调
    */
    _pump() {
        if (this._paused) return

        this._clearTimer()

        while (this._running < this._concurrency && this._pending.length > 0) {
            const now = Date.now()
            const waitMs = this._intervalMs > 0 ? this._intervalMs - (now - this._lastStartAt) : 0

            if (waitMs > 0) {
                this._scheduleAfter(waitMs)
                return
            }

            const item = this._pending.shift()
            if (!item) break

            if (item.signal?.aborted) {
                item.reject(createAbortError())
                continue
            }

            this._lastStartAt = Date.now()
            this._running += 1

            Promise.resolve()
                .then(() => item.task({ signal: item.signal, meta: item.meta }))
                .then(item.resolve, item.reject)
                .finally(() => {
                    this._running -= 1
                    this._pump()
                    this._maybeResolveIdle()
                })
        }

        this._maybeResolveIdle()
    }
}

