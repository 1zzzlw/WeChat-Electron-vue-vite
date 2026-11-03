<template>
  <div class="agent-workbench">
    <aside class="agent-sidebar" aria-label="AI 伙伴导航">
      <div class="sidebar-brand">
        <span class="brand-mark"
          ><el-icon><CompanionIcon /></el-icon
        ></span>
        <div><strong>IM Agent</strong><small>把日常留在对话里</small></div>
      </div>
      <div class="companion-card">
        <span class="companion-avatar" aria-hidden="true">AI</span>
        <strong>你的 AI 伙伴</strong>
        <span>从相识，慢慢了解彼此</span>
      </div>
      <nav class="companion-nav">
        <button
          v-for="item in navigation"
          :key="item.id"
          type="button"
          :aria-label="item.label"
          :class="{ 'is-active': activeTab === item.id }"
          :aria-current="activeTab === item.id ? 'page' : undefined"
          @click="activeTab = item.id"
        >
          <el-icon><component :is="item.icon" /></el-icon><span>{{ item.label }}</span
          ><span v-if="item.id === 'chat'" class="nav-marker" aria-hidden="true"></span>
        </button>
      </nav>
      <div class="sidebar-note">
        <span class="note-line"></span>
        <p>一个聊天窗口，<br />一段持续发生的相处。</p>
      </div>
      <button
        class="sidebar-settings"
        type="button"
        :aria-pressed="activeTab === 'settings'"
        @click="activeTab = 'settings'"
      >
        <el-icon><Setting /></el-icon>连接与设置
      </button>
    </aside>

    <section class="companion-main">
      <header class="companion-header">
        <div>
          <span class="section-caption">{{
            activeTab === 'chat' ? '日常对话' : activeTab === 'moments' ? '生活片段' : '偏好设置'
          }}</span>
          <h1>
            {{
              activeTab === 'chat'
                ? '你的 AI 伙伴'
                : activeTab === 'moments'
                  ? '朋友圈'
                  : '连接与设置'
            }}
          </h1>
        </div>
        <div v-if="activeTab === 'chat'" class="header-actions">
          <span class="connection-status" role="status"
            ><i :class="{ 'is-available': service?.available }"></i>{{ connectionLabel }}</span
          >
          <button
            type="button"
            class="icon-button"
            :aria-pressed="searchOpen"
            aria-label="搜索已加载的消息"
            title="搜索已加载的消息"
            @click="toggleSearch"
          >
            <el-icon><Search /></el-icon>
          </button>
          <button
            type="button"
            class="icon-button"
            disabled
            aria-label="语音通话暂未开放"
            title="语音通话暂未开放"
          >
            <el-icon><Phone /></el-icon>
          </button>
        </div>
      </header>

      <template v-if="activeTab === 'chat'">
        <div v-if="searchOpen" class="chat-search">
          <el-icon><Search /></el-icon
          ><input
            ref="searchInput"
            v-model="searchQuery"
            aria-label="搜索已加载的消息"
            placeholder="搜索已加载的消息"
            @keydown.esc="closeSearch"
          />
          <span>{{ filteredMessages.length }} 条</span
          ><button
            class="icon-button"
            type="button"
            aria-label="关闭搜索"
            @click="closeSearch"
          >
            <el-icon><Close /></el-icon>
          </button>
        </div>
        <main
          ref="thread"
          class="chat-content"
          :aria-busy="loading"
          aria-label="与 AI 伙伴的聊天记录"
        >
          <div v-if="messages.length === 0" class="conversation-welcome">
            <div class="welcome-symbol" aria-hidden="true">
              <el-icon><CompanionIcon /></el-icon><span></span>
            </div>
            <span class="section-caption">每一次了解，都从一句话开始</span>
            <h2>今天，有什么想聊的吗？</h2>
            <p>聊聊刚发生的小事，分享一个念头，<br />或者，只是来打声招呼。</p>
            <div class="conversation-starters">
              <button
                v-for="prompt in starters"
                :key="prompt"
                type="button"
                @click="chooseStarter(prompt)"
              >
                {{ prompt }}<el-icon><ArrowRight /></el-icon>
              </button>
            </div>
          </div>
          <div v-else class="message-thread">
            <p v-if="searchOpen && filteredMessages.length === 0" class="empty-search">
              没有找到匹配的消息
            </p>
            <template v-for="(message, index) in filteredMessages" :key="message.id">
              <div v-if="isNewDay(index)" class="day-divider">
                {{ formatDay(message.createdAt) }}
              </div>
              <article :class="['chat-message', { 'is-user': message.role === 'user' }]">
                <span class="message-avatar" aria-hidden="true">{{
                  message.role === 'user' ? '我' : 'AI'
                }}</span>
                <div class="message-column">
                  <div class="message-bubble">
                    {{ message.content
                    }}<span
                      v-if="message.status === 'streaming'"
                      class="streaming-cursor"
                      aria-hidden="true"
                    ></span>
                  </div>
                  <span class="message-time"
                    >{{ formatTime(message.createdAt)
                    }}<span v-if="message.status === 'failed'" class="send-failed"> · 未发送</span
                    ><span v-else-if="message.status === 'sending'"> · 发送中</span></span
                  >
                </div>
              </article>
            </template>
          </div>
        </main>
        <div class="composer-area">
          <div v-if="notice || service?.available === false" class="service-notice" role="status">
            <el-icon><InfoFilled /></el-icon
            ><span>{{ notice || '聊天服务暂未开放，你可以先设置模型连接，或留下想说的话。' }}</span>
            <button type="button" :disabled="loading || isSending" @click="loadPage">
              重新连接
            </button>
          </div>
          <form class="composer-shell" @submit.prevent="sendMessage">
            <div class="composer-toolbar">
              <div>
                <button
                  type="button"
                  class="icon-button"
                  disabled
                  aria-label="图片消息暂未开放"
                  title="图片消息暂未开放"
                >
                  <el-icon><Picture /></el-icon></button
                ><button
                  type="button"
                  class="icon-button"
                  disabled
                  aria-label="短语音暂未开放"
                  title="短语音暂未开放"
                >
                  <el-icon><Microphone /></el-icon>
                </button>
              </div>
              <button class="model-shortcut" type="button" @click="activeTab = 'settings'">
                <el-icon><Connection /></el-icon><span>{{ selectedModelOption.configName }}</span
                ><el-icon><ArrowRight /></el-icon>
              </button>
            </div>
            <label class="sr-only" for="companion-draft">发送给 AI 伙伴的消息</label>
            <textarea
              id="companion-draft"
              ref="composerInput"
              v-model="draft"
              rows="3"
              maxlength="10000"
              placeholder="想说的话，慢慢说…"
              @keydown="onComposerKeydown"
            ></textarea>
            <div class="composer-footer">
              <span>Enter 发送 <span class="shortcut-divider">/</span> Shift + Enter 换行</span
              ><button
                class="send-button"
                type="submit"
                :disabled="!canSend"
                :title="service?.available ? '发送消息' : '聊天服务暂不可用'"
              >
                <span>{{ isSending ? '发送中' : '发送' }}</span
                ><el-icon><ArrowUp /></el-icon>
              </button>
            </div>
          </form>
        </div>
      </template>

      <main v-else-if="activeTab === 'moments'" class="moments-content">
        <div class="moments-cover">
          <span class="section-caption">一些想分享的时刻</span>
          <h2>生活在聊天之外，<br />也会继续。</h2>
          <p>这里会留下伙伴愿意与你分享的日常。</p>
          <el-icon aria-hidden="true"><Picture /></el-icon>
        </div>
        <div class="section-empty">
          <el-icon aria-hidden="true"><Picture /></el-icon>
          <h3>朋友圈尚未开放</h3>
          <p>开放后，可以在这里看看动态，留下点赞和评论。</p>
        </div>
      </main>

      <main v-else class="settings-content">
        <section class="settings-section">
          <div class="settings-heading">
            <div>
              <span class="section-caption">模型连接</span>
              <h2>选择聊天使用的模型</h2>
              <p>切换模型不会重置人物、记忆或相处经历。</p>
            </div>
            <button
              class="secondary-button"
              type="button"
              :disabled="modelBusy"
              @click="openModelDialog()"
            >
              <el-icon><Plus /></el-icon>添加模型
            </button>
          </div>
          <p v-if="modelNotice" class="settings-error" role="status">
            {{ modelNotice
            }}<button type="button" :disabled="loading" @click="loadPage">重试</button>
          </p>
          <div class="model-list" :aria-busy="modelBusy">
            <div
              v-for="model in modelOptions"
              :key="model.id"
              :class="['model-row', { 'is-selected': selectedModel === model.id }]"
            >
              <button
                class="model-choice"
                type="button"
                :disabled="modelBusy"
                :aria-pressed="selectedModel === model.id"
                @click="selectModel(model)"
              >
                <span class="model-icon"
                  ><el-icon><Connection /></el-icon></span
                ><span
                  ><strong>{{ model.configName }}</strong
                  ><small>{{
                    model.isDefault
                      ? '使用管理员提供的默认配置'
                      : model.modelName + ' · ' + model.providerName
                  }}</small></span
                ><el-icon v-if="selectedModel === model.id" class="selected-check"
                  ><Check
                /></el-icon>
              </button>
              <div v-if="!model.isDefault && !model.isPublic" class="model-actions">
                <button
                  type="button"
                  class="icon-button"
                  :disabled="modelBusy"
                  :aria-label="'编辑' + model.configName"
                  @click="openModelDialog(model)"
                >
                  <el-icon><EditPen /></el-icon></button
                ><button
                  type="button"
                  class="icon-button"
                  :disabled="modelBusy || selectedModel === model.id"
                  :title="selectedModel === model.id ? '切换模型后可删除' : '删除模型配置'"
                  :aria-label="'删除' + model.configName"
                  @click="removeModel(model)"
                >
                  <el-icon><Delete /></el-icon>
                </button>
              </div>
            </div>
          </div>
        </section>
        <section class="settings-section settings-about">
          <el-icon><Lock /></el-icon>
          <div>
            <h3>相处中的变化，留在相处中</h3>
            <p>这里可以管理模型连接。人物设定、记忆干预、历史清理和角色重置由管理员处理。</p>
          </div>
        </section>
      </main>
    </section>
    <AgentModelConfigDialog
      v-model="modelDialogOpen"
      :config="editingModelConfig"
      :saving="modelBusy"
      @submit="saveModel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowRight,
  ArrowUp,
  ChatLineRound,
  Check,
  Close,
  Connection,
  Delete,
  EditPen,
  InfoFilled,
  Lock,
  Microphone,
  Phone,
  Picture,
  Plus,
  Search,
  Setting
} from '@element-plus/icons-vue'
import AgentModelConfigDialog from '@/components/AgentModelConfigDialog.vue'
import CompanionIcon from '@/components/CompanionIcon.vue'
import { useAgentChatStore } from '@/stores/modules/AgentChatStore'
import {
  DEFAULT_MODEL,
  type AgentModelConfig,
  type ModelOption,
  type SavedModelConfig,
  type SavedAIMessage,
  type SendAIMessageRequest
} from '@/types'
import type { AgentServiceStatus } from '@/types/agentChat'
import {
  addModelConfig,
  deleteModelConfig,
  getAgentStatus,
  getModelConfigs,
  loadMessage,
  switchModelConfig,
  updateModelConfig
} from '@/api/AIMessage'
import { streamAIMessage } from '@/api/AIMessageStream'

