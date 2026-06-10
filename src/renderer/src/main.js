import { createApp } from 'vue'
import router from './router/router'
import App from './App.vue'
import pinia from './stores/index'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/main.css'
import { setupGlobalErrorHandlers } from './utils/errorHandler'

const app = createApp(App)

// 注册全局错误处理（Vue errorHandler + window.onerror + unhandledrejection）
setupGlobalErrorHandlers(app)

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 把 Vue 应用挂载到 HTML 中的 <div id="app"> 上
// 此时 App 组件的内容会替换 <div id="app">，并渲染到页面
app.mount('#app')