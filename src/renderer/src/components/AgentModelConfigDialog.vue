<template>
  <Teleport to="body">
    <Transition name="model-dialog-fade">
      <div v-if="modelValue" class="model-dialog-mask" role="presentation" @mousedown.self="handleClose">
        <section class="model-config-dialog" role="dialog" aria-modal="true" aria-labelledby="model-config-title">
          <header class="model-dialog-header">
            <div class="model-dialog-title">
              <span class="model-dialog-icon"><el-icon><Cpu /></el-icon></span>
              <div>
                <span>MODEL PROVIDER</span>
                <h2 id="model-config-title">{{ isEditing ? '编辑大模型' : '添加大模型' }}</h2>
              </div>
            </div>
            <button type="button" aria-label="关闭模型配置" @click="handleClose">
              <el-icon><Close /></el-icon>
            </button>
          </header>

          <form class="model-config-form" @submit.prevent="handleSubmit">
            <p class="model-form-description">
              配置一个可供 Agent 使用的模型。模型信息会保存到服务端，API Key 仅在当前页面会话中使用。
            </p>

            <label class="model-form-field">
              <span class="model-field-label">
                <strong>配置名称</strong>
                <small>用于在模型列表中识别该配置</small>
              </span>
              <input v-model="form.configName" type="text" placeholder="例如：我的 DeepSeek" autocomplete="off" />
            </label>

            <label class="model-form-field">
              <span class="model-field-label">
                <strong>提供商名称</strong>
                <small>用于区分模型服务来源</small>
              </span>
              <select v-model="form.providerName">
                <option v-for="provider in providerOptions" :key="provider.value" :value="provider.value">
                  {{ provider.label }}
                </option>
              </select>
            </label>

            <label class="model-form-field">
              <span class="model-field-label">
                <strong>大模型名称</strong>
                <small>填写服务端实际调用的模型标识</small>
              </span>
              <input v-model="form.modelName" type="text" placeholder="例如：gpt-5" autocomplete="off" />
            </label>

            <label v-if="form.providerName === 'custom'" class="model-form-field">
              <span class="model-field-label">
                <strong>Base URL</strong>
                <small>自定义 OpenAI 兼容服务的接口地址</small>
              </span>
              <input v-model="form.baseUrl" type="url" placeholder="例如：https://example.com/v1" autocomplete="off" />
            </label>

            <label class="model-form-field">
              <span class="model-field-label">
                <strong>API Key</strong>
                <small>不会保存到模型配置数据库</small>
              </span>
              <input v-model="form.apiKey" type="password" placeholder="输入模型服务 API Key" autocomplete="new-password" />
            </label>

            <label class="model-form-field">
              <span class="model-field-label">
                <strong>模型温度</strong>
                <small>数值越大，回答越有随机性</small>
              </span>
              <span class="model-temperature-stepper">
                <button type="button" aria-label="降低模型温度" @click="adjustTemperature(-0.1)">−</button>
                <input v-model.number="form.modelTemperature" type="number" min="0" max="2" step="0.1" />
                <button type="button" aria-label="提高模型温度" @click="adjustTemperature(0.1)">+</button>
              </span>
            </label>

            <div class="model-form-notice">
              <el-icon><Lock /></el-icon>
              <span>关闭或刷新页面后，自定义模型的 API Key 需要重新填写。</span>
            </div>

            <footer class="model-dialog-footer">
              <button class="model-cancel-button" type="button" @click="handleClose">取消</button>
              <button class="model-submit-button" type="submit" :disabled="!canSubmit">
                {{ isEditing ? '保存修改' : '添加模型' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, watch, type PropType } from 'vue'
import { Close, Cpu, Lock } from '@element-plus/icons-vue'
import type { AgentModelConfig } from '@/types'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  config: {
    type: Object as PropType<AgentModelConfig | null>,
    default: null
  }
})

const emit = defineEmits({
  'update:modelValue': (value: boolean) => typeof value === 'boolean',
  submit: (config: AgentModelConfig) => Boolean(config)
})

const form = reactive<AgentModelConfig>({
  configName: '',
  providerName: 'openai',
  modelName: '',
  baseUrl: '',
  apiKey: '',
  modelTemperature: 1
})

const providerOptions = [
  { value: 'openai', label: 'OpenAI（服务端预置）' },
  { value: 'deepseek', label: 'DeepSeek（服务端预置）' },
  { value: 'mimo', label: '小米 MiMo（服务端预置）' },
  { value: 'ollama:local', label: 'Ollama 本地（服务端预置）' },
  { value: 'ollama', label: 'Ollama 云端（服务端预置）' },
  { value: 'custom', label: '自定义（OpenAI 兼容）' }
]

const isEditing = computed(() => props.config !== null)

const canSubmit = computed(() => {
  return Boolean(
    form.configName.trim()
    && form.providerName
    && form.modelName.trim()
    && (form.providerName !== 'custom' || form.baseUrl.trim())
  )
})

watch(
  [() => props.modelValue, () => props.config],
  ([visible]) => {
    if (!visible) return
    form.configName = props.config?.configName ?? ''
    form.providerName = props.config?.providerName ?? 'openai'
    form.modelName = props.config?.modelName ?? ''
    form.baseUrl = props.config?.baseUrl ?? ''
    form.apiKey = props.config?.apiKey ?? ''
    form.modelTemperature = props.config?.modelTemperature ?? 1
  }
)

