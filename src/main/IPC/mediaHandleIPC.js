import { ipcMain } from "electron";
import { generateGroupAvatar, updateGroupAvatar } from '../Util/mediaHandle'

ipcMain.handle('generate-groupAvatar', (e) => {
    return generateGroupAvatar()
})

ipcMain.handle('update-groupAvatar', (e, avatarUrlList) => {
    return updateGroupAvatar(avatarUrlList)
})