// 保留路由已有 KeepAlive 名称；页面只维护一个长期聊天入口。
defineOptions({ name: 'AgentWorkspacePage' })

const chat = useAgentChatStore()
const { draft, messages, selectedModel, isSending } = storeToRefs(chat)
const activeTab = ref<'chat' | 'moments' | 'settings'>('chat')
const navigation = [
  { id: 'chat', label: '聊天', icon: ChatLineRound },
  { id: 'moments', label: '朋友圈', icon: Picture }
] as const
const starters = ['今天过得怎么样？', '有件小事想和你分享', '想听听你最近的生活']
const service = ref<AgentServiceStatus | null>(null)
const loading = ref(false)
const notice = ref('')
const modelNotice = ref('')
const searchOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const composerInput = ref<HTMLTextAreaElement | null>(null)
const thread = ref<HTMLElement | null>(null)
const modelOptions = ref<ModelOption[]>([{ ...DEFAULT_MODEL }])
const modelBusy = ref(false)
const modelDialogOpen = ref(false)
const editingModelId = ref<string | null>(null)
const editingModelConfig = ref<AgentModelConfig | null>(null)
let requestController: AbortController | null = null
let disposed = false

const selectedModelOption = computed(
  () => modelOptions.value.find((model) => model.id === selectedModel.value) ?? DEFAULT_MODEL
)
const filteredMessages = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  return searchOpen.value && query
    ? messages.value.filter((message) => message.content.toLocaleLowerCase().includes(query))
    : messages.value
})
const connectionLabel = computed(() =>
  loading.value
    ? '正在连接'
    : isSending.value
      ? '正在接收消息'
      : service.value?.available
        ? '服务可用'
        : '暂时无法聊天'
)
const canSend = computed(
  () =>
    Boolean(draft.value.trim()) &&
    !isSending.value &&
    !loading.value &&
    service.value?.available === true
)
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback
const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
const formatDay = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
const isNewDay = (index: number) =>
  index === 0 ||
  new Date(filteredMessages.value[index].createdAt).toDateString() !==
    new Date(filteredMessages.value[index - 1].createdAt).toDateString()
