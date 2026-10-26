<template>
  <section class="chat-welcome">
    <div class="welcome-content">
      <header class="welcome-header">
        <span class="welcome-brand"><i></i> EASYCHAT</span>
        <span>{{ dateLabel }}</span>
      </header>

      <div class="welcome-hero">
        <div class="welcome-copy">
          <p class="welcome-greeting">{{ greeting }}{{ userName ? `，${userName}` : '' }}</p>
          <h1>让每一次连接，<br>都多一点温度。</h1>
          <p class="welcome-description">对话、灵感与生活的片段，在这里相遇。<br>从左侧开始，留下属于你的每一刻。</p>
        </div>
        <div class="welcome-art" aria-hidden="true">
          <div class="art-orbit"></div>
          <div class="art-glass">IM</div>
          <span class="art-dot"></span>
          <span class="art-caption">很高兴，在这里遇见你</span>
        </div>
      </div>

      <div class="welcome-theme" aria-label="外观主题">
        <span>选择你喜欢的光线</span>
        <div class="theme-options">
          <button :class="{ active: theme === 'light' }" :aria-pressed="theme === 'light'" :disabled="switching"
            @click="setTheme('light')"><el-icon><Sunny /></el-icon>晴空 · 亮色</button>
          <button :class="{ active: theme === 'dark' }" :aria-pressed="theme === 'dark'" :disabled="switching"
            @click="setTheme('dark')"><el-icon><Moon /></el-icon>夜空 · 暗色</button>
        </div>
      </div>
      <footer><span class="shortcut-key">Alt + Shift + A</span> 随时截图，分享眼前的精彩</footer>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Sunny, Moon } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const userName = ref('')
const theme = ref<'light' | 'dark'>(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
const switching = ref(false)
const removeThemeListener = (window as any).themeApi.onThemeChanged((value: 'light' | 'dark') => { theme.value = value })
onMounted(async () => {
  userName.value = await (window as any).userInfoApi.storeGetUserInfo('username') || ''
  theme.value = await (window as any).themeApi.getTheme()
})
onUnmounted(removeThemeListener)
const setTheme = async (value: 'light' | 'dark') => {
  if (switching.value || theme.value === value) return
  switching.value = true
  try { theme.value = await (window as any).themeApi.setTheme(value) }
  catch { ElMessage.error('切换主题失败，请重试') }
  finally { switching.value = false }
}
const now = new Date()
const greeting = now.getHours() < 11 ? '上午好' : now.getHours() < 14 ? '中午好' : now.getHours() < 18 ? '下午好' : '晚上好'
const dateLabel = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now)
</script>

