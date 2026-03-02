import { ipcMain } from 'electron'
import { createExtraWindow } from '../Util/createNewWindow'

const friendAdd_width = 350
const friendAdd_height = 520
const createGroup_width = 820
const createGroup_height = 620
const settingView_width = 800
const settingView_height = 650
const mediaPreview_width = 1200
const mediaPreview_height = 800

let addFriendWindow = null
let createGroupWindow = null
let settingViewWindow = null
let mediaPreviewWindow = null

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
    }
})

// 关闭新窗口
function destroyNewWindow(windowType) {
    if (windowType === 'addFriend') {
        if (addFriendWindow) {
            addFriendWindow.close()
            addFriendWindow = null
        }
    } else if (windowType === 'createGroup') {
        if (createGroupWindow) {
            createGroupWindow.close()
            createGroupWindow = null
        }
    }
}