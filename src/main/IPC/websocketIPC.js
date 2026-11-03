import { ipcMain } from "electron";
import websocket from '../websocket'

ipcMain.handle('ws:status:get', () => websocket.ws.status)

ipcMain.on('ws:send', (event, { messageType, sequenceId, data }) => {
    if (messageType === 19) {
        websocket.requestPresence()
        return
    }
    console.log(messageType, sequenceId, data)
    websocket.sendMessage(messageType, sequenceId, data)
})