const scrollToBottom = async () => {
  await nextTick()
  if (thread.value) thread.value.scrollTop = thread.value.scrollHeight
}
const currentUserId = async () => {
  const value = await (window as any).userInfoApi.storeGetUserInfo('userId')
  if (!value) throw new Error('请先登录后再聊天')
  return String(value)
}
const credential = async (configId: string, apiKey?: string) => {
  const scope = { userId: chat.userId, configId }
  return apiKey === undefined
    ? (window as any).userInfoApi.storeGetUserInfo('modelApiKey', scope)
    : (window as any).userInfoApi.storeSetUserInfo('modelApiKey', { ...scope, apiKey })
}
const toModel = (model: SavedModelConfig): ModelOption => ({
  id: String(model.id),
  configName: model.configName,
  providerName: model.providerName,
  modelName: model.modelName,
  description: model.configName,
  baseUrl: model.baseUrl || undefined,
  modelTemperature: model.modelTemperature,
  isActive: model.isActive,
  isPublic: model.isPublic
})

const loadPage = async () => {
  if (loading.value || isSending.value || modelBusy.value) return
  loading.value = true
  notice.value = ''
  modelNotice.value = ''
  try {
    const userId = await currentUserId()
    if (disposed) return
    if (chat.userId !== userId) {
      chat.bindUser(userId)
      modelOptions.value = [{ ...DEFAULT_MODEL }]
      service.value = null
    }
    const [statusResult, modelResult, historyResult] = await Promise.allSettled([
      getAgentStatus(userId),
      getModelConfigs(userId),
      loadMessage(userId)
    ])
    if (disposed || chat.userId !== userId) return
    if (statusResult.status === 'fulfilled' && typeof statusResult.value.available === 'boolean')
      service.value = statusResult.value
    else {
      service.value = null
      notice.value = '暂时无法连接聊天服务，请稍后重试。'
    }
    if (modelResult.status === 'fulfilled') {
      modelOptions.value = [{ ...DEFAULT_MODEL }, ...modelResult.value.map(toModel)]
      chat.selectedModel =
        modelOptions.value.find((model) => model.isActive && !model.isDefault)?.id ??
        DEFAULT_MODEL.id
    } else modelNotice.value = '模型配置暂时无法加载，请检查连接后重试。'
    if (historyResult.status === 'fulfilled') {
      // conversationId 是当前世界的兼容响应字段，不支持创建额外聊天窗口。
      const history: SavedAIMessage[] = historyResult.value
      const conversationId = history.at(-1)?.conversationId ?? chat.conversationId
      chat.loadHistory(
        history
          .filter((message) => message.conversationId === conversationId)
          .map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            status: 'completed',
            createdAt: Date.parse(message.createdAt) || Date.now()
          })),
        conversationId
      )
      void scrollToBottom()
    } else notice.value = '聊天记录暂时无法加载，请检查连接后重试。'
  } catch (error) {
    service.value = null
    notice.value = errorText(error, '连接失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const chooseStarter = async (text: string) => {
  draft.value = text
  await nextTick()
  composerInput.value?.focus()
}
const closeSearch = () => {
  searchOpen.value = false
  searchQuery.value = ''
}
const toggleSearch = async () => {
  searchOpen.value = !searchOpen.value
  searchQuery.value = ''
  await nextTick()
  searchInput.value?.focus()
}
const onComposerKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  void sendMessage()
}

