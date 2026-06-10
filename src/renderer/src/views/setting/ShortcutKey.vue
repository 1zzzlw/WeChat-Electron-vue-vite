<template>
  <el-scrollbar noresize style="height: 100%; width: 100%">
    <div class="shortcuts-container">
      <!-- 搜索框 -->
      <div class="search-box">
        <el-input v-model="searchQuery" placeholder="搜索快捷键..." prefix-icon="Search" clearable />
      </div>

      <!-- 通用快捷键 -->
      <div class="shortcuts-section">
        <h3 class="section-title">通用</h3>
        <div class="shortcuts-list">
          <div v-for="item in filteredGeneralShortcuts" :key="item.action" class="shortcut-item"
               @click="startEditShortcut(item.action)"
               @keydown="(e) => handleKeyCapture(e, item.action)" tabindex="0">
            <div class="shortcut-info">
              <div class="shortcut-name">{{ item.name }}</div>
              <div class="shortcut-desc">{{ item.description }}</div>
            </div>
            <div class="shortcut-keys">
              <template v-if="editingAction === item.action">
                <kbd class="key-tag editing">按下新快捷键...</kbd>
              </template>
              <template v-else>
                <kbd v-for="(key, index) in (customShortcuts[item.action] || item.keys)" :key="index" class="key-tag">
                  {{ key }}
                </kbd>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 聊天快捷键 -->
      <div class="shortcuts-section">
        <h3 class="section-title">聊天</h3>
        <div class="shortcuts-list">
          <div v-for="item in filteredChatShortcuts" :key="item.action" class="shortcut-item"
               @click="startEditShortcut(item.action)"
               @keydown="(e) => handleKeyCapture(e, item.action)" tabindex="0">
            <div class="shortcut-info">
              <div class="shortcut-name">{{ item.name }}</div>
              <div class="shortcut-desc">{{ item.description }}</div>
            </div>
            <div class="shortcut-keys">
              <template v-if="editingAction === item.action">
                <kbd class="key-tag editing">按下新快捷键...</kbd>
              </template>
              <template v-else>
                <kbd v-for="(key, index) in (customShortcuts[item.action] || item.keys)" :key="index" class="key-tag">
                  {{ key }}
                </kbd>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 导航快捷键 -->
      <div class="shortcuts-section">
        <h3 class="section-title">导航</h3>
        <div class="shortcuts-list">
          <div v-for="item in filteredNavigationShortcuts" :key="item.action" class="shortcut-item"
               @click="startEditShortcut(item.action)"
               @keydown="(e) => handleKeyCapture(e, item.action)" tabindex="0">
            <div class="shortcut-info">
              <div class="shortcut-name">{{ item.name }}</div>
              <div class="shortcut-desc">{{ item.description }}</div>
            </div>
            <div class="shortcut-keys">
              <template v-if="editingAction === item.action">
                <kbd class="key-tag editing">按下新快捷键...</kbd>
              </template>
              <template v-else>
                <kbd v-for="(key, index) in (customShortcuts[item.action] || item.keys)" :key="index" class="key-tag">
                  {{ key }}
                </kbd>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 系统快捷键 -->
      <div class="shortcuts-section">
        <h3 class="section-title">系统</h3>
        <div class="shortcuts-list">
          <div v-for="item in filteredSystemShortcuts" :key="item.action" class="shortcut-item"
               @click="startEditShortcut(item.action)"
               @keydown="(e) => handleKeyCapture(e, item.action)" tabindex="0">
            <div class="shortcut-info">
              <div class="shortcut-name">{{ item.name }}</div>
              <div class="shortcut-desc">{{ item.description }}</div>
            </div>
            <div class="shortcut-keys">
              <template v-if="editingAction === item.action">
                <kbd class="key-tag editing">按下新快捷键...</kbd>
              </template>
              <template v-else>
                <kbd v-for="(key, index) in (customShortcuts[item.action] || item.keys)" :key="index" class="key-tag">
                  {{ key }}
                </kbd>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 重置按钮 -->
      <div class="reset-section">
        <el-button type="primary" @click="resetToDefaults">
          重置为默认设置
        </el-button>
      </div>
    </div>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const searchQuery = ref('')

const customShortcuts = reactive<Record<string, string[]>>({})
const editingAction = ref<string | null>(null)

