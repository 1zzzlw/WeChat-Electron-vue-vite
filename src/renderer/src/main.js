import { createApp } from 'vue'
import router from './router/router.js'
import App from './App.vue'
import pinia from './stores/index.ts'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import './assets/main.css'

const app = createApp(App)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 把 Vue 应用挂载到 HTML 中的 <div id="app"> 上
// 此时 App 组件的内容会替换 <div id="app">，并渲染到页面
app.mount('#app')