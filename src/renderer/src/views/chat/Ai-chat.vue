<template>
  <div class="agent-workbench">
    <aside :class="['agent-sidebar', { 'is-collapsed': isSidebarCollapsed }]">
      <div class="sidebar-brand">
        <div class="brand-mark">
          <el-icon>
            <MagicStick />
          </el-icon>
        </div>
        <div class="brand-copy">
          <strong>IM Agent</strong>
          <span>智能工作台</span>
        </div>
        <button class="sidebar-collapse" type="button" :aria-label="isSidebarCollapsed ? '展开会话列表' : '收起会话列表'"
          :title="isSidebarCollapsed ? '展开会话列表' : '收起会话列表'" @click="handleToggleSidebar">
          <el-icon>
            <ArrowLeft />
          </el-icon>
        </button>
      </div>

      <button class="new-task-button" type="button" @click="handleCreateTask">
        <span class="button-leading">
          <el-icon>
            <EditPen />
          </el-icon>
          <span>新建任务</span>
        </span>
        <kbd>Ctrl K</kbd>
      </button>

      <nav class="sidebar-nav" aria-label="AI 工作台导航">
        <div :class="['sidebar-search', { 'is-open': isSearchOpen }]">
          <button class="sidebar-nav-item" type="button" @click="handleSearch">
            <el-icon>
              <Search />
            </el-icon>
            <span v-if="!isSearchOpen">搜索会话</span>
          </button>
          <input v-if="isSearchOpen" ref="searchInputRef" v-model="searchQuery" type="text" placeholder="搜索会话"
            aria-label="搜索会话" />
          <button v-if="isSearchOpen" class="search-close" type="button" aria-label="关闭搜索" @click="closeSearch">
            <el-icon>
              <Close />
            </el-icon>
          </button>
        </div>
        <button class="sidebar-nav-item" type="button" @click="handleOpenWorkspace">
          <el-icon>
            <FolderOpened />
          </el-icon>
          <span>工作区</span>
        </button>
      </nav>

      <div class="history-panel">
        <section v-for="(group, groupIndex) in conversationGroups" :key="group.key"
          :class="['history-group', { 'history-heading-spaced': groupIndex > 0 }]">
          <div class="history-heading">
            <span>{{ group.label }}</span>
            <AgentDropdown v-if="group.showMenu" placement="bottom-end" :items="historyMenuItems" :min-width="176"
              aria-label="会话历史设置" @select="handleHistoryCommand">
              <template #trigger>
                <el-icon>
                  <MoreFilled />
                </el-icon>
              </template>
            </AgentDropdown>
          </div>

          <div v-for="conversation in group.items" :key="conversation.id" class="history-item-row">
            <button :class="['history-item', { 'is-active': activeConversationId === conversation.id }]" type="button"
              @click="handleSelectConversation(conversation)">
              <span class="history-item-title">{{ conversation.title }}</span>
              <span class="history-item-meta">{{ formatRelativeTime(conversation.updatedAt) }}</span>
            </button>
            <AgentDropdown class="conversation-more" placement="bottom-end" :items="conversationMenuItems"
              :min-width="150" aria-label="会话操作"
              @select="(command: string) => handleConversationCommand(command, conversation)">
              <template #trigger>
                <el-icon>
                  <MoreFilled />
                </el-icon>
              </template>
            </AgentDropdown>
          </div>
        </section>
        <p v-if="visibleConversationCount === 0" class="history-empty">没有匹配的会话</p>
      </div>

      <div class="sidebar-footer">
        <button class="account-entry" type="button" @click="handleAccount">
          <span class="account-avatar">IM</span>
          <span class="account-copy">
            <strong>本地工作区</strong>
            <small>Agent 服务已就绪</small>
          </span>
          <span class="status-dot" aria-hidden="true"></span>
        </button>
      </div>
    </aside>

    <section class="workspace-panel">
      <header class="workspace-header">
        <div class="workspace-title">
          <span class="workspace-eyebrow">AGENT WORKSPACE</span>
          <div class="workspace-name-row">
            <h1>{{ activeConversation?.title || '新任务' }}</h1>
            <span class="draft-badge">{{ activeConversation ? '对话' : '草稿' }}</span>
          </div>
        </div>

        <div class="header-status">
          <span class="status-dot"></span>
          <span>{{ isGenerating ? 'Agent 正在响应' : 'Agent 就绪' }}</span>
        </div>
      </header>

      <main class="workspace-content">
        <div v-if="messages.length > 0" ref="messageThreadRef" class="message-thread">
          <article v-for="message in messages" :key="message.id" :class="['agent-message', `is-${message.role}`]">
            <div class="message-avatar">
              <span v-if="message.role === 'user'">你</span>
              <el-icon v-else>
                <MagicStick />
              </el-icon>
            </div>

            <div class="message-body">
              <div class="message-heading">
                <strong>{{ message.role === 'user' ? '你' : 'IM Agent' }}</strong>
                <span>{{ formatMessageTime(message.createdAt) }}</span>
              </div>
              <details v-if="message.reasoningContent" class="message-reasoning" :open="message.status === 'streaming'">
                <summary>{{ message.status === 'streaming' ? '正在思考' : '思考过程' }}</summary>
                <p>{{ message.reasoningContent }}</p>
              </details>
              <p class="message-content">{{ message.content }}</p>

              <div v-if="message.toolSteps?.length" class="tool-step-list">
                <div v-for="step in message.toolSteps" :key="step.id" class="tool-step">
                  <span :class="['tool-step-status', `is-${step.status}`]"></span>
                  <span>{{ step.title }}</span>
                  <small>{{ step.statusLabel }}</small>
                </div>
              </div>

              <span v-if="message.status === 'streaming'" class="streaming-cursor"></span>
            </div>
          </article>
        </div>

        <div v-else class="welcome-panel">
          <div class="agent-orb" aria-hidden="true">
            <div class="orb-glow"></div>
            <el-icon>
              <MagicStick />
            </el-icon>
          </div>

          <p class="welcome-kicker">IM AGENT</p>
          <h2>今天想构建什么？</h2>
          <p class="welcome-description">
            描述目标，Agent 将结合会话上下文与工作区内容，为你分析、规划并完成任务。
          </p>

          <div class="suggestion-grid">
            <button v-for="suggestion in suggestions" :key="suggestion.id" class="suggestion-card" type="button"
              @click="handleSelectSuggestion(suggestion)">
              <span class="suggestion-icon">
                <el-icon>
                  <component :is="suggestion.icon" />
                </el-icon>
              </span>
              <span class="suggestion-copy">
                <strong>{{ suggestion.title }}</strong>
                <small>{{ suggestion.description }}</small>
              </span>
              <el-icon class="suggestion-arrow">
                <ArrowRight />
              </el-icon>
            </button>
          </div>
        </div>

        <div class="composer-area">
          <div class="composer-shell" @dragover.prevent @drop.prevent="handleFileDrop">
            <div v-if="attachments.length > 0" class="attachment-list">
              <div v-for="attachment in attachments" :key="attachment.id" class="attachment-chip">
                <el-icon>
                  <Document />
                </el-icon>
                <span>{{ attachment.name }}</span>
                <small>{{ formatFileSize(attachment.size) }}</small>
                <button type="button" :aria-label="`移除${attachment.name}`" @click="removeAttachment(attachment.id)">
                  <el-icon>
                    <Close />
                  </el-icon>
                </button>
              </div>
            </div>

            <textarea ref="composerInputRef" v-model="draft" rows="3" aria-label="任务描述"
              placeholder="向 IM Agent 描述一个任务，或输入 / 查看可用能力" @keydown.enter.exact.prevent="handleSubmit"></textarea>

            <div class="composer-footer">
              <div class="composer-tools">
                <AgentDropdown class="composer-tool" placement="top-start" :items="attachmentMenuItems" :min-width="210"
                  aria-label="添加附件" @select="handleAttachmentCommand">
                  <template #trigger>
                    <el-icon>
                      <Paperclip />
                    </el-icon>
                  </template>
                </AgentDropdown>
                <button class="composer-selector workspace-selector" type="button" @click="handleSelectWorkspace">
                  <el-icon>
                    <FolderOpened />
                  </el-icon>
                  <span>{{ selectedWorkspace ?? '未选择工作区' }}</span>
                </button>
                <AgentDropdown class="composer-selector" placement="top-start" compact :items="branchMenuItems"
                  :min-width="190" :selected-value="selectedBranch" aria-label="选择分支" @select="handleSelectBranch">
                  <template #trigger>
                    <span class="branch-dot"></span>
                    <span>{{ selectedBranch }}</span>
                    <el-icon>
                      <ArrowDown />
                    </el-icon>
                  </template>
                </AgentDropdown>
              </div>

              <div class="composer-actions">
                <AgentDropdown class="composer-selector" placement="top-end" compact :items="modeMenuItems"
                  :min-width="230" :selected-value="selectedMode" aria-label="选择工作模式" @select="handleSelectMode">
                  <template #trigger>
                    <span class="mode-indicator"></span>
                    <span>{{ selectedMode }}</span>
                    <el-icon>
                      <ArrowDown />
                    </el-icon>
                  </template>
                </AgentDropdown>
                <label class="think-mode-switch" title="控制本次对话是否启用思考模式">
                  <span>思考</span>
                  <el-switch v-model="enableThink" size="small" aria-label="启用思考模式" />
                </label>
                <button class="model-add-button" type="button" aria-label="添加大模型" title="添加大模型"
                  @click="handleOpenModelConfig">
                  <el-icon>
                    <Plus />
                  </el-icon>
                </button>
                <button class="model-edit-button" type="button" aria-label="编辑当前模型" title="编辑当前模型"
                  :disabled="selectedModelOption.isDefault" @click="handleEditSelectedModel">
                  <el-icon>
                    <EditPen />
                  </el-icon>
                </button>
                <button class="model-delete-button" type="button" aria-label="删除当前模型" title="删除当前模型"
                  :disabled="selectedModelOption.isDefault" @click="handleDeleteSelectedModel">
                  <el-icon>
                    <Delete />
                  </el-icon>
                </button>
                <AgentDropdown class="composer-selector" placement="top-end" compact :items="modelMenuItems"
                  :min-width="250" :selected-value="selectedModel" aria-label="选择模型" @select="handleSelectModel">
                  <template #trigger>
                    <span>{{ selectedModelName }}</span>
                    <el-icon>
                      <ArrowDown />
                    </el-icon>
                  </template>
                </AgentDropdown>
                <button :class="['send-button', { 'is-stop': isGenerating }]" type="button"
                  :disabled="!canSubmit && !isGenerating" :aria-label="isGenerating ? '停止生成' : '发送任务'"
                  @click="isGenerating ? handleStopGenerating() : handleSubmit()">
                  <el-icon>
                    <VideoPause v-if="isGenerating" />
                    <ArrowUp v-else />
                  </el-icon>
                </button>
              </div>
            </div>
          </div>

          <div class="composer-meta">
            <span><kbd>Enter</kbd> 发送</span>
            <span><kbd>Shift Enter</kbd> 换行</span>
            <span class="local-label">
              <span class="status-dot"></span>
              本地模式
            </span>
          </div>
        </div>
      </main>
    </section>

    <AgentModelConfigDialog v-model="modelConfigDialogVisible" :config="editingModelConfig"
      @submit="handleModelConfigSubmit" />

    <AgentActionDialog v-model="actionDialog.visible" :mode="actionDialog.action === 'rename' ? 'prompt' : 'confirm'"
      :title="actionDialog.title" :description="actionDialog.description" :confirm-text="actionDialog.confirmText"
      :initial-value="actionDialog.initialValue" :placeholder="actionDialog.placeholder"
      :danger="actionDialog.action !== 'rename'" @confirm="handleActionDialogConfirm" />

    <el-dialog v-model="workspaceDialogVisible" title="选择工作区" width="clamp(540px, 54vw, 820px)" append-to-body
      class="agent-workspace-dialog">
      <p class="dialog-description">选择 Agent 本次任务可以读取的项目范围。</p>
      <div class="workspace-grid">
        <div v-if="workspaceOptions.length === 0" class="workspace-empty">
          暂无已注册工作区，请先添加一个本地目录。
        </div>
        <button v-for="workspace in workspaceOptions" :key="workspace.name"
          :class="['workspace-card', { 'is-selected': selectedWorkspace === workspace.name }]" type="button"
          @click="handleChooseWorkspace(workspace)">
          <span class="workspace-card-icon"><el-icon>
              <FolderOpened />
            </el-icon></span>
          <span class="workspace-card-copy">
            <strong>{{ workspace.name }}</strong>
            <small>{{ workspace.path }}</small>
          </span>
          <span v-if="selectedWorkspace === workspace.name" class="workspace-selected">当前</span>
        </button>
      </div>
      <template #footer>
        <button class="dialog-secondary-button" type="button" :disabled="isWorkspaceRegistering"
          @click="handleAddWorkspace">
          <el-icon>
            <Plus />
          </el-icon>
          {{ isWorkspaceRegistering ? '正在读取目录…' : '添加本地工作区' }}
        </button>
        <button class="dialog-primary-button" type="button" @click="workspaceDialogVisible = false">完成</button>
      </template>
    </el-dialog>

    <el-dialog v-model="settingsDialogVisible" title="Agent 工作台设置" width="clamp(520px, 46vw, 700px)" append-to-body
      class="agent-workspace-dialog">
      <div class="settings-list">
        <label class="settings-row">
          <span>
            <strong>自动创建会话</strong>
            <small>发送第一条消息时自动加入历史列表</small>
          </span>
          <el-switch v-model="mockSettings.autoCreateConversation" />
        </label>
        <label class="settings-row">
          <span>
            <strong>保存输入草稿</strong>
            <small>刷新页面后继续编辑未发送内容</small>
          </span>
          <el-switch v-model="mockSettings.persistDraft" />
        </label>
        <label class="settings-row">
          <span>
            <strong>展示工具执行步骤</strong>
            <small>在回答中显示 Agent 的模拟处理过程</small>
          </span>
          <el-switch v-model="mockSettings.showToolSteps" />
        </label>
      </div>
      <template #footer>
        <button class="dialog-primary-button" type="button" @click="settingsDialogVisible = false">完成</button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import AgentActionDialog from '@/components/AgentActionDialog.vue'
