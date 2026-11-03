<template>
  <section class="appearance-switcher" aria-label="界面外观">
      <div class="appearance-heading"><h2>界面风格</h2><span>让界面，适合你的节奏</span></div>
      <div class="style-options">
        <button v-for="style in styles" :key="style.id" class="style-option" :class="{ selected: uiStyle === style.id }"
          :aria-pressed="uiStyle === style.id" :disabled="switching" @click="setStyle(style.id)">
          <span class="style-preview" :class="style.id" aria-hidden="true">
            <i class="preview-nav"></i><span class="preview-content"><b>Aa<span>↗</span></b><i></i><i></i><em></em></span>
          </span>
          <span class="style-label"><strong>{{ style.name }}</strong><span>{{ uiStyle === style.id ? '已使用' : '使用此风格' }}</span></span>
          <span class="style-description">{{ style.description }}</span>
        </button>
      </div>
      <div class="appearance-theme"><span>主题模式</span><div class="theme-options">
        <button :class="{ active: theme === 'light' }" :aria-pressed="theme === 'light'" :disabled="switching" @click="setTheme('light')">
          <el-icon aria-hidden="true"><Sunny /></el-icon>亮色</button>
        <button :class="{ active: theme === 'dark' }" :aria-pressed="theme === 'dark'" :disabled="switching" @click="setTheme('dark')">
          <el-icon aria-hidden="true"><Moon /></el-icon>暗色</button>
      </div></div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Sunny, Moon } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const api = (window as any).themeApi
const theme = ref(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
const uiStyle = ref(document.documentElement.dataset.uiStyle === 'swiss' ? 'swiss' : 'ai-native')
const switching = ref(false)
const styles = [
  { id: 'ai-native', name: 'AI-Native UI', description: '轻盈留白 · 柔和层次 · 专注对话' },
  { id: 'swiss', name: '极简主义与瑞士风格', description: '理性网格 · 黑白对比 · 清晰秩序' }
]
const removeThemeListener = api.onThemeChanged((value: string) => { theme.value = value })
const removeStyleListener = api.onStyleChanged((value: string) => { uiStyle.value = value })
onMounted(async () => {
  const [savedTheme, savedStyle] = await Promise.all([api.getTheme(), api.getStyle()])
  theme.value = savedTheme
  uiStyle.value = savedStyle
})
onUnmounted(() => { removeThemeListener(); removeStyleListener() })

const setTheme = async (value: string) => {
  if (switching.value || theme.value === value) return
  switching.value = true
  try { theme.value = await api.setTheme(value) }
  catch { ElMessage.error('切换主题失败，请重试') }
  finally { switching.value = false }
}
const setStyle = async (value: string) => {
  if (switching.value || uiStyle.value === value) return
  switching.value = true
  try { uiStyle.value = await api.setStyle(value) }
  catch { ElMessage.error('切换界面失败，请重试') }
  finally { switching.value = false }
}
</script>

<style scoped>
.appearance-switcher { width: 100%; -webkit-app-region: no-drag; }
.appearance-heading, .appearance-theme { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.appearance-heading { margin-bottom: 16px; }
h2 { font-size: 16px; font-weight: 600; color: var(--color-text-strong); }
.appearance-heading > span, .style-description { color: var(--color-text-muted); font-size: 12px; }
.style-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
button { color: var(--color-text-primary); cursor: var(--cursor-pointer, pointer); font: inherit; }
.style-option { min-width: 0; padding: 12px; text-align: left; background: var(--color-bg-deep); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); transition: border-color var(--transition-fast), background var(--transition-fast); }
.style-option:hover, .style-option.selected { border-color: var(--color-accent); background: var(--color-accent-soft); }
.style-preview { display: flex; height: 88px; overflow: hidden; border: 1px solid var(--color-border-subtle); background: var(--color-app-bg); }
.preview-nav { width: 23%; border-right: 1px solid var(--color-border-subtle); background: var(--color-surface-2); }
.preview-content { flex: 1; padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
.preview-content b { display: flex; justify-content: space-between; font-size: 22px; line-height: 1.2; }
.preview-content i { width: 72%; height: 3px; background: var(--color-border-hover); }
.preview-content i + i { width: 48%; }
.preview-content em { height: 17px; margin-top: auto; background: var(--color-bg-deep); border: 1px solid var(--color-border-subtle); }
.ai-native { border-radius: 10px; }
.ai-native .preview-content b { color: var(--color-accent); }
.ai-native .preview-content em { border-radius: 12px; }
.swiss .preview-content b { font-weight: 800; letter-spacing: -1px; }
.swiss .preview-content em { border-color: var(--color-text-secondary); }
.style-label { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 8px; margin: 12px 0 4px; }
.style-label strong { font-size: 13px; font-weight: 600; }
.style-label > span { font-size: 11px; color: var(--color-accent); }
.appearance-theme { padding-top: 16px; font-size: 13px; }
.theme-options { display: flex; gap: 4px; padding: 4px; background: var(--color-surface-2); border-radius: var(--radius-md); }
.theme-options button { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid transparent; border-radius: var(--radius-sm); }
.theme-options .active { background: var(--color-bg-deep); border-color: var(--color-border-subtle); color: var(--color-accent); }
button:disabled { opacity: .55; cursor: var(--cursor-wait, wait); }
@media (max-width: 520px) { .appearance-heading > span { display: none; } .style-options { gap: 8px; } .style-description { display: block; } }
</style>
