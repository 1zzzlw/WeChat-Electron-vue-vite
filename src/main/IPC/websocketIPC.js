import { ipcMain } from "electron";
import websocket from '../websocket'

ipcMain.on('ws:send', (event, { messageType, sequenceId, data }) => {
    console.log(messageType, sequenceId, data)
    websocket.sendMessage(messageType, sequenceId, data)
})