<style scoped>
.chat-welcome {
  position: relative;
  isolation: isolate;
  height: 100%;
  overflow: auto;
  padding: 48px 38px 28px;
  color: var(--color-text-primary);
  background: var(--color-welcome-surface);
  backdrop-filter: blur(22px);
  -webkit-app-region: drag;
}
.chat-welcome::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at 82% 22%, rgba(var(--color-accent-rgb), .16), transparent 48%), radial-gradient(ellipse at 14% 78%, rgba(var(--color-accent-rgb), .08), transparent 42%);
  opacity: .55;
  animation: welcome-light 12s ease-in-out infinite alternate;
}
.welcome-content { position: relative; z-index: 1; max-width: 860px; margin: 0 auto; }
.welcome-header, .welcome-copy, .welcome-theme, footer { animation: welcome-reveal .8s ease-out both; }
.welcome-copy { animation-delay: .08s; }
.welcome-theme { animation-delay: .18s; }
footer { animation-delay: .26s; }
.welcome-header { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--color-text-secondary); }
.welcome-brand { display: flex; align-items: center; gap: 8px; letter-spacing: 3px; font-size: 10px; font-weight: 650; }
.welcome-brand i { width: 7px; height: 7px; background: var(--color-accent); border-radius: 50%; box-shadow: 0 0 0 4px rgba(var(--color-accent-rgb), .1); }
.welcome-hero { display: grid; grid-template-columns: 1fr 190px; align-items: center; gap: 12px; padding: 44px 0 30px; }
.welcome-greeting { margin-bottom: 14px; color: var(--color-text-secondary); font-size: 13px; }
h1 { color: var(--color-text-strong); font-size: clamp(26px, 3vw, 38px); font-weight: 600; line-height: 1.5; letter-spacing: 1px; }
.welcome-description { margin-top: 18px; color: var(--color-text-secondary); line-height: 1.9; font-size: 13px; }
.welcome-art { position: relative; isolation: isolate; display: grid; place-items: center; height: 200px; pointer-events: none; }
.welcome-art::before { content: ''; position: absolute; inset: 10px -8px; z-index: -1; background: radial-gradient(ellipse, rgba(var(--color-accent-rgb), .2), transparent 68%); animation: welcome-glow 8s ease-in-out infinite alternate; }
.art-glass { position: relative; overflow: hidden; display: grid; place-items: center; width: 130px; height: 130px; padding-right: 12px; color: var(--color-text-accent); font: italic 600 67px 'Segoe UI', sans-serif; letter-spacing: -10px; background: linear-gradient(145deg, var(--color-surface-3), var(--color-surface-1)); border: 1px solid #ffffff80; border-radius: 32px; box-shadow: 0 18px 35px #397baa18, inset 0 1px 0 #ffffffaa; transform: rotate(-9deg); animation: welcome-float 7s ease-in-out infinite; }
.art-glass::after { content: ''; position: absolute; inset: -50% auto -50% 0; width: 45%; opacity: 0; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .3), transparent); transform: translateX(-180%) skewX(-18deg); animation: welcome-sheen 11s ease-in-out infinite; }
.art-orbit { position: absolute; width: 182px; height: 182px; border: 1px solid rgba(var(--color-accent-rgb), .22); border-radius: 50%; transform: rotate(-25deg) scaleY(.68); animation: welcome-orbit 14s ease-in-out infinite alternate; }
.art-dot { position: absolute; top: 40px; right: 10px; width: 12px; height: 12px; border: 3px solid #dcf0fc; background: #5b9fcb; border-radius: 50%; box-shadow: var(--shadow-sm); animation: welcome-dot 7s ease-in-out infinite; }
.art-caption { position: absolute; bottom: -9px; color: var(--color-text-muted); font-size: 10px; letter-spacing: 1px; }
.welcome-theme { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px; margin-top: 34px; padding-top: 26px; border-top: 1px solid var(--color-border-subtle); }
.welcome-theme > span { color: var(--color-text-secondary); font-size: 12px; }
.theme-options { display: flex; gap: 5px; padding: 5px; background: var(--color-surface-1); border: 1px solid var(--color-border-subtle); border-radius: 12px; -webkit-app-region: no-drag; }
.theme-options button { display: flex; align-items: center; gap: 8px; padding: 10px 15px; color: var(--color-text-secondary); border-radius: 8px; font: inherit; font-size: 12px; cursor: pointer; transition: background var(--transition-fast), color var(--transition-fast); }
.theme-options button:hover { background: var(--color-surface-2); }
.theme-options button.active { color: var(--color-text-accent); background: var(--color-surface-3); box-shadow: var(--shadow-sm); }
.theme-options button:disabled { cursor: wait; }
footer { display: flex; align-items: center; gap: 8px; margin-top: 32px; color: var(--color-text-muted); font-size: 10px; }
.shortcut-key { padding: 2px 6px; border: 1px solid var(--color-border-subtle); border-radius: 4px; font-size: 9px; }
@keyframes welcome-reveal { from { opacity: 0; } to { opacity: 1; } }
@keyframes welcome-light { from { opacity: .35; } to { opacity: .9; } }
@keyframes welcome-glow { from { opacity: .45; transform: scale(.92); } to { opacity: .85; transform: scale(1.08); } }
@keyframes welcome-float {
  0%, 100% { transform: translateY(0) rotate(-9deg); }
  50% { transform: translateY(-9px) rotate(-5deg); }
}
@keyframes welcome-orbit { from { transform: rotate(-25deg) scaleY(.68); } to { transform: rotate(-10deg) scaleY(.76); } }
@keyframes welcome-dot { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-4px, 8px); } }
@keyframes welcome-sheen {
  0%, 65% { transform: translateX(-180%) skewX(-18deg); opacity: 0; }
  70% { opacity: .65; }
  86%, 100% { transform: translateX(360%) skewX(-18deg); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .chat-welcome::before, .welcome-art::before, .art-glass, .art-glass::after,
  .art-orbit, .art-dot, .welcome-header, .welcome-copy, .welcome-theme, footer { animation: none; }
}
@media (max-width: 1000px) {
  .chat-welcome { padding: 42px 24px 24px; }
  .welcome-hero { grid-template-columns: 1fr 150px; }
  .welcome-art { transform: scale(.85); }
}
@media (max-height: 650px) {
  .welcome-hero { padding-top: 24px; padding-bottom: 20px; }

}
</style>
