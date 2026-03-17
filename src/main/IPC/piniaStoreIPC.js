import { ipcMain, BrowserWindow } from "electron";

ipcMain.on('store:change', (e, targetStoreName, data) => {
    console.log(targetStoreName, data)
    console.log(BrowserWindow.getAllWindows())
    for (const win of BrowserWindow.getAllWindows()) {
        // 排除发送者，避免自己给自己发
        console.log(event.sender.id)
        if (win.webContents.id !== event.sender.id && !win.isDestroyed()) {
            win.webContents.send('store:set', targetStoreName, data)
        }
    }
})