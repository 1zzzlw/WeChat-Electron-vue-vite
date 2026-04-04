import { join } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue' // 让 Vite 支持 Vue 单文件组件

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['electron-store'] // 排除 electron-store，把它打包进主进程
      })
    ],
    build: {
      rollupOptions: {
        input: {
          index: join(__dirname, 'src/main/index.js'),
          worker: join(__dirname, 'src/main/File/worker.js')
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'worker') {
              return 'File/[name].js'
            }
            return '[name].js'
          }
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    // 构建项目的静态资源路径 - 你的 HTML 文件在 public 目录
    publicDir: join(__dirname, 'public'),
    resolve: {
      alias: {
        '@': join(__dirname, 'src/renderer/src')
      }
    },
    // 启用 Vue 插件，支持 .vue 文件
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: 'http://47.111.22.183:81',
          // 设置为 false 表示代理请求使用 HTTP 协议，true 则使用 HTTPS 协议
          secure: false,
          // 设置为 true 可以解决因跨域时 Origin 不一致导致的访问被拒绝问题
          changeOrigin: true,
          // 路径重写规则，将api替换成空字符串
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      },
      headers: {
        // 服务端返回 CSP 响应头，无多余空格、格式严格
        'Content-Security-Policy':
          "default-src 'self'; " +
          "script-src 'self'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: blob: file: *; " +
          "media-src 'self' blob: data: file: *; " +
          "connect-src 'self' ws://localhost:80 ws://zzz.im.com:80 http://localhost:81 http://zzz.im.com:81 http://47.111.22.183:9000;"
      }
    }
  }
})