const sendMessage = async () => {
  if (!canSend.value) return
  const userId = chat.userId
  const content = draft.value.trim()
  const userMessageId = crypto.randomUUID()
  const replyId = crypto.randomUUID()
  const model = selectedModelOption.value
  const controller = new AbortController()
  requestController = controller
  chat.isSending = true
  notice.value = ''
  draft.value = ''
  chat.messages.push({
    id: userMessageId,
    role: 'user',
    content,
    status: 'sending',
    createdAt: Date.now()
  })
  const isCurrent = () => !disposed && chat.userId === userId && requestController === controller
  const markAccepted = () => {
    const message = chat.messages.find((item) => item.id === userMessageId)
    if (message) message.status = 'completed'
  }
  try {
    const apiKey = model.isDefault ? undefined : await credential(model.id)
    if (!isCurrent()) return
    const payload: SendAIMessageRequest = {
      id: userMessageId,
      conversationId: chat.ensureConversation(),
      userId,
      role: 'user',
      messageType: 1,
      content,
      config: {
        providerName: model.providerName,
        modelName: model.modelName || undefined,
        baseUrl: model.baseUrl,
        apiKey: typeof apiKey === 'string' ? apiKey : undefined,
        modelTemperature: model.modelTemperature ?? 1,
        configId: model.isDefault ? undefined : model.id
      }
    }
    const contentResult = await streamAIMessage(
      payload,
      {
        onStarted: ({ conversationId }) => {
          if (isCurrent()) {
            chat.conversationId = conversationId
            markAccepted()
          }
        },
        onDelta: (delta) => {
          if (isCurrent()) {
            markAccepted()
            chat.appendReply(replyId, delta)
            void scrollToBottom()
          }
        },
        onCompleted: ({ content: replyContent }) => {
          if (!isCurrent()) return
          markAccepted()
          const message = chat.messages.find((item) => item.id === replyId)
          if (message) message.content = replyContent
          else if (replyContent) chat.appendReply(replyId, replyContent)
        }
      },
      controller.signal
    )
    if (!isCurrent()) return
    markAccepted()
    const reply = chat.messages.find((item) => item.id === replyId)
    if (reply) {
      reply.content = contentResult
      reply.status = 'completed'
    }
    void scrollToBottom()
  } catch (error) {
    if (!isCurrent()) return
    const userMessage = chat.messages.find((item) => item.id === userMessageId)
    if (userMessage?.status === 'sending') {
      userMessage.status = 'failed'
      if (!draft.value) draft.value = content
    }
    const reply = chat.messages.find((item) => item.id === replyId)
    if (reply) reply.status = 'completed'
    notice.value = errorText(error, '消息暂时无法发送，请稍后重试')
    if (error instanceof Error && 'code' in error && error.code === 'PERSON_AGENT_NOT_READY')
      service.value = { available: false }
  } finally {
    if (requestController === controller) {
      requestController = null
      chat.isSending = false
    }
  }
  void scrollToBottom()
}

