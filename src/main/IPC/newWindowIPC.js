import { ipcMain } from 'electron'
import { createExtraWindow, windowPool } from '../Util/createNewWindow'

const friendAdd_width = 350
const friendAdd_height = 520
const createGroup_width = 820
const createGroup_height = 620
const settingView_width = 800
const settingView_height = 650
const mediaPreview_width = 1200
const mediaPreview_height = 800
const createNote_width = 700
const createNote_height = 500
const createMomentView_width = 750
const createMomentView_height = 950
const momentInfo_width = 750
const momentInfo_height = 950
const standaloneChat_width = 700
const standaloneChat_height = 550

let addFriendWindow = null
let createGroupWindow = null
let settingViewWindow = null
let mediaPreviewWindow = null
let createNoteWindow = null
let createMomentViewWindow = null
let momentInfoWindow = null
let standaloneChatWindow = null

const createMapping = {
  addFriend: { width: friendAdd_width, height: friendAdd_height, ref: 'addFriendWindow' },
  createGroup: { width: createGroup_width, height: createGroup_height, ref: 'createGroupWindow' },
  settingView: { width: settingView_width, height: settingView_height, ref: 'settingViewWindow' },
  imagePreview: { width: mediaPreview_width, height: mediaPreview_height, ref: 'mediaPreviewWindow' },
  videoPreview: { width: mediaPreview_width, height: mediaPreview_height, ref: 'mediaPreviewWindow' },
  createNote: { width: createNote_width, height: createNote_height, resizable: true, ref: 'createNoteWindow' },
  createMomentView: { width: createMomentView_width, height: createMomentView_height, resizable: true, ref: 'createMomentViewWindow' },
  momentInfoView: { width: momentInfo_width, height: momentInfo_height, resizable: true, ref: 'momentInfoWindow' },
  standaloneChat: { width: standaloneChat_width, height: standaloneChat_height, resizable: true, ref: 'standaloneChatWindow' }
}

const refMap = {
  addFriendWindow,
  createGroupWindow,
  settingViewWindow,
  mediaPreviewWindow,
  createNoteWindow,
  createMomentViewWindow,
  momentInfoWindow,
  standaloneChatWindow
}

ipcMain.on('create-new-window', (e, windowType, data) => {
    const config = createMapping[windowType]
    if (!config) {
        console.warn(`Unknown window type: ${windowType}`)
        return
    }

    const routeMap = {
        addFriend: 'friendAdd',
        createGroup: 'createGroup',
        settingView: 'setting',
        imagePreview: 'imagePreview',
        videoPreview: 'videoPreview',
        createNote: 'createNote',
        createMomentView: 'createMomentView',
        momentInfoView: 'momentInfoView',
        standaloneChat: 'standaloneChat'
    }

    const options = { width: config.width, height: config.height }
    if (config.resizable) {
        options.minWidth = config.width
        options.minHeight = config.height
        options.resizable = true
    }

    const route = routeMap[windowType]
    const win = createExtraWindow(route, options, 'vue', data)
    refMap[config.ref] = win
})

// 关闭指定窗口
ipcMain.on('destroy-window', (e, windowType) => {
    const config = createMapping[windowType]
    if (!config) {
        console.warn(`Unknown window type for destroy: ${windowType}`)
        return
    }
    windowPool.delete(windowType)
    const win = refMap[config.ref]
    if (win && !win.isDestroyed()) {
        win.close()
    }
    refMap[config.ref] = null
})
