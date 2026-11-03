<template>
  <section class="agent-plan" :class="{ 'is-complete': allCompleted }" aria-label="任务执行计划">
    <button class="plan-toggle" type="button" :aria-expanded="expanded" aria-controls="agent-plan-tasks"
      :aria-label="expanded ? '收起执行计划' : '展开执行计划'" @click="expanded = !expanded">
      <span class="plan-symbol" aria-hidden="true">
        <el-icon v-if="allCompleted"><Check /></el-icon>
        <el-icon v-else><List /></el-icon>
      </span>
      <span class="plan-summary">
        <strong>任务计划</strong>
        <span class="plan-preview" :title="summary" aria-live="polite">{{ summary }}</span>
      </span>
      <span class="plan-count" :aria-label="`已完成 ${completedCount} 项，共 ${steps.length} 项`">
        {{ completedCount }}<span>/ {{ steps.length }}</span>
      </span>
      <el-icon class="plan-chevron" :class="{ 'is-expanded': expanded }" aria-hidden="true"><ArrowDown /></el-icon>
    </button>
    <div id="agent-plan-tasks" class="plan-reveal" :class="{ 'is-open': expanded }" :aria-hidden="!expanded" :inert="!expanded">
      <div class="plan-clip">
        <ol class="plan-steps">
          <li v-for="(step, index) in steps" :key="step.id" :class="['plan-step', `is-${step.status}`]">
            <span class="step-indicator" aria-hidden="true">
              <el-icon v-if="step.status === 'completed'"><Check /></el-icon>
              <el-icon v-else-if="step.status === 'running'" class="step-spinner"><Loading /></el-icon>
              <el-icon v-else-if="step.status === 'failed' || step.status === 'cancelled'"><Close /></el-icon>
              <span v-else>{{ index + 1 }}</span>
            </span>
            <span class="step-title">{{ step.title }}</span>
            <small>{{ statusLabels[step.status] }}</small>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowDown, Check, Close, List, Loading } from '@element-plus/icons-vue'
import type { AgentPlanStep, AgentPlanStepStatus } from '@/types'

const props = defineProps<{ steps: AgentPlanStep[] }>()
const expanded = ref(true)
const completedCount = computed(() => props.steps.filter((step) => step.status === 'completed').length)
const allCompleted = computed(() => props.steps.length > 0 && completedCount.value === props.steps.length)
const summary = computed(() => {
  if (allCompleted.value) return '全部任务已完成'
  const running = props.steps.find((step) => step.status === 'running')
  if (running) return running.title
  const failed = props.steps.find((step) => step.status === 'failed')
  if (failed) return `执行失败 · ${failed.title}`
  if (props.steps.some((step) => step.status === 'cancelled')) return '任务已停止'
  return props.steps.find((step) => step.status === 'pending')?.title ?? '等待执行'
})

// 完成后让出聊天空间，用户仍可手动展开查看执行结果。
watch(allCompleted, (completed) => {
  if (completed) expanded.value = false
}, { immediate: true })

const statusLabels: Record<AgentPlanStepStatus, string> = {
  pending: '未执行', running: '进行中', completed: '已完成', failed: '执行失败', cancelled: '已停止'
}
</script>

<style scoped>
.agent-plan {
  margin-bottom: 9px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(var(--color-surface-rgb), 0.96), rgba(var(--color-surface-rgb), 0.88));
  border: 1px solid rgba(var(--color-accent-rgb), 0.18);
  border-radius: 14px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(20px);
  -webkit-app-region: no-drag;
}

.plan-toggle {
  display: grid;
  width: 100%;
  grid-template-columns: 30px minmax(0, 1fr) auto 14px;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  color: var(--color-text-strong);
  font: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
  transition: background 0.18s ease;
}

.plan-toggle:hover {
  background: rgba(var(--color-accent-rgb), 0.05);
}

.plan-toggle:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -3px;
}

.plan-symbol {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: var(--color-accent);
  font-size: 15px;
  background: rgba(var(--color-accent-rgb), 0.09);
  border-radius: 9px;
}

.is-complete .plan-symbol {
  color: #51b88d;
  background: rgba(81, 184, 141, 0.12);
}

.plan-summary {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.plan-summary strong {
  font-size: 11px;
  font-weight: 600;
}

.plan-preview {
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-count {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.plan-count > span {
  margin-left: 3px;
  color: var(--color-text-muted);
  font-size: 10px;
}

.plan-chevron {
  color: var(--color-text-muted);
  font-size: 11px;
  transition: transform 0.22s ease;
}

.plan-chevron.is-expanded {
  transform: rotate(180deg);
}

.plan-reveal {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 0.22s ease, opacity 0.18s ease;
}

.plan-reveal.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.plan-clip {
  min-height: 0;
  overflow: hidden;
}

.plan-steps {
  display: grid;
  max-height: min(260px, 30vh);
  gap: 3px;
  margin: 0 12px;
  padding: 7px 0 10px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-top: 1px solid var(--color-border-subtle);
  list-style: none;
  scrollbar-width: thin;
  scrollbar-color: rgba(var(--color-accent-rgb), 0.22) transparent;
}

.plan-step {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: start;
  gap: 9px;
  padding: 6px 5px;
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 20px;
  border-radius: 7px;
  transition: background 0.2s ease;
}

.plan-step.is-running {
  background: rgba(var(--color-accent-rgb), 0.08);
}

.step-title {
  overflow-wrap: anywhere;
}

.plan-step small {
  color: var(--color-text-muted);
  font-size: 9px;
  white-space: nowrap;
}

.step-indicator {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  color: var(--color-text-muted);
  font-size: 10px;
  border: 1px solid var(--color-border-subtle);
  border-radius: 50%;
  box-sizing: border-box;
}

.is-completed .step-indicator {
  color: #51b88d;
  background: rgba(81, 184, 141, 0.12);
  border-color: rgba(81, 184, 141, 0.35);
}

.is-running .step-indicator {
  color: var(--color-accent);
  border-color: rgba(var(--color-accent-rgb), 0.35);
}

.is-failed .step-indicator {
  color: #ee6868;
  border-color: rgba(238, 104, 104, 0.35);
}

.is-cancelled .step-title {
  color: var(--color-text-muted);
}

.step-spinner {
  animation: plan-spin 1.2s linear infinite;
}

@keyframes plan-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .step-spinner { animation: none; }
  .plan-step, .plan-toggle, .plan-chevron, .plan-reveal { transition: none; }
}
</style>