const openModelDialog = async (model?: ModelOption) => {
  if (modelBusy.value) return
  editingModelId.value = model?.id ?? null
  editingModelConfig.value = null
  if (model) {
    try {
      const apiKey = await credential(model.id)
      editingModelConfig.value = {
        configName: model.configName,
        providerName: model.providerName,
        modelName: model.modelName,
        baseUrl: model.baseUrl ?? '',
        apiKey: typeof apiKey === 'string' ? apiKey : '',
        modelTemperature: model.modelTemperature ?? 1
      }
    } catch {
      ElMessage.error('无法读取模型凭据，请稍后重试')
      return
    }
  }
  modelDialogOpen.value = true
}
const refreshServiceStatus = async () => {
  try {
    service.value = await getAgentStatus(chat.userId)
  } catch {
    service.value = null
  }
}
const selectModel = async (model: ModelOption) => {
  if (modelBusy.value || isSending.value || selectedModel.value === model.id) return
  modelBusy.value = true
  try {
    await switchModelConfig({ userId: chat.userId, configId: model.isDefault ? null : model.id })
    chat.selectedModel = model.id
    await refreshServiceStatus()
  } catch (error) {
    ElMessage.error(errorText(error, '模型切换失败'))
  } finally {
    modelBusy.value = false
  }
}
const saveModel = async (config: AgentModelConfig) => {
  if (modelBusy.value) return
  modelBusy.value = true
  try {
    const data = {
      userId: chat.userId,
      configName: config.configName,
      providerName: config.providerName,
      modelName: config.modelName,
      baseUrl: config.baseUrl || null,
      modelTemperature: config.modelTemperature
    }
    const id = editingModelId.value
    const configId = id ?? (await addModelConfig(data)).configId
    if (id) await updateModelConfig({ ...data, configId })
    await credential(String(configId), config.apiKey)
    const updated = { ...config, id: String(configId), description: config.configName }
    const index = modelOptions.value.findIndex((model) => model.id === updated.id)
    if (index < 0) modelOptions.value.push(updated)
    else modelOptions.value[index] = updated
    // 密钥不放入模型列表和 Pinia，发送时从已有运行期凭据入口读取。
    modelOptions.value.forEach((model) => {
      delete model.apiKey
    })
    await refreshServiceStatus()
    modelDialogOpen.value = false
    ElMessage.success('模型配置已保存')
  } catch (error) {
    ElMessage.error(errorText(error, '模型配置保存失败'))
  } finally {
    modelBusy.value = false
  }
}
const removeModel = async (model: ModelOption) => {
  if (modelBusy.value || isSending.value) return
  try {
    await ElMessageBox.confirm('确定删除模型配置“' + model.configName + '”吗？', '删除模型配置', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  modelBusy.value = true
  try {
    await deleteModelConfig(model.id, chat.userId)
    await credential(model.id, '')
    modelOptions.value = modelOptions.value.filter((item) => item.id !== model.id)
    if (selectedModel.value === model.id) chat.selectedModel = DEFAULT_MODEL.id
  } catch (error) {
    ElMessage.error(errorText(error, '模型配置删除失败'))
  } finally {
    modelBusy.value = false
  }
}

onMounted(() => {
  void loadPage()
})
onActivated(() => {
  void loadPage()
})
onBeforeUnmount(() => {
  disposed = true
  requestController?.abort()
  chat.isSending = false
})
</script>

<style scoped>
.agent-workbench {
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-primary);
  background: var(--color-app-bg);
  -webkit-app-region: no-drag;
}
button,
input,
textarea {
  font: inherit;
}
button {
  color: inherit;
  cursor: pointer;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}
.agent-sidebar {
  display: flex;
  flex: 0 0 224px;
  min-width: 0;
  flex-direction: column;
  padding: 28px 16px 20px;
  box-sizing: border-box;
  background: var(--color-surface-1);
  border-right: 1px solid var(--color-border-subtle);
  backdrop-filter: var(--surface-filter);
}
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  -webkit-app-region: drag;
  user-select: none;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
  font-size: 22px;
}
.sidebar-brand strong {
  display: block;
  font-size: 16px;
  letter-spacing: -0.02em;
}
.sidebar-brand small {
  display: block;
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 11px;
}
.companion-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0 26px;
  margin: 24px 0 14px;
  border-top: 1px solid var(--color-border-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
}
.companion-avatar {
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  border-radius: 23px;
  background: var(--color-accent-soft);
  color: var(--color-text-accent);
  font-size: 23px;
  letter-spacing: -0.05em;
  font-weight: 600;
}
.companion-card strong {
  margin-top: 16px;
  font-size: 15px;
}
.companion-card > span:last-child {
  margin-top: 8px;
  color: var(--color-text-secondary);
  font-size: 11px;
}
.companion-nav {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.companion-nav button,
.sidebar-settings {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  text-align: left;
}
.companion-nav .el-icon,
.sidebar-settings .el-icon {
  font-size: 19px;
}
.companion-nav button:hover,
.sidebar-settings:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}
.companion-nav .is-active {
  color: var(--color-text-accent);
  background: var(--color-accent-soft);
  font-weight: 600;
}
.nav-marker {
  width: 5px;
  height: 5px;
  margin-left: auto;
  border-radius: 50%;
  background: currentColor;
}
.sidebar-note {
  margin-top: auto;
  padding: 48px 14px 24px;
}
.note-line {
  display: block;
  width: 20px;
  height: 2px;
  margin-bottom: 12px;
  background: var(--color-border-subtle);
}
.sidebar-note p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1.9;
}
.sidebar-settings {
  border-top: 1px solid var(--color-border-subtle);
  border-radius: 0;
}
.companion-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.companion-header {
  display: flex;
  min-height: 96px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 36px;
  border-bottom: 1px solid var(--color-border-subtle);
  box-sizing: border-box;
  -webkit-app-region: drag;
  user-select: none;
}
.section-caption {
  display: block;
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1.6;
  letter-spacing: 0.04em;
}
.companion-header h1 {
  margin: 5px 0 0;
  font-size: 20px;
  font-weight: 600;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 90px;
  -webkit-app-region: no-drag;
}
.connection-status {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-right: 12px;
  color: var(--color-text-secondary);
  font-size: 11px;
  white-space: nowrap;
}
.connection-status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-text-muted);
}
.connection-status .is-available {
  background: var(--color-accent);
}
.icon-button {
  display: inline-grid;
  width: 34px;
  height: 34px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 18px;
}
.icon-button:hover:not(:disabled) {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}
.chat-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 36px;
  scrollbar-gutter: stable;
}
.conversation-welcome {
  display: flex;
  min-height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 28px 0 36px;
  text-align: center;
}
.welcome-symbol {
  display: grid;
  position: relative;
  place-items: center;
  width: 76px;
  height: 76px;
  margin-bottom: 28px;
  border: 1px solid var(--color-border-subtle);
  border-radius: 26px;
  color: var(--color-text-accent);
  background: var(--color-surface-1);
  font-size: 36px;
  box-shadow: var(--shadow-sm);
}
.welcome-symbol > span {
  position: absolute;
  right: -5px;
  top: 9px;
  width: 15px;
  height: 15px;
  border: 4px solid var(--color-app-bg);
  border-radius: 50%;
  background: var(--color-accent);
}
.conversation-welcome h2 {
  margin: 13px 0;
  font-size: clamp(22px, 2.4vw, 30px);
  font-weight: 550;
  letter-spacing: -0.04em;
}
.conversation-welcome p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.9;
}
.conversation-starters {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 28px;
}
.conversation-starters button {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 8px 12px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  background: var(--color-surface-1);
  font-size: 11px;
}
.conversation-starters button:hover {
  color: var(--color-text-accent);
  border-color: var(--color-accent);
}
.message-thread {
  max-width: 860px;
  margin: 0 auto;
}
.day-divider {
  margin: 8px 0 28px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 11px;
}
.chat-message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin: 20px 0;
}
.chat-message.is-user {
  flex-direction: row-reverse;
}
.message-avatar {
  display: grid;
  place-items: center;
  flex: 0 0 32px;
  height: 32px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 11px;
}
.message-column {
  min-width: 0;
  max-width: 76%;
}
.message-bubble {
  padding: 12px 16px;
  border: 1px solid var(--color-border-subtle);
  border-radius: 0 14px 14px 14px;
  background: var(--color-surface-1);
  color: var(--color-text-primary);
  font-size: 14px;
  line-height: 1.85;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.is-user .message-bubble {
  background: var(--color-accent-soft);
  border-color: transparent;
  border-radius: 14px 0 14px 14px;
}
.message-time {
  display: block;
  margin-top: 6px;
  color: var(--color-text-secondary);
  font-size: 10px;
}
.is-user .message-time {
  text-align: right;
}
.send-failed {
  color: var(--el-color-danger);
}
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 14px;
  margin-left: 5px;
  vertical-align: middle;
  background: var(--color-accent);
  animation: cursor-blink 1s steps(2, start) infinite;
}
.composer-area {
  flex-shrink: 0;
  width: min(940px, 100%);
  align-self: center;
  padding: 0 36px 24px;
  box-sizing: border-box;
}
.service-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 2px 14px;
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1.7;
}
.service-notice > .el-icon {
  flex-shrink: 0;
  margin-top: 3px;
}
.service-notice > span {
  flex: 1;
}
.service-notice button,
.settings-error button {
  flex-shrink: 0;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--color-text-accent);
  font-size: inherit;
}
.composer-shell {
  border: 1px solid var(--color-border-subtle);
  border-radius: 16px;
  background: var(--color-surface-1);
  box-shadow: var(--shadow-sm);
  padding: 9px 14px 12px;
}
.composer-shell:focus-within {
  border-color: var(--color-accent);
}
.composer-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.composer-toolbar > div {
  display: flex;
  gap: 3px;
}
.model-shortcut {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 65%;
  min-height: 32px;
  padding: 4px 8px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 11px;
}
.model-shortcut span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.model-shortcut:hover {
  background: var(--color-surface-2);
}
.composer-shell textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 76px;
  max-height: 180px;
  resize: vertical;
  padding: 10px 6px;
  border: 0;
  outline: none;
  color: var(--color-text-primary);
  background: transparent;
  font-size: 14px;
  line-height: 1.8;
}
.composer-shell textarea:focus-visible {
  outline: none;
}
.composer-shell textarea::placeholder {
  color: var(--color-text-secondary);
}
.composer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-left: 6px;
}
.composer-footer > span {
  color: var(--color-text-secondary);
  font-size: 10px;
}
.shortcut-divider {
  margin: 0 8px;
  opacity: 0.6;
}
.send-button {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: 12px;
}
.send-button:hover:not(:disabled) {
  filter: brightness(1.06);
}
.chat-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 36px;
  border-bottom: 1px solid var(--color-border-subtle);
  color: var(--color-text-secondary);
}
.chat-search input {
  flex: 1;
  min-width: 0;
  height: 32px;
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 13px;
}
.chat-search > span {
  font-size: 11px;
}
.empty-search {
  text-align: center;
  padding-top: 60px;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.moments-content,
.settings-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 36px;
}
.moments-cover {
  position: relative;
  max-width: 820px;
  margin: 0 auto;
  padding: 32px;
  overflow: hidden;
  border: 1px solid var(--color-border-subtle);
  border-radius: 20px;
  background: var(--color-accent-soft);
}
.moments-cover h2 {
  position: relative;
  margin: 16px 0;
  font-size: 26px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.03em;
}
.moments-cover p {
  position: relative;
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}
.moments-cover > .el-icon {
  position: absolute;
  right: 40px;
  top: 46px;
  font-size: 130px;
  opacity: 0.07;
  transform: rotate(-12deg);
}
.section-empty {
  max-width: 820px;
  margin: 68px auto 0;
  text-align: center;
}
.section-empty > .el-icon {
  font-size: 30px;
  color: var(--color-text-secondary);
}
.section-empty h3 {
  margin: 20px 0 10px;
  font-size: 15px;
  font-weight: 500;
}
.section-empty p {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.8;
}
.settings-section {
  max-width: 820px;
  margin: 0 auto 32px;
}
.settings-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin: 8px 0 24px;
}
.settings-heading h2 {
  margin: 9px 0;
  font-size: 20px;
  font-weight: 550;
}
.settings-heading p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.8;
}
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
  flex-shrink: 0;
  padding: 0 12px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  font-size: 12px;
}
.model-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.model-row {
  display: flex;
  align-items: center;
  min-width: 0;
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px;
  background: var(--color-surface-1);
}
.model-row.is-selected {
  border-color: var(--color-accent);
}
.model-choice {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  text-align: left;
}
.model-choice > span:nth-child(2) {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
}
.model-choice strong {
  display: block;
  font-size: 13px;
  font-weight: 550;
}
.model-choice small {
  display: block;
  margin-top: 6px;
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1.7;
}
.model-icon {
  display: grid;
  place-items: center;
  flex: 0 0 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
  font-size: 20px;
}
.selected-check {
  flex-shrink: 0;
  color: var(--color-accent);
  font-size: 20px;
}
.model-actions {
  display: flex;
  flex-shrink: 0;
  padding-right: 10px;
}
.settings-error {
  display: flex;
  gap: 12px;
  align-items: center;
  color: var(--el-color-danger);
  font-size: 12px;
}
.settings-about {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 24px 0;
  border-top: 1px solid var(--color-border-subtle);
}
.settings-about > .el-icon {
  flex-shrink: 0;
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 20px;
}
.settings-about h3 {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 550;
}
.settings-about p {
  max-width: 560px;
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.9;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
@keyframes cursor-blink {
  to {
    visibility: hidden;
  }
}
@media (max-width: 1000px) {
  .agent-sidebar {
    flex-basis: 192px;
    padding-inline: 12px;
  }
  .header-actions {
    padding-right: 80px;
  }
  .connection-status {
    display: none;
  }
  .companion-header {
    padding-inline: 24px;
  }
  .chat-content {
    padding-inline: 24px;
  }
  .composer-area {
    padding-inline: 24px;
  }
  .conversation-starters {
    max-width: 380px;
  }
  .moments-content,
  .settings-content {
    padding: 24px;
  }
}
@media (max-width: 700px) {
  .agent-sidebar {
    flex-basis: 64px;
    padding: 24px 8px 12px;
  }
  .sidebar-brand {
    padding: 0 6px;
  }
  .sidebar-brand > div,
  .companion-card,
  .sidebar-note,
  .sidebar-settings {
    display: none;
  }
  .companion-nav {
    margin-top: 30px;
  }
  .companion-nav button {
    justify-content: center;
    padding: 0;
    min-height: 44px;
  }
  .companion-nav span,
  .companion-nav .nav-marker {
    display: none;
  }
  .companion-header {
    padding: 18px 16px;
  }
  .companion-header h1 {
    font-size: 17px;
  }
  .header-actions {
    padding-right: 0;
    gap: 2px;
  }
  .chat-content {
    padding: 18px 14px;
  }
  .composer-area {
    padding: 0 14px 14px;
  }
  .conversation-welcome h2 {
    font-size: 22px;
  }
  .message-column {
    max-width: 82%;
  }
  .settings-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .model-choice {
    padding: 12px;
    gap: 9px;
  }
  .model-actions {
    flex-direction: column;
    padding: 0 6px 0 0;
  }
  .moments-cover {
    padding: 24px;
  }
  .moments-cover h2 {
    font-size: 22px;
  }
  .composer-footer > span {
    font-size: 9px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