import AgentDropdown from '@/components/AgentDropdown.vue'
import AgentModelConfigDialog from '@/components/AgentModelConfigDialog.vue'
import {
  DEFAULT_MODEL,
  type AIWorkspaceToolCompletedData,
  type AIWorkspaceToolExecutionResult,
  type AIWorkspaceToolOperation,
  type AIWorkspaceToolRequest,
  type AgentModelConfig,
  type AgentConversation,
  type AgentConversationGroup,
  type AgentDropdownItem,
  type AgentMode,
  type AgentModeOption,
  type AgentSimulationState,
  type AgentSuggestion,
  type AgentWorkspaceOption,
  type ConversationActionDialogState,
  type ModelOption,
  type SavedAIConversation,
  type SavedAIMessage,
  type SavedModelConfig,
  type SendAIMessageRequest
} from '@/types'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Close,
  Delete,
  Document,
  EditPen,
  FolderOpened,
  MagicStick,
  Monitor,
  MoreFilled,
  Operation,
  Paperclip,
  Plus,
  Search,
  VideoPause
} from '@element-plus/icons-vue'
import { useAgentWorkspaceStore } from '@/stores/modules/AgentWorkspaceStore'
import {
  addModelConfig,
  deleteAIConversation,
  deleteModelConfig,
  getAIConversations,
  getModelConfigs,
  loadMessage,
  renameAIConversation,
  submitAIWorkspaceToolResult,
  switchModelConfig,
  updateModelConfig
} from '@/api/AIMessage'
import { streamAIMessage } from '@/api/AIMessageStream'

const agentWorkspaceStore = useAgentWorkspaceStore()
const {
  activeConversationId,
  activeConversation,
  activeMessages: messages,
  attachments,
  draft,
  isGenerating,
  selectedBranch,
  selectedMode,
  selectedModel,
  selectedWorkspace
} = storeToRefs(agentWorkspaceStore)

const searchInputRef = ref<HTMLInputElement | null>(null)
const composerInputRef = ref<HTMLTextAreaElement | null>(null)
const messageThreadRef = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const isSearchOpen = ref(false)
const isSidebarCollapsed = ref(false)
const workspaceDialogVisible = ref(false)
const isWorkspaceRegistering = ref(false)
const settingsDialogVisible = ref(false)
const modelConfigDialogVisible = ref(false)
const enableThink = ref(false)
const editingModelId = ref<string | null>(null)
const editingModelConfig = ref<AgentModelConfig | null>(null)
const activeRequestController = ref<AbortController | null>(null)
const activeSimulation = ref<AgentSimulationState | null>(null)
const actionDialog = reactive<ConversationActionDialogState>({
  visible: false,
  action: 'rename',
  conversationId: '',
  title: '',
  description: '',
  confirmText: '',
  initialValue: '',
  placeholder: ''
})

const mockSettings = reactive({
  autoCreateConversation: true,
  persistDraft: true,
  showToolSteps: true
})

