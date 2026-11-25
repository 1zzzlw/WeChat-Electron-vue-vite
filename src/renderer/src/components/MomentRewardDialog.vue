<template>
  <el-dialog
    :model-value="modelValue"
    title="打赏作者"
    width="min(360px, calc(100% - 32px))"
    append-to-body
    :show-close="!submitting"
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="moment-reward-form" class="reward-form" @submit.prevent="submit">
      <div class="reward-presets">
        <button
          v-for="preset in [1, 5, 10, 20, 50]"
          :key="preset"
          type="button"
          :aria-pressed="Number(amount) === preset"
          :disabled="submitting"
          @click="amount = String(preset)"
        >¥{{ preset }}</button>
      </div>
      <label for="moment-reward-amount">打赏金额（元）</label>
      <el-input
        id="moment-reward-amount"
        v-model="amount"
        inputmode="decimal"
        placeholder="0.01–200"
        :disabled="submitting"
      />
      <span v-if="error" class="reward-error" role="alert">{{ error }}</span>
    </form>
    <template #footer>
      <el-button :disabled="submitting" @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" native-type="submit" form="moment-reward-form" :loading="submitting" :disabled="submitting">
        确认打赏
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { rewardApi } from '@/api/Moments'

const props = defineProps<{ modelValue: boolean; postId: string | number }>()
const emit = defineEmits<{ 'update:modelValue': [visible: boolean] }>()
const amount = ref('')
const error = ref('')
const submitting = ref(false)

watch(() => props.modelValue, visible => {
  if (visible) {
    amount.value = ''
    error.value = ''
  }
})
watch(amount, () => { error.value = '' })

async function submit() {
  if (submitting.value) return
  const value = amount.value.trim()
  const yuan = Number(value)
  if (!/^(?:\d+|\d*\.\d{1,2})$/.test(value) || yuan < 0.01 || yuan > 200) {
    error.value = '请输入 ¥0.01 到 ¥200 的金额，最多两位小数'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const result = await rewardApi(String(props.postId), yuan.toFixed(2))
    if (result.code !== 1) {
      error.value = result.msg || '打赏请求未受理'
      return
    }
    ElMessage.success('打赏请求已提交，可在钱包查看扣款记录')
    emit('update:modelValue', false)
  } catch {
    error.value = '暂时无法确认提交结果，请先查看钱包记录'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.reward-form {
  display: grid;
  gap: var(--spacing-sm);
  color: var(--color-text-primary);
}

.reward-presets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.reward-presets button {
  padding: 6px 10px;
  color: var(--color-text-primary);
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
}

.reward-presets button:enabled:hover,
.reward-presets button[aria-pressed='true'] {
  color: var(--color-text-accent);
  background: var(--color-accent-soft);
  border-color: var(--color-border-hover);
}

.reward-error {
  color: var(--color-danger);
  font-size: 12px;
}
</style>
