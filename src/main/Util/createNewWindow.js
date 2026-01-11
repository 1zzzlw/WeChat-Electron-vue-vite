import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import icon from '../../../resources/icon.png?asset'
import { is } from '@electron-toolkit/utils'

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
        setting: '/setting'
        // TODO 可以继续添加其他路由页面
    }
}

/**
 * 创建额外窗口的统一方法
 * @param {string} windowType - 窗口类型 ('capture', 'loading', 'friendAdd' 等)
 * @param {object} options - 窗口选项
 * @param {string} loadType - 加载类型 ('standalone': 独立的HTML文件，'vue'(默认): 渲染进程中的vue页面)
 * @returns {BrowserWindow} 创建的窗口实例
 */
export function createExtraWindow(windowType, options = {}, loadType = 'vue') {
    console.log(11 + windowType)
    const defaultOptions = {
        icon: icon,
        // 窗口创建后默认不显示
        show: false,
        // 固定窗口大小
        resizable: false,
        // 隐藏窗口默认的标题栏和边框
        frame: false,
        // 始终置顶
        alwaysOnTop: true,
        // 使窗口背景透明（窗口区域会显示桌面或下层窗口的内容）
        transparent: true,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            // 关闭网页安全限制（允许加载本地文件）
            webSecurity: false,
            nodeIntegration: true,
            // 默认上下文隔离开启
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

    window.on('ready-to-show', () => {
        window.show()
        window.setTitle('EasyChat')
    })

    // 控制窗口内链接打开行为
    window.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    return window
}

/**
 * 为窗口加载内容的统一方法
 * @param {BrowserWindow} window - Electron 窗口实例
 * @param {string} windowType - 窗口类型
 * @param {string} loadType - 加载类型 ('standalone': 独立的HTML文件，'vue'(默认): 渲染进程中的vue页面)
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
 * @param {string} windowType - 窗口类型 ('capture', 'loading', 'friendAdd' 等)
 * @param {string} loadType - 加载类型 ('standalone': 独立的HTML文件，'vue'(默认): 渲染进程中的vue页面)
 * @returns {object} 包含加载方法和路径的对象
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

        const filePath = isDev
            ? `public/${fileName}`  // 开发环境路径
            : `out/renderer/${fileName}`  // 生产环境路径

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
            const loadUrl = `file://${htmlPath}#${routePath}`
            return {
                method: 'loadURL',
                path: loadUrl,
                debug: `VUE Prod ${windowType}: ${loadUrl}`
            }
        }
    }
}
