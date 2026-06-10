/**
 * IPC 注册模块 - 统一管理所有 IPC handler 的加载
 * 关键模块：同步加载（启动必需）
 * 非关键模块：延迟加载（用户交互时才触发）
 */

// 关键模块 - 启动时立即加载
import './userInfoStoreIPC.js'
import './windowToolIPC.js'
import './websocketIPC.js'
import './DBIPC.js'
import './initDataIPC.js'
import './piniaStoreIPC.js'
import './chatToolIPC.js'

// 非关键模块 - 延迟加载（窗口创建后空闲时加载）
export function loadDeferredIPC() {
  import('./newWindowIPC.js')
  import('./updateNewDataIPC.js')
  import('./uploadFileIPC.js')
  import('./mediaHandleIPC.js')
}
