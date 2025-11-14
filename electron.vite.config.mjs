import { resolve } from 'path'
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
    resolve: {
      alias: {
        '@': resolve('src/renderer/src')
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
      }
    }
  }
})
