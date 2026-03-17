import { ipcMain, BrowserWindow } from "electron";

ipcMain.on('store:change', (e, targetStoreName, data) => {
    console.log(targetStoreName, data)
    for (const win of BrowserWindow.getAllWindows()) {
        console.log(win.webContents.id)
        if (win.webContents.id !== e.sender.id && !win.isDestroyed()) {
            console.log(win.webContents.id)
            win.webContents.send('store:set', targetStoreName, data)
        }
    }
})