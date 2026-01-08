import { join } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['electron-store']
      })
    ]
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
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          secure: false,
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
          "img-src 'self' data: blob: file:; " +
          "media-src 'self' blob: data: file:; " +
          "connect-src 'self' ws://localhost:8000;"
      }
    }
  }
})