onMounted(async () => {
  try {
    const saved = await (window as any).userInfoApi.storeGetUserInfo('customShortcuts')
    if (saved) {
      const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved
      Object.assign(customShortcuts, parsed)
    }
  } catch (error) {
    console.error('加载自定义快捷键失败:', error)
  }
})

const startEditShortcut = (action: string) => {
  editingAction.value = action
}

const handleKeyCapture = (event: KeyboardEvent, action: string) => {
  if (editingAction.value !== action) return

  event.preventDefault()
  const keys: string[] = []
  if (event.ctrlKey) keys.push('Ctrl')
  if (event.shiftKey) keys.push('Shift')
  if (event.altKey) keys.push('Alt')

  const mainKey = event.key
  if (!['Control', 'Shift', 'Alt', 'Meta'].includes(mainKey)) {
    keys.push(mainKey.toUpperCase())
    customShortcuts[action] = keys
    editingAction.value = null

    // Save to electron-store
    ;(window as any).userInfoApi.storeSetUserInfo('customShortcuts', JSON.stringify(customShortcuts))
    ElMessage.success('快捷键已更新')
  }
}

// 快捷键数据
const shortcutsData = [
  // 通用
  {
    category: 'general',
    action: 'search',
    name: '全局搜索',
    description: '快速搜索消息、联系人',
    keys: ['Ctrl', 'F']
  },
  {
    category: 'general',
    action: 'newChat',
    name: '新建聊天',
    description: '开始新的对话',
    keys: ['Ctrl', 'N']
  },
  {
    category: 'general',
    action: 'send',
    name: '发送消息',
    description: '发送当前编辑的消息',
    keys: ['Enter']
  },
  {
    category: 'general',
    action: 'newLine',
    name: '换行',
    description: '在消息中换行',
    keys: ['Shift', 'Enter']
  },
  {
    category: 'general',
    action: 'copy',
    name: '复制',
    description: '复制选中的消息',
    keys: ['Ctrl', 'C']
  },
  {
    category: 'general',
    action: 'paste',
    name: '粘贴',
    description: '粘贴内容',
    keys: ['Ctrl', 'V']
  },

  // 聊天
  {
    category: 'chat',
    action: 'reply',
    name: '回复消息',
    description: '回复选中的消息',
    keys: ['Ctrl', 'R']
  },
  {
    category: 'chat',
    action: 'forward',
    name: '转发消息',
    description: '转发选中的消息',
    keys: ['Ctrl', 'F']
  },
  {
    category: 'chat',
    action: 'delete',
    name: '删除消息',
    description: '删除选中的消息',
    keys: ['Delete']
  },
  {
    category: 'chat',
    action: 'recall',
    name: '撤回消息',
    description: '撤回已发送的消息（2分钟内）',
    keys: ['Ctrl', 'Z']
  },
  {
    category: 'chat',
    action: 'emoji',
    name: '表情面板',
    description: '打开表情选择面板',
    keys: ['Ctrl', 'E']
  },
  {
    category: 'chat',
    action: 'file',
    name: '发送文件',
    description: '选择并发送文件',
    keys: ['Ctrl', 'U']
  },

  // 导航
  {
    category: 'navigation',
    action: 'prevChat',
    name: '上一个会话',
    description: '切换到上一个聊天会话',
    keys: ['Ctrl', '↑']
  },
  {
    category: 'navigation',
    action: 'nextChat',
    name: '下一个会话',
    description: '切换到下一个聊天会话',
    keys: ['Ctrl', '↓']
  },
  {
    category: 'navigation',
    action: 'unread',
    name: '下一条未读',
    description: '跳转到下一条未读消息',
    keys: ['Ctrl', 'U']
  },
  {
    category: 'navigation',
    action: 'scrollTop',
    name: '回到顶部',
    description: '滚动到聊天窗口顶部',
    keys: ['Home']
  },
  {
    category: 'navigation',
    action: 'scrollBottom',
    name: '到底部',
    description: '滚动到聊天窗口底部',
    keys: ['End']
  },

  // 系统
  {
    category: 'system',
    action: 'settings',
    name: '设置',
    description: '打开应用设置',
    keys: ['Ctrl', ',']
  },
  {
    category: 'system',
    action: 'quit',
    name: '退出',
    description: '退出应用',
    keys: ['Ctrl', 'Q']
  },
  {
    category: 'system',
    action: 'minimize',
    name: '最小化',
    description: '最小化窗口',
    keys: ['Ctrl', 'M']
  },
  {
    category: 'system',
    action: 'fullscreen',
    name: '全屏',
    description: '切换全屏模式',
    keys: ['F11']
  }
]