const workspaceOptions = ref<AgentWorkspaceOption[]>([])

const branchOptions = ['main', 'develop', 'feature/agent-ui']

const modelOptions = ref<ModelOption[]>([{ ...DEFAULT_MODEL }])

const modeOptions: AgentModeOption[] = [
  { value: 'Agent', label: 'Agent', description: '规划并执行多步骤任务' },
  { value: '提问', label: '提问', description: '只分析和回答，不执行操作' },
  { value: '规划', label: '规划', description: '仅生成可审查的实施计划' }
]

const historyMenuItems: AgentDropdownItem[] = [
  { value: 'refresh', label: '刷新消息', icon: Operation }
]

const conversationMenuItems: AgentDropdownItem[] = [
  { value: 'rename', label: '重命名', icon: EditPen },
  { value: 'delete', label: '删除会话', icon: Close, danger: true, divided: true }
]

const attachmentMenuItems: AgentDropdownItem[] = [
  { value: 'file', label: '选择文件', description: '添加单个文件到本次任务', icon: Document },
  { value: 'folder', label: '添加文件夹', description: '选择 Agent 可以读取的目录', icon: FolderOpened },
  { value: 'snippet', label: '粘贴代码片段', description: '在输入框中插入代码块', icon: EditPen, divided: true }
]

const branchMenuItems: AgentDropdownItem[] = branchOptions.map((branch) => ({
  value: branch,
  label: branch,
  description: branch === 'main' ? '默认分支' : '切换本次任务上下文'
}))

const modeMenuItems: AgentDropdownItem[] = modeOptions.map((mode) => ({
  value: mode.value,
  label: mode.label,
  description: mode.description
}))

const modelMenuItems = computed<AgentDropdownItem[]>(() =>
  modelOptions.value.map((model) => ({
    value: model.id,
    label: model.modelName,
    description: `${model.providerName} · ${model.description}`
  }))
)

const selectedModelOption = computed(() => {
  return modelOptions.value.find((model) => model.id === selectedModel.value) ?? DEFAULT_MODEL
})

const selectedModelName = computed(() => selectedModelOption.value.modelName)

const normalizeSelectedModel = () => {
  const selectedExists = modelOptions.value.some((model) => model.id === selectedModel.value)
  if (!selectedExists) agentWorkspaceStore.setModel(DEFAULT_MODEL.id)
}

const getCurrentUserId = async () => {
  const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')
  if (!userId) throw new Error('未获取到当前用户信息')
  return String(userId)
}

const getStoredModelApiKey = async (userId: string, configId: number) => {
  const apiKey = await (window as any).userInfoApi.storeGetUserInfo('modelApiKey', {
    userId,
    configId
  })
  return typeof apiKey === 'string' ? apiKey : ''
}

const setStoredModelApiKey = (userId: string, configId: number, apiKey: string) => {
  return (window as any).userInfoApi.storeSetUserInfo('modelApiKey', {
    userId,
    configId,
    apiKey
  })
}

const toModelOption = (config: SavedModelConfig): ModelOption => ({
  id: String(config.id),
  configName: config.configName,
  providerName: config.providerName,
  modelName: config.modelName,
  description: config.configName,
  baseUrl: config.baseUrl || undefined,
  modelTemperature: config.modelTemperature,
  isActive: config.isActive
})

const loadModelConfigs = async () => {
  try {
    const userId = await getCurrentUserId()
    const configs = await getModelConfigs(userId)
    const savedModels = configs.map(toModelOption)

    const activeModel = savedModels.find((model) => model.isActive)
    if (activeModel) {
      activeModel.apiKey = await getStoredModelApiKey(userId, Number(activeModel.id)) || undefined
    }

    modelOptions.value = [{ ...DEFAULT_MODEL }, ...savedModels]
    agentWorkspaceStore.setModel(activeModel?.id ?? DEFAULT_MODEL.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : '模型配置加载失败'
    ElMessage.error(message)
  }
}

const parseMessageTime = (value: string) => {
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? Date.now() : timestamp
}

const buildConversations = (
  savedConversations: SavedAIConversation[],
  savedMessages: SavedAIMessage[]
): AgentConversation[] => {
  const savedConversationIds = new Set(savedConversations.map((conversation) => conversation.id))
  const conversationMap = new Map<string, AgentConversation>(
    savedConversations.map((conversation) => [
      conversation.id,
      {
        id: conversation.id,
        title: conversation.title,
        createdAt: parseMessageTime(conversation.createdAt),
        updatedAt: parseMessageTime(conversation.updatedAt),
        messages: []
      }
    ])
  )

  savedMessages
    .slice()
    .sort((left, right) => parseMessageTime(left.createdAt) - parseMessageTime(right.createdAt))
    .forEach((message) => {
      const createdAt = parseMessageTime(message.createdAt)
      let conversation = conversationMap.get(message.conversationId)

      if (!conversation) {
        conversation = {
          id: message.conversationId,
          title: '新的对话',
          createdAt,
          updatedAt: createdAt,
          messages: []
        }
        conversationMap.set(message.conversationId, conversation)
      }

      conversation.messages.push({
        id: message.id,
        role: message.role,
        content: message.content,
        status: 'completed',
        createdAt
      })
      conversation.updatedAt = Math.max(conversation.updatedAt, createdAt)

      if (
        !savedConversationIds.has(conversation.id)
        && message.role === 'user'
        && conversation.title === '新的对话'
      ) {
        conversation.title = message.content.trim().replace(/\s+/g, ' ').slice(0, 24) || '新的对话'
      }
    })

  return Array.from(conversationMap.values())
    .sort((left, right) => right.updatedAt - left.updatedAt)
}

const loadMessageHistory = async () => {
  try {
    const userId = await getCurrentUserId()
    const [savedConversations, savedMessages] = await Promise.all([
      getAIConversations(userId),
      loadMessage(userId)
    ])
    agentWorkspaceStore.setConversations(buildConversations(savedConversations, savedMessages))
    void scrollToBottom()
  } catch (error) {
    const message = error instanceof Error ? error.message : '聊天消息加载失败'
    ElMessage.error(message)
  }
}

const suggestions: AgentSuggestion[] = [
  {
    id: 'plan-feature',
    title: '规划一个新功能',
    description: '先梳理需求、边界与实现步骤',
    prompt: '帮我规划一个新功能，先梳理需求、边界和实现步骤。',
    icon: Operation
  },
  {
    id: 'understand-project',
    title: '理解现有项目',
    description: '扫描目录并解释关键调用链',
    prompt: '请分析当前工作区的目录结构，并解释关键调用链。',
    icon: Search
  },
  {
    id: 'fix-problem',
    title: '修复一个问题',
    description: '定位原因、生成补丁并验证结果',
    prompt: '帮我定位并修复一个问题，修改前先说明原因和计划。',
    icon: Monitor
  }
]

const startOfToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

const conversationGroups = computed<AgentConversationGroup[]>(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  const conversations = agentWorkspaceStore.conversations
    .filter((conversation) => !keyword || conversation.title.toLowerCase().includes(keyword))
    .sort((left, right) => right.updatedAt - left.updatedAt)
  const todayStart = startOfToday()
  const lastSevenDays = todayStart - 7 * 24 * 60 * 60 * 1000
  const groups: AgentConversationGroup[] = [
    {
      key: 'today',
      label: '今天',
      showMenu: true,
      items: conversations.filter((conversation) => conversation.updatedAt >= todayStart)
    },
    {
      key: 'last-seven-days',
      label: '过去 7 天',
      items: conversations.filter(
        (conversation) => conversation.updatedAt < todayStart && conversation.updatedAt >= lastSevenDays
      )
    },
    {
      key: 'earlier',
      label: '更早',
      items: conversations.filter((conversation) => conversation.updatedAt < lastSevenDays)
    }
  ]

  return groups.filter((group) => group.items.length > 0 || group.key === 'today')
})

const visibleConversationCount = computed(() => {
  return conversationGroups.value.reduce((total, group) => total + group.items.length, 0)
})

const canSubmit = computed(() => {
  return draft.value.trim().length > 0 || attachments.value.length > 0
})

const formatRelativeTime = (timestamp: number) => {
  const difference = Date.now() - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (difference < minute) return '刚刚'
  if (difference < hour) return `${Math.floor(difference / minute)} 分钟前`
  if (difference < day) return `${Math.floor(difference / hour)} 小时前`
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

const formatMessageTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const focusComposer = async () => {
  await nextTick()
  composerInputRef.value?.focus()
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageThreadRef.value) messageThreadRef.value.scrollTop = messageThreadRef.value.scrollHeight
}

