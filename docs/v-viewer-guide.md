# v-viewer 快速入门指南

## 安装

```bash
npm install v-viewer viewerjs
```

## 使用方式

### 方式1：组件方式（推荐）

```vue
<template>
  <div>
    <viewer :images="images">
      <img v-for="src in images" :key="src" :src="src" style="width: 100px; margin: 5px;" />
    </viewer>
  </div>
</template>

<script setup>
import { component as Viewer } from 'v-viewer';
import 'viewerjs/dist/viewer.css';

const images = [
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg',
  'https://example.com/image3.jpg'
];
</script>
```

### 方式2：指令方式（需要全局注册）

**main.js 全局注册：**
```javascript
import { createApp } from 'vue';
import App from './App.vue';
import 'viewerjs/dist/viewer.css';
import VueViewer from 'v-viewer';

const app = createApp(App);
app.use(VueViewer);
app.mount('#app');
```

**组件中使用：**
```vue
<template>
  <div>
    <img v-viewer src="image1.jpg" />
    <img v-viewer src="image2.jpg" />
  </div>
</template>
```

### 方式3：API 方式（手动控制）

```vue
<template>
  <div>
    <img @click="showImage(0)" src="image1.jpg" style="width: 100px; cursor: pointer;" />
    <img @click="showImage(1)" src="image2.jpg" style="width: 100px; cursor: pointer;" />
  </div>
</template>

<script setup>
import { api as viewerApi } from 'v-viewer';
import 'viewerjs/dist/viewer.css';

const images = [
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg'
];

const showImage = (index) => {
  viewerApi({
    images: images,
    options: {
      initialViewIndex: index,  // 从第几张开始
      toolbar: true,            // 显示工具栏
      navbar: true,             // 显示缩略图导航
      title: true,              // 显示标题
      movable: true,            // 可拖动
      zoomable: true,           // 可缩放
      rotatable: true,          // 可旋转
      scalable: true,           // 可翻转
      transition: true,         // 使用过渡效果
      fullscreen: true,         // 可全屏
      keyboard: true            // 支持键盘操作
    }
  });
};
</script>
```

## 常用配置选项

```javascript
{
  // 初始显示第几张图片（从 0 开始）
  initialViewIndex: 0,
  
  // 是否显示工具栏
  toolbar: true,
  
  // 自定义工具栏按钮
  toolbar: {
    zoomIn: true,      // 放大
    zoomOut: true,     // 缩小
    oneToOne: true,    // 1:1 显示
    reset: true,       // 重置
    prev: true,        // 上一张
    play: false,       // 自动播放
    next: true,        // 下一张
    rotateLeft: true,  // 左旋转
    rotateRight: true, // 右旋转
    flipHorizontal: true, // 水平翻转
    flipVertical: true    // 垂直翻转
  },
  
  // 是否显示缩略图导航
  navbar: true,
  
  // 是否显示标题（图片名称）
  title: true,
  
  // 标题显示的内容
  title: (image, imageData) => {
    return `图片 ${imageData.index + 1} / ${imageData.length}`;
  },
  
  // 是否可拖动
  movable: true,
  
  // 是否可缩放
  zoomable: true,
  
  // 是否可旋转
  rotatable: true,
  
  // 是否可翻转
  scalable: true,
  
  // 是否使用过渡效果
  transition: true,
  
  // 是否可全屏
  fullscreen: true,
  
  // 是否支持键盘操作
  keyboard: true,
  
  // 背景颜色
  backdrop: true,
  
  // 点击背景是否关闭
  backdrop: 'static',  // 'static' 表示点击背景不关闭
  
  // 最小缩放比例
  minZoomRatio: 0.01,
  
  // 最大缩放比例
  maxZoomRatio: 100
}
```

## 事件监听

```vue
<template>
  <viewer 
    :images="images"
    @inited="onInited"
    @ready="onReady"
    @show="onShow"
    @shown="onShown"
    @hide="onHide"
    @hidden="onHidden"
    @view="onView"
    @viewed="onViewed"
    @zoom="onZoom"
    @zoomed="onZoomed"
  >
    <img v-for="src in images" :key="src" :src="src" />
  </viewer>
</template>

<script setup>
import { component as Viewer } from 'v-viewer';
import 'viewerjs/dist/viewer.css';

const images = ['image1.jpg', 'image2.jpg'];

const onInited = (viewer) => {
  console.log('初始化完成', viewer);
};

const onShow = () => {
  console.log('开始显示');
};

const onShown = () => {
  console.log('显示完成');
};

const onView = (e) => {
  console.log('切换到第', e.detail.index, '张图片');
};

const onZoom = (e) => {
  console.log('缩放比例', e.detail.ratio);
};
</script>
```

## 实际应用示例

### 聊天消息中的图片预览

```vue
<template>
  <div class="message-list">
    <div v-for="msg in messages" :key="msg.id" class="message">
      <div v-if="msg.type === 'image'">
        <viewer :images="[msg.content]">
          <img :src="msg.content" style="max-width: 200px; cursor: pointer;" />
        </viewer>
      </div>
      <div v-else>{{ msg.content }}</div>
    </div>
  </div>
</template>

<script setup>
import { component as Viewer } from 'v-viewer';
import 'viewerjs/dist/viewer.css';

const messages = [
  { id: 1, type: 'text', content: '你好' },
  { id: 2, type: 'image', content: 'https://example.com/image1.jpg' },
  { id: 3, type: 'image', content: 'https://example.com/image2.jpg' }
];
</script>
```

### 多张图片一起预览

```vue
<template>
  <div>
    <viewer :images="allImages">
      <div v-for="msg in imageMessages" :key="msg.id">
        <img :src="msg.content" style="width: 100px; margin: 5px; cursor: pointer;" />
      </div>
    </viewer>
  </div>
</template>

<script setup>
import { component as Viewer } from 'v-viewer';
import 'viewerjs/dist/viewer.css';
import { computed } from 'vue';

const imageMessages = [
  { id: 1, content: 'image1.jpg' },
  { id: 2, content: 'image2.jpg' },
  { id: 3, content: 'image3.jpg' }
];

const allImages = computed(() => {
  return imageMessages.map(msg => msg.content);
});
</script>
```

## 键盘快捷键

- `←` / `→` : 上一张 / 下一张
- `Ctrl + 滚轮` : 缩放
- `Esc` : 关闭预览
- `Space` : 停止 / 开始自动播放

## 注意事项

1. 必须引入 CSS：`import 'viewerjs/dist/viewer.css'`
2. 图片必须设置宽高或 `max-width`，否则可能显示异常
3. 如果图片是动态加载的，需要在图片加载完成后再初始化 viewer
4. 本地图片路径要用绝对路径或正确的相对路径

## 官方文档

- v-viewer: https://github.com/mirari/v-viewer
- viewerjs: https://github.com/fengyuanchen/viewerjs
