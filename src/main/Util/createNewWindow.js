import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'

// 管理窗口的集合
const windowPool = new Map()

// 子窗口待发送数据缓存（解决懒加载组件来不及注册监听器的问题）
const pendingWindowData = new Map()

/**
 * 窗口加载器配置
 */
const WINDOW_CONFIGS = {
    // 独立 HTML 文件配置
    standalone: {
        capture: 'capture.html',
        loading: 'loading.html',
        // TODO 可以继续添加其他独立页面
    },
    // vue 路由页面配置
    vue: {
        friendAdd: '/friendAdd',
        createGroup: '/createGroup',
        setting: '/setting',
        imagePreview: '/imagePreview',
        videoPreview: '/videoPreview',
        createNote: '/createNote',
        createMomentView: '/createMomentView',
        momentInfoView: '/momentInfoView',
        standaloneChat: '/standaloneChat'
        // TODO 可以继续添加其他路由页面
    }
}

/**
 * 创建额外窗口的统一方法
 * @param windowType - 窗口类型 ('capture', 'loading', 'friendAdd' 等)
 * @param options - 窗口选项
 * @param loadType - 加载类型 ('standalone': 独立的HTML文件，'vue'(默认): 渲染进程中的vue页面)
 * @returns 创建的窗口实例
 */
function createExtraWindow(windowType, options = {}, loadType = 'vue', data) {
    console.log('打开', windowType)
    if (getWindow(windowType) != null) {
        console.log('该窗口已存在')
        return
    }

    // 动态获取 icon 路径
    const iconPath = app.isPackaged
        ? join(process.resourcesPath, 'icon.png')
        : join(__dirname, '../../../resources/icon.png')

    const defaultOptions = {
        icon: iconPath,
        // 窗口创建后默认不显示
        show: false,
        // 固定窗口大小
        resizable: false,
        // 隐藏窗口默认的标题栏和边框
        frame: false,
        // 始终置顶
        // alwaysOnTop: true,
        // 使窗口背景透明（窗口区域会显示桌面或下层窗口的内容）
        // transparent: true,
        // 设置父窗口
        backgroundColor: '#00000000',
        ...(process.platform === 'linux' ? { icon: iconPath } : {}),
        webPreferences: {
            webSecurity: false,
            nodeIntegration: true,
            contextIsolation: true,
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    }

    // 合并选项，后面的相同属性会覆盖前面的属性
    const finalOptions = Object.assign(defaultOptions, options)
    const window = new BrowserWindow(finalOptions)

    // 加载窗口内容
    loadWindowContent(window, windowType, loadType)

    // 加载超时保护：15 秒内窗口未能就绪则记录警告并关闭
    const loadTimeout = setTimeout(() => {
        console.warn(`窗口 ${windowType} 加载超时`)
        if (!window.isDestroyed()) {
            windowPool.delete(windowType)
            window.close()
        }
    }, 15000)

    window.on('ready-to-show', () => {
        clearTimeout(loadTimeout)
        window.show()
        window.setTitle('EasyChat')
    })

    window.on('closed', () => {
        clearTimeout(loadTimeout)
        windowPool.delete(windowType)
        pendingWindowData.delete(windowType)
    })

    if (data != undefined) {
        // 缓存数据，供懒加载组件挂载后主动拉取
        pendingWindowData.set(windowType, data)

        // 快速通道：组件如果已经挂载，show 时直接推送
        window.once('show', () => {
            if (!window.isDestroyed()) {
                console.log(data)
                window.webContents.send('newWindowInfo', data)
            }
        })
    }

    // 控制窗口内链接打开行为
    window.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    windowPool.set(windowType, window)

    return window
}

/**
 * 为窗口加载内容的统一方法
 * @param window - Electron 窗口实例
 * @param windowType - 窗口类型
 * @param loadType - 加载类型 ('standalone': 独立的HTML文件，'vue'(默认): 渲染进程中的vue页面)
 */
function loadWindowContent(window, windowType, loadType = 'vue') {
    // 获得新建窗口的配置内容
    const config = getWindowLoadConfig(windowType, loadType)

    console.log(config.debug)

    if (config.method === 'loadFile') {
        window.loadFile(config.path)
    } else {
        window.loadURL(config.path)
    }
}

/**
 * 获取窗口加载 URL 或文件路径
 * @param windowType - 窗口类型 ('capture', 'loading', 'friendAdd' 等)
 * @param loadType - 加载类型 ('standalone': 独立的HTML文件，'vue'(默认): 渲染进程中的vue页面)
 * @returns 包含加载方法和路径的对象
 */
function getWindowLoadConfig(windowType, loadType = 'vue') {
    const isDev = is.dev && process.env['ELECTRON_RENDERER_URL']

    if (loadType === 'standalone') {
        // 独立 HTML 文件加载
        const fileName = WINDOW_CONFIGS.standalone[windowType]

        if (!fileName) {
            // 如果配置中没有假如该文件报错
            throw new Error(`Unknown standalone window type: ${windowType}`)
        }

        // const filePath = isDev
        //     ? `public/${fileName}`  // 开发环境路径
        //     ? `out/renderer/${fileName}`  // 生产环境路径

        const filePath = isDev
            ? join(process.cwd(), 'public', fileName)
            : join(app.getAppPath(), 'out', 'renderer', fileName)

        return {
            method: 'loadFile',
            path: filePath,
            debug: `Standalone ${windowType}: ${filePath}`
        }
    } else {
        // vue 路由页面加载
        const routePath = WINDOW_CONFIGS.vue[windowType]

        if (!routePath) {
            // 如果配置中没有假如该文件报错
            throw new Error(`Unknown VUE window type: ${windowType}`)
        }

        if (isDev) {
            // 开发环境：加载开发服务器 URL + 路由
            const loadUrl = `${process.env['ELECTRON_RENDERER_URL']}#${routePath}`
            return {
                method: 'loadURL',
                path: loadUrl,
                debug: `VUE Dev ${windowType}: ${loadUrl}`
            }
        } else {
            // 生产环境：加载本地文件 + hash 路由
            const htmlPath = join(__dirname, '../renderer/index.html')
            const loadUrl = `${pathToFileURL(htmlPath).toString()}#${routePath}`
            return {
                method: 'loadURL',
                path: loadUrl,
                debug: `VUE Prod ${windowType}: ${loadUrl}`
            }
        }
    }
}

/**
 * 安全获取窗口实例，自动清理已销毁的过期条目
 * @param windowType - 窗口类型
 * @returns 窗口实例，若不存在或已销毁则返回 null
 */
function getWindow(windowType) {
    const win = windowPool.get(windowType)
    if (win && !win.isDestroyed()) return win
    windowPool.delete(windowType) // 清理过期条目
    return null
}

/**
 * IPC：懒加载的子窗口组件挂载完成后，主动拉取待发送数据
 * 解决路由懒加载导致 window.once('show') 发数据时组件尚未挂载的问题
 */
ipcMain.handle('window:getPendingData', (event) => {
    // 遍历缓存，找到数据所属的窗口
    for (const [type, data] of pendingWindowData) {
        const win = getWindow(type)
        if (win && win.webContents === event.sender) {
            pendingWindowData.delete(type)
            return data
        }
    }
    return null
})

export {
    createExtraWindow,
    getWindow,
    windowPool
}