const stopActiveSimulation = () => {
  activeRequestController.value?.abort()
  activeRequestController.value = null

  if (activeSimulation.value) {
    agentWorkspaceStore.stopGenerating(
      activeSimulation.value.conversationId,
      activeSimulation.value.messageId
    )
  }
  activeSimulation.value = null
}

const handleCreateTask = () => {
  stopActiveSimulation()
  agentWorkspaceStore.createNewTask()
  void focusComposer()
}

const handleToggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
  if (isSidebarCollapsed.value) closeSearch()
}

const handleSearch = async () => {
  isSidebarCollapsed.value = false
  isSearchOpen.value = true
  await nextTick()
  searchInputRef.value?.focus()
}

const closeSearch = () => {
  searchQuery.value = ''
  isSearchOpen.value = false
}

const handleOpenWorkspace = () => {
  workspaceDialogVisible.value = true
}

const handleHistoryCommand = (command: string) => {
  if (command === 'refresh') void loadMessageHistory()
}

const handleSelectConversation = (conversation: AgentConversation) => {
  agentWorkspaceStore.selectConversation(conversation.id)
  void scrollToBottom()
}

const handleConversationCommand = (command: string, conversation: AgentConversation) => {
  if (command === 'rename') {
    Object.assign(actionDialog, {
      visible: true,
      action: 'rename',
      conversationId: conversation.id,
      title: '重命名会话',
      description: '使用一个简短、清晰的名称，方便之后快速找到这段对话。',
      confirmText: '保存名称',
      initialValue: conversation.title,
      placeholder: '输入新的会话名称'
    })
    return
  }

  if (command === 'delete') {
    Object.assign(actionDialog, {
      visible: true,
      action: 'delete',
      conversationId: conversation.id,
      title: '删除会话',
      description: `“${conversation.title}”及其中的模拟消息都会被删除，此操作无法撤销。`,
      confirmText: '删除会话',
      initialValue: '',
      placeholder: ''
    })
  }
}

const handleActionDialogConfirm = async (value: string) => {
  try {
    const userId = await getCurrentUserId()

    if (actionDialog.action === 'rename') {
      await renameAIConversation({
        userId,
        conversationId: actionDialog.conversationId,
        title: value
      })
      agentWorkspaceStore.renameConversation(actionDialog.conversationId, value)
      ElMessage.success('会话名称已更新')
      return
    }

    if (actionDialog.action === 'delete') {
      if (activeSimulation.value?.conversationId === actionDialog.conversationId) stopActiveSimulation()
      await deleteAIConversation(actionDialog.conversationId, userId)
      agentWorkspaceStore.deleteConversation(actionDialog.conversationId)
      ElMessage.success('会话已删除')
      return
    }

    stopActiveSimulation()
    agentWorkspaceStore.clearConversations()
    ElMessage.success('会话已清空')
  } catch (error) {
    const message = error instanceof Error ? error.message : '会话操作失败'
    ElMessage.error(message)
  }
}

const handleAccount = () => {
  settingsDialogVisible.value = true
}

const handleSelectWorkspace = () => {
  workspaceDialogVisible.value = true
}

const handleChooseWorkspace = (workspace: AgentWorkspaceOption) => {
  agentWorkspaceStore.setWorkspace(workspace.name)
  workspaceDialogVisible.value = false
  ElMessage.success(`已切换到 ${workspace.name}`)
}

const loadLocalWorkspaces = async () => {
  try {
    const saved = await (window as any).uploadFileApi.listWorkspaces()
    if (!Array.isArray(saved)) return
    workspaceOptions.value = saved.map((item: { name: string; path: string }) => ({
      name: item.name,
      path: item.path
    })) as AgentWorkspaceOption[]
    if (!agentWorkspaceStore.selectedWorkspace && workspaceOptions.value.length > 0) {
      agentWorkspaceStore.setWorkspace(workspaceOptions.value[0].name)
    }
  } catch (error) {
    console.error('读取本地工作区列表失败', error)
  }
}

