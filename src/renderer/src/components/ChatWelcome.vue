<template>
  <section class="chat-welcome">
    <div class="welcome-content">
      <header class="welcome-header"><span class="welcome-brand"><i></i> LUMINA</span></header>
      <div class="welcome-hero">
        <div class="welcome-copy">
          <p class="welcome-date">{{ dateLabel }}</p>
          <p class="welcome-greeting">{{ greeting }}{{ userName ? '，' + userName : '' }}</p>
          <p class="welcome-eyebrow">YOUR SPACE / 01</p>
          <h1>对话，<br>从这里开始<span>。</span></h1>
          <p class="welcome-description">把想法交给对话，把时间留给重要的人。<br>选择左侧会话，继续你的下一段连接。</p>
        </div>
        <div class="welcome-art" aria-hidden="true"><span class="art-index">01 — CONNECT</span><div class="art-mark">im<span>↗</span></div><div class="art-lines"><i></i><i></i><i></i></div><span class="art-caption">更少打扰，更多交流。</span></div>
      </div>
      <AppearanceSwitcher />
      <footer><span class="shortcut-key">Alt + Shift + A</span> 随时截图，分享眼前的精彩</footer>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppearanceSwitcher from '@/components/AppearanceSwitcher.vue'
const userName = ref('')
onMounted(async () => { userName.value = await (window as any).userInfoApi.storeGetUserInfo('username') || '' })
const now = new Date()
const greeting = now.getHours() < 11 ? '上午好' : now.getHours() < 14 ? '中午好' : now.getHours() < 18 ? '下午好' : '晚上好'
const dateLabel = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now)
</script>

<style scoped>
.chat-welcome { height: 100%; overflow: auto; padding: 28px clamp(24px, 4vw, 56px) 24px; color: var(--color-text-primary); background: var(--color-welcome-surface); -webkit-app-region: drag; }
.welcome-content { max-width: 880px; margin: 0 auto; }
.welcome-header { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--color-border-subtle); font-size: 11px; color: var(--color-text-muted); }
.welcome-brand { display: flex; align-items: center; gap: 8px; font-weight: 650; letter-spacing: 2px; }
.welcome-brand i { width: 7px; height: 7px; border-radius: 50%; background: var(--color-accent); }
.welcome-hero { display: grid; grid-template-columns: 1fr 180px; gap: 32px; align-items: center; padding: 20px 0; }
.welcome-date { margin-bottom: 6px; font-size: 11px; color: var(--color-text-muted); }
.welcome-greeting { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 10px; }
.welcome-eyebrow { font-size: 10px; letter-spacing: 2px; color: var(--color-text-muted); margin-bottom: 12px; }
h1 { font-size: clamp(30px, 3.8vw, 48px); font-weight: 600; line-height: 1.2; letter-spacing: -1px; color: var(--color-text-strong); }
h1 span { color: var(--color-accent); }
.welcome-description { margin-top: 16px; font-size: 13px; line-height: 1.9; color: var(--color-text-secondary); }
.welcome-art { display: flex; flex-direction: column; min-height: 230px; padding: 20px; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-xl); background: var(--color-surface-1); }
.art-index { font-size: 9px; letter-spacing: 1px; color: var(--color-text-muted); }
.art-mark { display: flex; align-items: baseline; justify-content: space-between; margin: 12px 0; font-size: 72px; font-weight: 600; line-height: 1.2; letter-spacing: -6px; color: var(--color-accent); }
.art-mark span { font-size: 34px; font-weight: 400; letter-spacing: 0; }
.art-lines { display: flex; flex-direction: column; gap: 7px; margin-bottom: 24px; }
.art-lines i { height: 3px; width: 85%; background: var(--color-border-subtle); }
.art-lines i:nth-child(2) { width: 65%; }
.art-lines i:nth-child(3) { width: 40%; }
.art-caption { margin-top: auto; font-size: 11px; color: var(--color-text-muted); }
footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-border-subtle); font-size: 11px; color: var(--color-text-muted); }
.shortcut-key { margin-right: 6px; font-variant-numeric: tabular-nums; color: var(--color-text-secondary); }
:global([data-ui-style='swiss'] .chat-welcome h1) { font-weight: 800; letter-spacing: -2px; }
:global([data-ui-style='swiss'] .chat-welcome .welcome-art) { border-color: var(--color-text-primary); }
@media (max-width: 720px) { .welcome-hero { grid-template-columns: 1fr; padding: 24px 0; } .welcome-art { display: none; } .chat-welcome { padding: 32px 24px 24px; } }
</style>
