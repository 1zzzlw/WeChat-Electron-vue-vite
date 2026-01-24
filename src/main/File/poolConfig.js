import path from 'path'
import Piscina from 'piscina'
import os from 'os'

const THREAD_NUMBER = os.cpus().length

const pool = new Piscina({
    filename: path.join(process.cwd(), 'src/main/File/worker.js'),
    minThreads: Math.max(1, Math.floor(THREAD_NUMBER)),
    maxThreads: os.cpus().length,

    // 队列配置
    maxQueue: 'auto',        // 自动计算合适的队列大小
    queueOptions: {          // 自定义队列选项
        // 并发数
        concurrency: 1,
        // 任务执行超过30秒会被强制终止
        timeout: 30000
    },

    // 性能配置
    idleTimeout: 30000,                    // 当一个 worker 线程空闲超过 30 秒时，会被自动销毁
    concurrentTasksPerWorker: 1,           // 每个Worker并发任务数

    // 资源限制
    resourceLimits: {
        maxOldGenerationSizeMb: 200,       // 老生代内存限制，防止单个 worker 消耗过多内存
        maxYoungGenerationSizeMb: 100,      // 新生代内存限制
        codeRangeSizeMb: 10                // 代码范围内存限制
    },
})

export {
    THREAD_NUMBER,
    pool
}