const handleAddWorkspace = async () => {
  if (isWorkspaceRegistering.value) return

  try {
    const dirInfo = await (window as any).uploadFileApi.selectFile('storeLocation')
    if (!dirInfo?.localPath) return

    const workspaceName = dirInfo.fileName || '本地工作区'
    isWorkspaceRegistering.value = true
    // 注册只是本地行为：把 "别名 → 绝对路径" 写进本机 sqlite，服务端不参与
    const result = await (window as any).uploadFileApi.registerWorkspace(
      workspaceName,
      dirInfo.localPath
    ) as { name?: string; rootPath?: string; error?: string }
    if (result?.error) throw new Error(result.error)
    if (!result?.name) throw new Error('注册工作区没有返回结果')

    const workspace: AgentWorkspaceOption = {
      name: result.name,
      path: result.rootPath || dirInfo.localPath
    }
    const existingIndex = workspaceOptions.value.findIndex(
      (item) => item.name === workspace.name
    )
    if (existingIndex >= 0) {
      workspaceOptions.value[existingIndex] = workspace
    } else {
      workspaceOptions.value.push(workspace)
    }
    agentWorkspaceStore.setWorkspace(workspace.name)
    workspaceDialogVisible.value = false
    ElMessage.success(`已添加工作区 ${workspace.name}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : '添加工作区失败'
    ElMessage.error(message)
  } finally {
    isWorkspaceRegistering.value = false
  }
}

const handleSelectBranch = (branch: string) => {
  agentWorkspaceStore.setBranch(branch)
}

const handleSelectSuggestion = (suggestion: AgentSuggestion) => {
  draft.value = suggestion.prompt
  void focusComposer()
}

const addSelectedFile = async (selectionType: 'uploadFile' | 'storeLocation') => {
  try {
    const fileInfo = await (window as any).uploadFileApi?.selectFile(selectionType)
    if (!fileInfo) return

    agentWorkspaceStore.addAttachment({
      id: fileInfo.fileId || `attachment-${Date.now()}`,
      name: fileInfo.fileName || '未命名文件',
      size: fileInfo.fileSize || 0,
      type: fileInfo.fileType || 5,
      localPath: fileInfo.localPath
    })
  } catch {
    // 关闭系统选择框时不添加附件
  }
}

const handleAttachmentCommand = (command: string) => {
  if (command === 'file') void addSelectedFile('uploadFile')
  if (command === 'folder') void addSelectedFile('storeLocation')
  if (command === 'snippet') {
    draft.value = `${draft.value}${draft.value ? '\n\n' : ''}\`\`\`\n在这里粘贴代码\n\`\`\``
    void focusComposer()
  }
}

const handleFileDrop = (event: DragEvent) => {
  Array.from(event.dataTransfer?.files ?? []).forEach((file) => {
    agentWorkspaceStore.addAttachment({
      id: `drop-${file.name}-${file.size}`,
      name: file.name,
      size: file.size,
      type: 5
    })
  })
}

const removeAttachment = (attachmentId: string) => {
  agentWorkspaceStore.removeAttachment(attachmentId)
}

const handleSelectMode = (mode: string) => {
  agentWorkspaceStore.setMode(mode as AgentMode)
}

const handleSelectModel = async (modelId: string) => {
  const model = modelOptions.value.find((item) => item.id === modelId)
  if (!model || model.id === selectedModel.value) return

  try {
    const userId = await getCurrentUserId()
    const apiKey = model.isDefault
      ? undefined
      : await getStoredModelApiKey(userId, Number(model.id)) || undefined
    await switchModelConfig({
      userId,
      configId: model.isDefault ? null : Number(model.id)
    })
    modelOptions.value.forEach((item) => {
      if (!item.isDefault) item.apiKey = undefined
    })
    model.apiKey = apiKey
    agentWorkspaceStore.setModel(model.id)
    ElMessage.success(`已切换到 ${model.modelName}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : '模型切换失败'
    ElMessage.error(message)
  }
}

const handleOpenModelConfig = () => {
  editingModelId.value = null
  editingModelConfig.value = null
  modelConfigDialogVisible.value = true
}

const handleEditSelectedModel = () => {
  const model = selectedModelOption.value
  if (model.isDefault) return

  editingModelId.value = model.id
  editingModelConfig.value = {
    configName: model.configName,
    providerName: model.providerName,
    modelName: model.modelName,
    baseUrl: model.baseUrl ?? '',
    apiKey: model.apiKey ?? '',
    modelTemperature: model.modelTemperature ?? 1
  }
  modelConfigDialogVisible.value = true
}

const handleModelConfigSubmit = async (config: AgentModelConfig) => {
  const configId = editingModelId.value

  try {
    const userId = await getCurrentUserId()

    if (configId !== null) {
      await updateModelConfig({
        userId,
        configId: Number(configId),
        configName: config.configName,
        providerName: config.providerName,
        modelName: config.modelName,
        baseUrl: config.baseUrl || null,
        modelTemperature: config.modelTemperature
      })
      await setStoredModelApiKey(userId, Number(configId), config.apiKey)

      const modelIndex = modelOptions.value.findIndex((model) => model.id === configId)
      if (modelIndex >= 0) {
        modelOptions.value[modelIndex] = {
          ...modelOptions.value[modelIndex],
          configName: config.configName,
          providerName: config.providerName,
          modelName: config.modelName,
          description: config.configName,
          baseUrl: config.baseUrl || undefined,
          apiKey: config.apiKey || undefined,
          modelTemperature: config.modelTemperature
        }
      }

      editingModelId.value = null
      editingModelConfig.value = null
      ElMessage.success('模型配置已更新')
      return
    }

    const response = await addModelConfig({
      userId,
      configName: config.configName,
      providerName: config.providerName,
      modelName: config.modelName,
      baseUrl: config.baseUrl || null,
      modelTemperature: config.modelTemperature
    })
    await setStoredModelApiKey(userId, response.configId, config.apiKey)

    const model: ModelOption = {
      id: String(response.configId),
      configName: config.configName,
      providerName: config.providerName,
      modelName: config.modelName,
      description: config.configName,
      baseUrl: config.baseUrl || undefined,
      apiKey: config.apiKey || undefined,
      modelTemperature: config.modelTemperature,
      isActive: true
    }

    await switchModelConfig({ userId, configId: response.configId })
    modelOptions.value.forEach((item) => {
      if (!item.isDefault) item.apiKey = undefined
    })
    modelOptions.value.push(model)
    agentWorkspaceStore.setModel(model.id)
    ElMessage.success(`已添加并切换到 ${model.modelName}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : '模型添加失败'
    ElMessage.error(message)
  }
}

const handleDeleteSelectedModel = async () => {
  const model = selectedModelOption.value
  if (model.isDefault) return

  try {
    await ElMessageBox.confirm(
      `确定删除模型配置“${model.configName}”吗？`,
      '删除模型',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const userId = await getCurrentUserId()
    await deleteModelConfig(Number(model.id), userId)
    await setStoredModelApiKey(userId, Number(model.id), '')
    modelOptions.value = modelOptions.value.filter((item) => item.id !== model.id)
    agentWorkspaceStore.setModel(DEFAULT_MODEL.id)
    ElMessage.success('模型配置已删除')
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    const message = error instanceof Error ? error.message : '模型删除失败'
    ElMessage.error(message)
  }
}

const handleStopGenerating = () => {
  stopActiveSimulation()
  ElMessage.info('已停止生成')
}

const workspaceToolLabels: Record<AIWorkspaceToolOperation, string> = {
  list: '列出目录 · list_workspace_files',
  read: '读取文件 · read_workspace_file',
  write: '写入文件 · write_workspace_file',
  edit: '修改文件 · edit_workspace_file',
  delete: '删除文件 · delete_workspace_file',
  search: '搜索代码 · search_workspace_text',
  command: '执行命令 · run_workspace_command',
}

const handleWorkspaceToolCompleted = (
  data: AIWorkspaceToolCompletedData,
  conversationId: string,
  messageId: string
) => {
  // 只更新已有步骤状态，不再新建步骤；toolCallId 与 tool.request 一致
  agentWorkspaceStore.finishToolStep(
    conversationId,
    messageId,
    data.toolCallId,
    data.success !== false
  )
}

const handleWorkspaceToolRequest = async (
  request: AIWorkspaceToolRequest,
  userId: string,
  conversationId: string,
  messageId: string
) => {
  agentWorkspaceStore.startToolStep(conversationId, messageId, {
    id: request.toolCallId,
    title: `${workspaceToolLabels[request.operation]} · ${request.path || '/'}`,
    status: 'running',
    statusLabel: '执行中'
  })
  void scrollToBottom()

  try {
    console.info('[工具] 开始调用 Electron', request)

    const result = await (window as any).uploadFileApi.executeWorkspaceTool(
      request
    ) as AIWorkspaceToolExecutionResult

    await submitAIWorkspaceToolResult({
      toolCallId: request.toolCallId,
      workspaceName: request.workspaceName,
      userId,
      success: result.success,
      content: result.content
    })
    agentWorkspaceStore.finishToolStep(
      conversationId,
      messageId,
      request.toolCallId,
      result.success
    )
  } catch (error) {
    try {
      await submitAIWorkspaceToolResult({
        toolCallId: request.toolCallId,
        workspaceName: request.workspaceName,
        userId,
        success: false,
        error: error instanceof Error ? error.message : '本地文件工具执行失败'
      })
    } finally {
      agentWorkspaceStore.finishToolStep(
        conversationId,
        messageId,
        request.toolCallId,
        false
      )
    }
  }
  void scrollToBottom()
}

const handleSubmit = async () => {
  if (!canSubmit.value || isGenerating.value) return

  const attachmentNames = attachments.value.map((attachment) => attachment.name).join('、')
  const content = [draft.value.trim(), attachmentNames ? `附件：${attachmentNames}` : '']
    .filter(Boolean)
    .join('\n')
  const conversationId = agentWorkspaceStore.ensureConversation(content)
  agentWorkspaceStore.addUserMessage(conversationId, content)
  const messageId = agentWorkspaceStore.addAssistantPlaceholder(
    conversationId,
    mockSettings.showToolSteps
  )

  if (!messageId) return

  draft.value = ''
  agentWorkspaceStore.clearAttachments()
  activeSimulation.value = { conversationId, messageId }
  void scrollToBottom()

  const controller = new AbortController()
  activeRequestController.value = controller

  try {
    const userId = await getCurrentUserId()

    const requestData: SendAIMessageRequest = {
      id: messageId,
      conversationId,
      userId,
      role: 'user',
      messageType: 1,
      content,
      workspaceName: selectedWorkspace.value ?? undefined,
      config: {
        providerName: selectedModelOption.value.providerName,
        modelName: selectedModelOption.value.modelName,
        apiKey: selectedModelOption.value.apiKey,
        baseUrl: selectedModelOption.value.baseUrl,
        modelTemperature: selectedModelOption.value.modelTemperature ?? 1,
        enableThink: enableThink.value,
        configId: selectedModelOption.value.isDefault
          ? undefined
          : Number(selectedModelOption.value.id)
      }
    }

    // 等待 AI 响应流式返回
    const responseContent = await streamAIMessage(
      requestData,
      {
        onStarted: (delta) => {
        },
        onReasoningDelta: (delta) => {
          if (
            activeSimulation.value?.conversationId !== conversationId ||
            activeSimulation.value?.messageId !== messageId
          ) {
            return
          }

          agentWorkspaceStore.appendAssistantReasoning(conversationId, messageId, delta)
          void scrollToBottom()
        },
        onDelta: (delta) => {
          if (
            activeSimulation.value?.conversationId !== conversationId ||
            activeSimulation.value?.messageId !== messageId
          ) {
            return
          }

          agentWorkspaceStore.appendAssistantContent(conversationId, messageId, delta)
          void scrollToBottom()
        },
        onCompleted: ({ content: completedContent, reasoningContent }) => {
          if (
            activeSimulation.value?.conversationId !== conversationId ||
            activeSimulation.value?.messageId !== messageId
          ) {
            return
          }

          agentWorkspaceStore.setAssistantContent(
            conversationId,
            messageId,
            completedContent
          )
          agentWorkspaceStore.setAssistantReasoning(
            conversationId,
            messageId,
            reasoningContent
          )
        },
        onToolRequest: (toolRequest) => handleWorkspaceToolRequest(
          toolRequest,
          userId,
          conversationId,
          messageId
        ),
        onToolCompleted: (toolData) => handleWorkspaceToolCompleted(
          toolData,
          conversationId,
          messageId
        ),
        onDone: () => {
          void scrollToBottom()
        }
      },
      controller.signal
    )

    if (
      activeSimulation.value?.conversationId !== conversationId ||
      activeSimulation.value?.messageId !== messageId
    ) {
      return
    }

    agentWorkspaceStore.setAssistantContent(conversationId, messageId, responseContent)
    agentWorkspaceStore.completeAssistantMessage(conversationId, messageId)
    void scrollToBottom()
    activeSimulation.value = null
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return

    if (
      activeSimulation.value?.conversationId !== conversationId ||
      activeSimulation.value?.messageId !== messageId
    ) {
      return
    }

    const errorMessage = error instanceof Error ? error.message : 'AI 服务请求失败'
    agentWorkspaceStore.failAssistantMessage(
      conversationId,
      messageId,
      `请求失败：${errorMessage}`
    )
    ElMessage.error(errorMessage)
    activeSimulation.value = null
  } finally {
    if (activeRequestController.value === controller) {
      activeRequestController.value = null
    }
  }
}

const handleGlobalShortcut = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    handleCreateTask()
  }
}

onMounted(() => {
  localStorage.removeItem('agent-workspace')
  normalizeSelectedModel()
  void loadLocalWorkspaces()
  void loadModelConfigs()
  void loadMessageHistory()
  window.addEventListener('keydown', handleGlobalShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalShortcut)
  stopActiveSimulation()
})
</script>

<style scoped>
.agent-workbench {
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-strong);
  background:
    radial-gradient(circle at 76% 18%, rgba(var(--color-accent-rgb), 0.12), transparent 36%),
    linear-gradient(145deg, rgba(var(--color-surface-rgb), 0.8), var(--color-surface-1));
  -webkit-app-region: no-drag;
}