const adjustTemperature = (amount: number) => {
  const value = Number(form.modelTemperature) || 0
  form.modelTemperature = Number(Math.min(2, Math.max(0, value + amount)).toFixed(1))
}

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleSubmit = () => {
  if (!canSubmit.value) return
  emit('submit', {
    ...form,
    configName: form.configName.trim(),
    providerName: form.providerName.trim().toLowerCase(),
    modelName: form.modelName.trim(),
    baseUrl: form.providerName === 'custom' ? form.baseUrl.trim() : '',
    apiKey: form.apiKey.trim()
  })
  handleClose()
}
</script>

<style scoped>
.model-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 4300;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(8, 13, 20, 0.56);
  backdrop-filter: blur(8px);
}

.model-config-dialog {
  box-sizing: border-box;
  width: min(560px, calc(100vw - 40px));
  overflow: hidden;
  color: rgba(242, 247, 251, 0.92);
  background: rgba(48, 59, 73, 0.985);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 14px;
  box-shadow: 0 30px 90px rgba(4, 8, 13, 0.5), inset 0 1px rgba(255, 255, 255, 0.035);
}

.model-dialog-header {
  display: flex;
  min-height: 76px;
  align-items: center;
  justify-content: space-between;
  padding: 15px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.075);
}

.model-dialog-title {
  display: flex;
  align-items: center;
  gap: 11px;
}

.model-dialog-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: rgba(174, 182, 193, 0.86);
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 9px;
}

.model-dialog-title > div {
  display: flex;
  flex-direction: column;
}

.model-dialog-title span:not(.model-dialog-icon) {
  color: rgba(174, 182, 193, 0.48);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.14em;
}

.model-dialog-title h2 {
  margin-top: 3px;
  font-size: 16px;
  font-weight: 580;
}

.model-dialog-header > button {
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  color: rgba(218, 226, 236, 0.48);
  font-size: 14px;
  background: transparent;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
}

.model-dialog-header > button:hover {
  color: rgba(247, 250, 253, 0.94);
  background: rgba(255, 255, 255, 0.07);
}

.model-config-form {
  padding: 18px;
}

.model-form-description {
  margin-bottom: 17px;
  color: rgba(211, 220, 231, 0.56);
  font-size: 11px;
  line-height: 1.65;
}

.model-form-field {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.model-field-label {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.model-field-label strong {
  font-size: 11px;
  font-weight: 520;
}

.model-field-label small {
  margin-top: 4px;
  color: rgba(202, 211, 224, 0.38);
  font-size: 8px;
  line-height: 1.45;
}

.model-form-field input,
.model-form-field select {
  box-sizing: border-box;
  width: 100%;
  height: 38px;
  padding: 0 11px;
  color: rgba(247, 250, 253, 0.9);
  font: inherit;
  font-size: 11px;
  background: rgba(24, 31, 41, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 8px;
  outline: 0;
  user-select: text;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
}

.model-form-field input:focus,
.model-form-field select:focus {
  background: rgba(24, 31, 41, 0.72);
  border-color: rgba(174, 182, 193, 0.34);
  box-shadow: 0 0 0 3px rgba(174, 182, 193, 0.055);
}

.model-form-field input::placeholder {
  color: rgba(202, 211, 224, 0.31);
}

.model-form-field select option {
  color: #e9eef5;
  background: #293440;
}

.model-temperature-stepper {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 34px;
  overflow: hidden;
  background: rgba(24, 31, 41, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 8px;
}

.model-temperature-stepper button {
  color: rgba(235, 241, 248, 0.78);
  font: inherit;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 0;
  cursor: pointer;
}

.model-temperature-stepper button:hover {
  color: #7ceaf4;
  background: rgba(111, 228, 239, 0.09);
}

.model-temperature-stepper input {
  height: 36px;
  padding: 0 8px;
  text-align: center;
  background: transparent;
  border: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0;
  box-shadow: none;
  appearance: textfield;
}

.model-temperature-stepper input::-webkit-inner-spin-button,
.model-temperature-stepper input::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.model-form-notice {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 14px;
  padding: 9px 10px;
  color: rgba(202, 211, 224, 0.44);
  font-size: 9px;
  background: rgba(255, 255, 255, 0.035);
  border-radius: 7px;
}

.model-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin: 18px -18px -18px;
  padding: 13px 18px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.075);
}

.model-dialog-footer button {
  height: 32px;
  padding: 0 14px;
  font: inherit;
  font-size: 10px;
  font-weight: 400;
  border-radius: 7px;
  cursor: pointer;
}

.model-cancel-button {
  color: rgba(228, 235, 243, 0.64);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.model-cancel-button:hover {
  color: rgba(248, 251, 254, 0.92);
  background: rgba(255, 255, 255, 0.055);
}

.model-submit-button {
  color: rgba(245, 248, 251, 0.92);
  background: rgba(112, 122, 136, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.model-submit-button:hover {
  background: rgba(128, 139, 153, 0.82);
}

.model-submit-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.model-dialog-fade-enter-active,
.model-dialog-fade-leave-active {
  transition: opacity 0.16s ease;
}

.model-dialog-fade-enter-active .model-config-dialog,
.model-dialog-fade-leave-active .model-config-dialog {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.model-dialog-fade-enter-from,
.model-dialog-fade-leave-to {
  opacity: 0;
}

.model-dialog-fade-enter-from .model-config-dialog,
.model-dialog-fade-leave-to .model-config-dialog {
  opacity: 0;
  transform: translateY(6px) scale(0.985);
}

@media (max-width: 620px) {
  .model-form-field {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
