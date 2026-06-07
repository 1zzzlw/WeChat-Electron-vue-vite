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

let addFriendWindow = null
let createGroupWindow = null
let settingViewWindow = null
let mediaPreviewWindow = null
let createNoteWindow = null
let createMomentViewWindow = null

ipcMain.on('create-new-window', (e, windowType, data) => {
    console.log(windowType)
    switch (windowType) {
        case 'addFriend': {
            const options = {
                width: friendAdd_width,
                height: friendAdd_height
            }
            addFriendWindow = createExtraWindow('friendAdd', options, 'vue', data)
            break
        }
        case 'createGroup': {
            const options = {
                width: createGroup_width,
                height: createGroup_height
            }
            createGroupWindow = createExtraWindow('createGroup', options, 'vue', data)
            break
        }
        case 'settingView': {
            const options = {
                width: settingView_width,
                height: settingView_height
            }
            settingViewWindow = createExtraWindow('setting', options, 'vue', data)
            break
        }
        case 'imagePreview': {
            const options = {
                width: mediaPreview_width,
                height: mediaPreview_height,
            }
            mediaPreviewWindow = createExtraWindow('imagePreview', options, 'vue', data)
            break
        }
        case 'videoPreview': {
            const options = {
                width: mediaPreview_width,
                height: mediaPreview_height,
            }
            mediaPreviewWindow = createExtraWindow('videoPreview', options, 'vue', data)
            break
        }
        case 'createNote': {
            const options = {
                minWidth: createNote_width,
                minHeight: createNote_height,
                resizable: true,
            }
            createNoteWindow = createExtraWindow('createNote', options, 'vue', data)
            break
        }
        case 'createMomentView': {
            const options = {
                minWidth: createMomentView_width,
                minHeight: createMomentView_height,
                resizable: true,
            }
            createMomentViewWindow = createExtraWindow('createMomentView', options, 'vue', data)
        }
    }
})

// 关闭指定窗口
ipcMain.on('destory-window', (e, windowType) => {
    console.log(windowType)
    switch (windowType) {
        case 'addFriend': {
            windowPool.delete(windowType)
            addFriendWindow.close()
            addFriendWindow = null
        }
        case 'createGroup': {
            windowPool.delete(windowType)
            createGroupWindow.close()
            createGroupWindow = null
        }
    }
})