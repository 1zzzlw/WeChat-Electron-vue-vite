import { ipcMain, dialog } from "electron";
import { getFileInfo, uploadFile, stopUpload } from '../File/fileUpload'
import { downloadFile, pauseDownload, saveAsMedia } from '../File/downloadFile'
// 从本地选择文件或目录
ipcMain.handle('select-file', async (e, file) => {
    let fileInfo = {}
    let dialogConfig = {}
    switch (file) {
        case 'storeLocation':
            dialogConfig = {
                // 只能选择文件夹，允许用户创建文件夹
                properties: ['openDirectory', 'createDirectory']
            }
            break
        case 'uploadFile':
            dialogConfig = {
                //multiSelections 允许多选，只选择文件
                properties: ['openFile']
            }
            break
    }

    const { canceled, filePaths } = await dialog.showOpenDialog(dialogConfig)

    fileInfo = getFileInfo(filePaths[0])

    // 返回文件信息给渲染进程
    return canceled ? null : fileInfo
})

// 监听发送文件的事件
ipcMain.handle('upload-file', async (e, file) => {
    // 接收到需要上传的文件，开始上传文件
    console.log(file)
    const minioFilePath = await uploadFile(file)
    return minioFilePath
})

ipcMain.on('update-pauseStatus', (e, file, isPause) => {
    if (isPause) {
        // 是暂停
        stopUpload(file.fileId)
    } else {
        // 重新上传
        uploadFile(file)
    }
})

ipcMain.on('start-download', (e, fileId, fileName, remoteUrl) => {
    downloadFile(fileId, fileName, remoteUrl)
})

ipcMain.on('pause-download', (e, fileId) => {
    pauseDownload(fileId)
})

ipcMain.on('resume-download', (e, fileId, fileName, remoteUrl) => {
    downloadFile(fileId, fileName, remoteUrl)
})

ipcMain.on('saveAs-media', async (e, fileInfo) => {
    const dialogConfig = {
        title: '保存文件',
        defaultPath: fileInfo.fileName
    }
    let result = await dialog.showSaveDialog(dialogConfig)
    if (result.canceled || result.filePath === '') {
        return
    }
    const filePath = result.filePath
    const remoteUrl = fileInfo.remoteUrl
    console.log(filePath)
    saveAsMedia(remoteUrl, filePath)
})