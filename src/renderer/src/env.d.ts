/// <reference types="vite/client" />

// 声明 .vue 单文件组件模块
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

// 兼容项目中的 .js 文件导入（JS/TS 混用过渡期）
// TypeScript 严格模式下导入 .js 文件需要类型声明
declare module '*.js' {
  const mod: any
  export default mod
}

// 无类型声明的第三方库
declare module 'masonry-layout' {
  const Masonry: any
  export default Masonry
}