button,
textarea {
  font: inherit;
}

button {
  color: inherit;
  cursor: pointer;
}

.agent-sidebar {
  position: relative;
  display: flex;
  flex: 0 0 248px;
  flex-direction: column;
  min-width: 0;
  padding: 18px 14px 14px;
  background: rgba(var(--color-surface-rgb), 0.68);
  border-right: 1px solid var(--color-border-subtle);
  backdrop-filter: blur(20px);
  transition: flex-basis 0.22s ease, padding 0.22s ease;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  height: 46px;
  padding: 0 8px;
}

.brand-mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: #071014;
  font-size: 18px;
  background: linear-gradient(145deg, var(--color-accent), rgba(var(--color-accent-rgb), 0.92));
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(var(--color-accent-rgb), 0.16);
}

.brand-copy,
.account-copy,
.suggestion-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.brand-copy strong {
  font-size: 14px;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.brand-copy span {
  margin-top: 2px;
  color: var(--color-text-muted);
  font-size: 11px;
}

.sidebar-collapse {
  position: absolute;
  top: 28px;
  right: -11px;
  z-index: 4;
  display: grid;
  width: 23px;
  height: 23px;
  place-items: center;
  color: var(--color-text-secondary);
  font-size: 11px;
  background: var(--color-bg-deep);
  border: 1px solid var(--color-border-subtle);
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: color 0.18s ease, border-color 0.18s ease;
}

.sidebar-collapse:hover {
  color: var(--color-accent);
  border-color: rgba(var(--color-accent-rgb), 0.32);
}

.sidebar-collapse .el-icon {
  transition: transform 0.22s ease;
}

.agent-sidebar.is-collapsed {
  flex-basis: 68px;
  padding-right: 10px;
  padding-left: 10px;
}

.agent-sidebar.is-collapsed .brand-copy,
.agent-sidebar.is-collapsed .button-leading span,
.agent-sidebar.is-collapsed .new-task-button kbd,
.agent-sidebar.is-collapsed .sidebar-nav-item span,
.agent-sidebar.is-collapsed .history-panel,
.agent-sidebar.is-collapsed .account-copy,
.agent-sidebar.is-collapsed .account-entry .status-dot {
  display: none;
}

.agent-sidebar.is-collapsed .sidebar-brand,
.agent-sidebar.is-collapsed .new-task-button,
.agent-sidebar.is-collapsed .sidebar-nav-item,
.agent-sidebar.is-collapsed .account-entry {
  justify-content: center;
  padding-right: 0;
  padding-left: 0;
}

.agent-sidebar.is-collapsed .button-leading {
  gap: 0;
}

.agent-sidebar.is-collapsed .sidebar-collapse .el-icon {
  transform: rotate(180deg);
}

.new-task-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 40px;
  margin-top: 17px;
  padding: 0 11px;
  color: var(--color-text-strong);
  background: rgba(var(--color-accent-rgb), 0.15);
  border: 1px solid rgba(var(--color-accent-rgb), 0.22);
  border-radius: 9px;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.new-task-button:hover {
  background: rgba(var(--color-accent-rgb), 0.23);
  border-color: rgba(var(--color-accent-rgb), 0.36);
}

.button-leading {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  font-weight: 600;
}

kbd {
  padding: 2px 5px;
  color: var(--color-text-muted);
  font-family: inherit;
  font-size: 9px;
  background: rgba(var(--color-surface-rgb), 0.4);
  border: 1px solid var(--color-border-subtle);
  border-radius: 4px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 12px;
  padding-bottom: 13px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  color: var(--color-text-secondary);
  font-size: 12px;
  text-align: left;
  border-radius: 7px;
  transition: color 0.18s ease, background 0.18s ease;
}

.sidebar-nav-item:hover {
  color: var(--color-text-strong);
  background: rgba(var(--color-surface-rgb), 0.4);
}

.sidebar-search {
  display: flex;
  width: 100%;
  height: 36px;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.sidebar-search.is-open {
  background: rgba(var(--color-surface-rgb), 0.4);
  border-color: rgba(111, 228, 239, 0.2);
  box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb), 0.035);
}

.sidebar-search.is-open .sidebar-nav-item {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  justify-content: center;
  padding: 0;
  color: rgba(111, 228, 239, 0.78);
  background: transparent;
}

.sidebar-search input {
  width: 0;
  min-width: 0;
  flex: 1;
  padding: 0 4px;
  color: var(--color-text-primary);
  font: inherit;
  font-size: 11px;
  line-height: 32px;
  background: transparent;
  border: 0;
  outline: 0;
  user-select: text;
}

.sidebar-search input::placeholder {
  color: var(--color-text-muted);
}

.search-close {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  margin-right: 2px;
  color: var(--color-text-muted);
  font-size: 12px;
  border-radius: 6px;
  transition: color 0.15s ease, background 0.15s ease;
}

.search-close:hover {
  color: var(--color-text-primary);
  background: rgba(var(--color-surface-rgb), 0.4);
}

.history-panel {
  flex: 1;
  min-height: 0;
  margin-top: 13px;
  overflow-y: auto;
  scrollbar-width: none;
}

.history-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 8px;
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.history-heading :deep(.agent-dropdown-trigger) {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  color: var(--color-text-muted);
  border-radius: 5px;
}

.history-heading :deep(.agent-dropdown-trigger:hover),
.history-heading :deep(.agent-dropdown-trigger[aria-expanded='true']) {
  color: var(--color-text-strong);
  background: rgba(var(--color-surface-rgb), 0.4);
}

.history-heading-spaced {
  margin-top: 12px;
}

.history-item-row {
  position: relative;
}

.history-item {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 3px;
  padding: 9px 34px 9px 12px;
  text-align: left;
  border-radius: 8px;
  transition: background 0.18s ease;
}

.history-item:hover {
  background: rgba(var(--color-surface-rgb), 0.4);
}

.history-item.is-active {
  background: rgba(var(--color-accent-rgb), 0.18);
}

.history-item.is-active::before {
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 0;
  width: 2px;
  background: var(--color-accent);
  border-radius: 2px;
  content: '';
}

.history-item-title {
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.history-item-meta {
  color: var(--color-text-muted);
  font-size: 9px;
}

.history-item-row :deep(.conversation-more) {
  position: absolute;
  top: 8px;
  right: 5px;
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  color: var(--color-text-muted);
  font-size: 12px;
  border-radius: 6px;
  opacity: 0;
  transition: color 0.15s ease, background 0.15s ease, opacity 0.15s ease;
}

.history-item-row:hover :deep(.conversation-more),
.history-item-row :deep(.conversation-more[aria-expanded='true']) {
  opacity: 1;
}

.history-item-row :deep(.conversation-more:hover),
.history-item-row :deep(.conversation-more[aria-expanded='true']) {
  color: var(--color-text-primary);
  background: rgba(var(--color-surface-rgb), 0.4);
}

.history-empty {
  padding: 22px 10px;
  color: var(--color-text-muted);
  font-size: 10px;
  line-height: 1.6;
  text-align: center;
}

.sidebar-footer {
  padding-top: 12px;
  border-top: 1px solid var(--color-border-subtle);
}

.account-entry {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 7px 8px;
  text-align: left;
  border-radius: 8px;
}

.account-entry:hover {
  background: rgba(var(--color-surface-rgb), 0.4);
}

.account-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-accent);
  font-size: 9px;
  font-weight: 700;
  background: rgba(var(--color-accent-rgb), 0.08);
  border: 1px solid rgba(var(--color-accent-rgb), 0.2);
  border-radius: 8px;
}

.account-copy {
  flex: 1;
  margin-left: 9px;
}

.account-copy strong {
  font-size: 11px;
  font-weight: 600;
}

.account-copy small {
  margin-top: 2px;
  color: var(--color-text-muted);
  font-size: 9px;
}