// 按分类筛选
const generalShortcuts = computed(() =>
  shortcutsData.filter(item => item.category === 'general')
)

const chatShortcuts = computed(() =>
  shortcutsData.filter(item => item.category === 'chat')
)

const navigationShortcuts = computed(() =>
  shortcutsData.filter(item => item.category === 'navigation')
)

const systemShortcuts = computed(() =>
  shortcutsData.filter(item => item.category === 'system')
)

// 搜索过滤
const filterShortcuts = (list: any[]) => {
  if (!searchQuery.value) return list
  const query = searchQuery.value.toLowerCase()
  return list.filter(item =>
    item.name.toLowerCase().includes(query) ||
    item.description.toLowerCase().includes(query) ||
    item.keys.join(' ').toLowerCase().includes(query)
  )
}

const filteredGeneralShortcuts = computed(() =>
  filterShortcuts(generalShortcuts.value)
)

const filteredChatShortcuts = computed(() =>
  filterShortcuts(chatShortcuts.value)
)

const filteredNavigationShortcuts = computed(() =>
  filterShortcuts(navigationShortcuts.value)
)

const filteredSystemShortcuts = computed(() =>
  filterShortcuts(systemShortcuts.value)
)

const resetToDefaults = async () => {
  Object.keys(customShortcuts).forEach(key => delete customShortcuts[key])
  try {
    await (window as any).userInfoApi.storeSetUserInfo('customShortcuts', JSON.stringify({}))
    ElMessage.success('已重置为默认快捷键')
  } catch (error) {
    ElMessage.error('重置失败')
  }
}
</script>

<style scoped>
.shortcuts-container {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  -webkit-app-region: no-drag;
}

.search-box {
  margin-bottom: 32px;
}

.shortcuts-section {
  margin-bottom: 40px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 20px;
  color: #f0f0f0;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(66, 153, 225, 0.5);
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(35, 45, 60, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(66, 153, 225, 0.2);
  transition: all 0.3s;
  cursor: pointer;
  outline: none;
}

.shortcut-item:hover {
  border-color: rgba(66, 153, 225, 0.5);
  transform: translateX(4px);
}

.shortcut-item:focus {
  border-color: rgba(66, 153, 225, 0.6);
  box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.2);
}

.shortcut-info {
  flex: 1;
}

.shortcut-name {
  font-size: 14px;
  font-weight: 500;
  color: #f0f0f0;
  margin-bottom: 4px;
}

.shortcut-desc {
  font-size: 12px;
  color: rgba(240, 240, 240, 0.5);
}

.shortcut-keys {
  display: flex;
  gap: 6px;
  align-items: center;
}

.key-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  background: rgba(20, 25, 35, 0.8);
  border: 1px solid rgba(66, 153, 225, 0.3);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #f0f0f0;
  font-family: 'SF Mono', Monaco, monospace;
  box-shadow: 0 2px 0 rgba(66, 153, 225, 0.2);
}

.key-tag.editing {
  background: rgba(66, 153, 225, 0.3);
  color: #fff;
  border-color: rgba(66, 153, 225, 0.6);
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.reset-section {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid rgba(66, 153, 225, 0.2);
  text-align: center;
}

/* Element Plus 暗色主题覆盖 */
:deep(.el-input__wrapper) {
  background: rgba(20, 25, 35, 0.8);
  border: 1px solid rgba(66, 153, 225, 0.3);
  border-radius: 6px;
  box-shadow: none;
}

:deep(.el-input__wrapper:focus-within) {
  border-color: rgba(66, 153, 225, 0.6);
}

:deep(.el-input__inner) {
  color: #f0f0f0;
  background: transparent;
}

:deep(.el-input__inner::placeholder) {
  color: rgba(240, 240, 240, 0.4);
}

:deep(.el-button--primary) {
  background: rgba(66, 153, 225, 0.4);
  border-color: rgba(66, 153, 225, 0.6);
  color: #fff;
}

:deep(.el-button--primary:hover) {
  background: rgba(66, 153, 225, 0.6);
  border-color: rgba(66, 153, 225, 0.8);
}
</style>