.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  background: var(--color-accent);
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(var(--color-accent-rgb), 0.65);
}

.workspace-panel {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 68px;
  flex: 0 0 auto;
  padding: 0 136px 0 24px;
  background: rgba(var(--color-surface-rgb), 0.55);
  border-bottom: 1px solid var(--color-border-subtle);
  -webkit-app-region: drag;
}

.workspace-title {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.workspace-eyebrow {
  color: rgba(var(--color-accent-rgb), 0.58);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.workspace-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workspace-name-row h1 {
  font-size: 16px;
  font-weight: 620;
}

.draft-badge {
  padding: 2px 6px;
  color: var(--color-text-muted);
  font-size: 8px;
  background: rgba(var(--color-surface-rgb), 0.4);
  border: 1px solid var(--color-border-subtle);
  border-radius: 10px;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: 10px;
  -webkit-app-region: no-drag;
}

.branch-dot {
  width: 6px;
  height: 6px;
  background: rgba(174, 182, 193, 0.5);
  border-radius: 50%;
}

.workspace-content {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 22px 28px 18px;
}

.message-thread {
  width: min(700px, 100%);
  flex: 1;
  min-height: 0;
  padding: 8px 8px 28px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(var(--color-accent-rgb), 0.18) transparent;
}

.agent-message {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 12px;
  padding: 17px 4px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.agent-message:last-child {
  border-bottom: none;
}

.message-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 650;
  background: rgba(var(--color-accent-rgb), 0.08);
  border: 1px solid rgba(var(--color-accent-rgb), 0.18);
  border-radius: 9px;
}

.agent-message.is-user .message-avatar {
  color: var(--color-text-secondary);
  background: rgba(var(--color-surface-rgb), 0.4);
  border-color: var(--color-border-subtle);
}

.message-body {
  min-width: 0;
  padding-top: 1px;
}

.message-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-heading strong {
  font-size: 11px;
  font-weight: 620;
}

.message-heading span {
  color: var(--color-text-muted);
  font-size: 8px;
}

.message-reasoning {
  margin-top: 8px;
  overflow: hidden;
  color: var(--color-text-muted);
  background: rgba(var(--color-surface-rgb), 0.4);
  border: 1px solid var(--color-border-subtle);
  border-radius: 8px;
}

.message-reasoning summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  font-size: 9px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.message-reasoning summary::before {
  content: '›';
  color: rgba(var(--color-accent-rgb), 0.7);
  font-size: 13px;
  transition: transform 0.16s ease;
}

.message-reasoning[open] summary::before {
  transform: rotate(90deg);
}

.message-reasoning summary::-webkit-details-marker {
  display: none;
}

.message-reasoning p {
  max-height: 220px;
  margin: 0;
  overflow: auto;
  padding: 0 9px 9px;
  font-size: 9px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
}

.message-content {
  margin-top: 7px;
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
}

.tool-step-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 11px;
  padding: 8px;
  background: rgba(var(--color-surface-rgb), 0.4);
  border: 1px solid var(--color-border-subtle);
  border-radius: 8px;
}

.tool-step {
  display: grid;
  grid-template-columns: 7px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  min-height: 22px;
  padding: 0 4px;
  color: var(--color-text-secondary);
  font-size: 9px;
}

.tool-step small {
  color: var(--color-text-muted);
  font-size: 8px;
}

.tool-step-status {
  width: 6px;
  height: 6px;
  background: rgba(var(--color-surface-rgb), 0.4);
  border-radius: 50%;
}

.tool-step-status.is-running {
  background: rgba(var(--color-accent-rgb), 0.72);
  box-shadow: 0 0 7px rgba(var(--color-accent-rgb), 0.48);
}

.tool-step-status.is-completed {
  background: rgba(var(--color-accent-rgb), 0.86);
}

.tool-step-status.is-failed {
  background: rgba(238, 104, 104, 0.82);
}

.streaming-cursor {
  display: inline-block;
  width: 5px;
  height: 12px;
  margin-top: 8px;
  background: var(--color-accent);
  border-radius: 1px;
  animation: cursor-blink 1s steps(2, start) infinite;
}

@keyframes cursor-blink {
  50% {
    opacity: 0.18;
  }
}

.welcome-panel {
  display: flex;
  width: min(620px, 100%);
  flex: 1;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 8px;
}

.agent-orb {
  position: relative;
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  color: var(--color-accent);
  font-size: 22px;
  background: var(--color-bg-deep);
  border: 1px solid rgba(var(--color-accent-rgb), 0.22);
  border-radius: 16px;
  box-shadow: inset 0 0 22px rgba(var(--color-accent-rgb), 0.08), 0 10px 34px rgba(0, 0, 0, 0.26);
}

.orb-glow {
  position: absolute;
  inset: -16px;
  z-index: -1;
  background: radial-gradient(circle, rgba(var(--color-accent-rgb), 0.15), transparent 67%);
}

.welcome-kicker {
  margin-top: 16px;
  color: rgba(var(--color-accent-rgb), 0.52);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.welcome-panel h2 {
  margin-top: 7px;
  font-size: 25px;
  font-weight: 560;
  letter-spacing: -0.03em;
}

.welcome-description {
  max-width: 500px;
  margin-top: 9px;
  color: var(--color-text-muted);
  font-size: 11px;
  line-height: 1.7;
  text-align: center;
}

.suggestion-grid {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  margin-top: 24px;
}

.suggestion-card {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
  min-height: 66px;
  padding: 10px;
  text-align: left;
  background: rgba(var(--color-surface-rgb), 0.4);
  border: 1px solid var(--color-border-subtle);
  border-radius: 10px;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.suggestion-card:hover {
  background: rgba(var(--color-accent-rgb), 0.11);
  border-color: rgba(var(--color-accent-rgb), 0.19);
  transform: translateY(-1px);
}

.suggestion-icon {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  color: rgba(var(--color-accent-rgb), 0.78);
  background: rgba(var(--color-accent-rgb), 0.07);
  border-radius: 8px;
}

.suggestion-copy {
  flex: 1;
}

.suggestion-copy strong {
  overflow: hidden;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.suggestion-copy small {
  display: -webkit-box;
  margin-top: 4px;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 8px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.suggestion-arrow {
  flex: 0 0 auto;
  color: var(--color-text-muted);
  font-size: 11px;
}

.composer-area {
  width: min(680px, 100%);
  flex: 0 0 auto;
}

.composer-shell {
  padding: 11px 12px 9px;
  background: var(--color-bg-deep);
  border: 1px solid var(--color-border-subtle);
  border-radius: 14px;
  box-shadow: var(--shadow-md);
}

.attachment-list {
  display: flex;
  max-height: 76px;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 7px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.attachment-chip {
  display: flex;
  max-width: 250px;
  height: 30px;
  align-items: center;
  gap: 6px;
  padding: 0 5px 0 8px;
  color: var(--color-text-secondary);
  font-size: 10px;
  background: rgba(var(--color-surface-rgb), 0.4);
  border: 1px solid var(--color-border-subtle);
  border-radius: 7px;
}

.attachment-chip>.el-icon {
  flex: 0 0 auto;
  color: rgba(111, 228, 239, 0.74);
}

.attachment-chip>span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.attachment-chip small {
  flex: 0 0 auto;
  color: var(--color-text-muted);
  font-size: 8px;
}

.attachment-chip button {
  display: grid;
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-text-muted);
  border-radius: 5px;
}

.attachment-chip button:hover {
  color: var(--color-text-primary);
  background: rgba(var(--color-surface-rgb), 0.4);
}

.composer-shell textarea {
  width: 100%;
  min-height: 58px;
  padding: 2px 3px;
  overflow-y: auto;
  color: var(--color-text-strong);
  font-size: 12px;
  line-height: 1.65;
  resize: none;
  user-select: text;
  scrollbar-width: none;
}

.composer-shell textarea::placeholder {
  color: var(--color-text-muted);
}

.composer-footer,
.composer-tools,
.composer-actions,
.composer-meta {
  display: flex;
  align-items: center;
}

.composer-footer {
  justify-content: space-between;
  margin-top: 5px;
}

.composer-tools,
.composer-actions {
  gap: 5px;
}

.workspace-selector {
  max-width: 120px;
}

:deep(.composer-tool),
:deep(.composer-selector) {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 27px;
  color: var(--color-text-muted);
  border: 1px solid transparent;
  border-radius: 6px;
}

:deep(.composer-tool) {
  width: 27px;
  font-size: 14px;
}

:deep(.composer-selector) {
  max-width: 128px;
  gap: 4px;
  padding: 0 6px;
  color: var(--color-text-muted);
  font-size: 8px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
}

:deep(.composer-selector > span:not(.branch-dot):not(.mode-indicator)) {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

:deep(.composer-selector > .el-icon) {
  width: 9px;
  flex: 0 0 auto;
  font-size: 9px;
}

.model-add-button,
.model-edit-button,
.model-delete-button {
  display: grid;
  width: 25px;
  height: 25px;
  flex: 0 0 auto;
  place-items: center;
  color: rgba(174, 182, 193, 0.62);
  font-size: 10px;
  background: transparent;
  border: 1px solid var(--color-border-subtle);
  border-radius: 6px;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.model-add-button:hover,
.model-edit-button:hover:not(:disabled),
.model-delete-button:hover:not(:disabled) {
  color: var(--color-text-secondary);
  background: rgba(var(--color-surface-rgb), 0.4);
  border-color: var(--color-border-subtle);
}

.model-edit-button:disabled,
.model-delete-button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.think-mode-switch {
  display: inline-flex;
  height: 25px;
  align-items: center;
  gap: 5px;
  padding: 0 6px;
  color: var(--color-text-muted);
  font-size: 9px;
  border: 1px solid var(--color-border-subtle);
  border-radius: 6px;
  cursor: pointer;
}

.think-mode-switch :deep(.el-switch) {
  --el-switch-on-color: rgba(73, 194, 207, 0.88);
  --el-switch-off-color: rgba(255, 255, 255, 0.12);
  height: 18px;
  transform: scale(0.75);
}

:deep(.composer-tool:hover),
:deep(.composer-selector:hover),
:deep(.composer-tool[aria-expanded='true']),
:deep(.composer-selector[aria-expanded='true']) {
  color: var(--color-text-strong);
  background: rgba(var(--color-surface-rgb), 0.4);
  border-color: var(--color-border-subtle);
}

.mode-indicator {
  width: 5px;
  height: 5px;
  background: rgba(174, 182, 193, 0.5);
  border-radius: 50%;
  box-shadow: none;
}

.send-button {
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  color: #071014;
  background: rgba(var(--color-accent-rgb), 0.88);
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(var(--color-accent-rgb), 0.12);
  transition: background 0.18s ease, transform 0.18s ease;
}

.send-button:hover {
  background: var(--color-accent);
  transform: translateY(-1px);
}

.send-button:disabled {
  color: var(--color-text-muted);
  background: rgba(var(--color-surface-rgb), 0.4);
  box-shadow: none;
  cursor: default;
  transform: none;
}

.send-button.is-stop {
  color: var(--color-text-primary);
  background: rgba(238, 104, 104, 0.78);
  box-shadow: 0 4px 14px rgba(238, 104, 104, 0.13);
}

.send-button.is-stop:hover {
  background: rgba(246, 117, 117, 0.9);
}

.composer-meta {
  gap: 12px;
  padding: 7px 5px 0;
  color: var(--color-text-muted);
  font-size: 8px;
}

.composer-meta .local-label {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
}

.composer-meta .status-dot {
  width: 5px;
  height: 5px;
}

.dialog-description {
  margin: -2px 0 15px;
  color: var(--color-text-muted);
  font-size: 11px;
  line-height: 1.65;
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.workspace-empty {
  grid-column: 1 / -1;
  padding: 24px 16px;
  color: var(--color-text-muted);
  font-size: 10px;
  text-align: center;
  background: rgba(var(--color-surface-rgb), 0.4);
  border: 1px dashed var(--color-border-subtle);
  border-radius: 10px;
}

.workspace-card {
  display: flex;
  min-width: 0;
  min-height: 64px;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  color: var(--color-text-secondary);
  text-align: left;
  background: rgba(var(--color-surface-rgb), 0.4);
  border: 1px solid var(--color-border-subtle);
  border-radius: 10px;
  transition: color 0.16s ease, background 0.16s ease, border-color 0.16s ease;
}

.workspace-card:hover,
.workspace-card.is-selected {
  color: var(--color-text-primary);
  background: rgba(77, 169, 204, 0.1);
  border-color: rgba(111, 228, 239, 0.22);
}

.workspace-card-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  color: rgba(111, 228, 239, 0.78);
  font-size: 15px;
  background: rgba(111, 228, 239, 0.07);
  border-radius: 9px;
}

.workspace-card-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.workspace-card-copy strong {
  font-size: 11px;
  font-weight: 600;
}

.workspace-card-copy small {
  margin-top: 4px;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 8px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.workspace-selected {
  flex: 0 0 auto;
  padding: 2px 6px;
  color: rgba(111, 228, 239, 0.76);
  font-size: 8px;
  background: rgba(111, 228, 239, 0.07);
  border-radius: 9px;
}

.settings-list {
  display: flex;
  flex-direction: column;
}

.settings-row {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.settings-row:last-child {
  border-bottom: 0;
}

.settings-row>span {
  display: flex;
  flex-direction: column;
}

.settings-row strong {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 580;
}

.settings-row small {
  margin-top: 4px;
  color: var(--color-text-muted);
  font-size: 9px;
}

.dialog-primary-button,
.dialog-secondary-button {
  display: inline-flex;
  height: 31px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 13px;
  font-size: 10px;
  border-radius: 7px;
}

.dialog-primary-button {
  color: #142128;
  background: rgba(111, 228, 239, 0.88);
}

.dialog-primary-button:hover {
  background: #7ceaf4;
}

.dialog-secondary-button {
  margin-right: auto;
  color: var(--color-text-secondary);
  background: rgba(var(--color-surface-rgb), 0.4);
  border: 1px solid var(--color-border-subtle);
}

.dialog-secondary-button:hover {
  color: var(--color-text-primary);
  background: rgba(var(--color-surface-rgb), 0.4);
}

:global(.agent-workspace-dialog) {
  --el-bg-color: var(--color-bg-deep);
  --el-bg-color-overlay: var(--color-bg-deep);
  --el-text-color-primary: var(--color-text-primary);
  --el-text-color-regular: var(--color-text-secondary);
  --el-border-color: var(--color-border-subtle);
  overflow: hidden;
  background: var(--color-bg-deep);
  border: 1px solid var(--color-border-subtle);
  border-radius: 13px;
  box-shadow: 0 28px 80px rgba(4, 9, 14, 0.46), inset 0 1px rgba(255, 255, 255, 0.035);
  backdrop-filter: blur(24px);
}

:global(.agent-workspace-dialog .el-dialog__header) {
  padding: 18px 20px 10px;
}

:global(.agent-workspace-dialog .el-dialog__title) {
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 620;
}

:global(.agent-workspace-dialog .el-dialog__headerbtn) {
  top: 10px;
  right: 10px;
}

:global(.agent-workspace-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: var(--color-text-muted);
}

:global(.agent-workspace-dialog .el-dialog__body) {
  padding: 9px 20px 18px;
}

:global(.agent-workspace-dialog .el-dialog__footer) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 20px 17px;
  border-top: 1px solid var(--color-border-subtle);
}

:global(.agent-workspace-dialog .el-switch) {
  --el-switch-on-color: rgba(73, 194, 207, 0.88);
  --el-switch-off-color: rgba(255, 255, 255, 0.12);
}

@media (min-width: 1440px) {
  .agent-sidebar {
    flex-basis: 276px;
    padding-right: 17px;
    padding-left: 17px;
  }

  .workspace-header {
    height: 74px;
    padding-left: 32px;
  }

  .workspace-content {
    padding: 30px 46px 22px;
  }

  .message-thread {
    width: min(900px, 100%);
  }

  .welcome-panel {
    width: min(800px, 100%);
  }

  .composer-area {
    width: min(860px, 100%);
  }

  .welcome-panel h2 {
    font-size: 29px;
  }

  .welcome-description,
  .message-content {
    font-size: 12px;
  }

  .suggestion-card {
    min-height: 72px;
    padding: 12px;
  }

  .composer-shell textarea {
    min-height: 70px;
  }
}

@media (min-width: 1900px) {
  .message-thread {
    width: min(1020px, 100%);
  }

  .welcome-panel,
  .composer-area {
    width: min(960px, 100%);
  }
}

@media (max-height: 720px) {
  .workspace-content {
    padding-top: 14px;
  }

  .agent-orb {
    width: 46px;
    height: 46px;
  }

  .suggestion-grid {
    margin-top: 15px;
  }

  .suggestion-card {
    min-height: 54px;
  }
}

@media (max-width: 980px) {
  .agent-sidebar {
    flex-basis: 222px;
  }

  .workspace-header {
    padding-left: 18px;
  }

  .suggestion-grid {
    grid-template-columns: 1fr;
    max-width: 440px;
  }

  .suggestion-card {
    min-height: 52px;
  }

  .workspace-grid {
    grid-template-columns: 1fr;
  }
}
</style>
