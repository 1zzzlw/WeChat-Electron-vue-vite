import { ipcMain, dialog } from "electron";
import { getFileInfo, uploadFile } from '../File/fileUpload'

// 从本地选择文件或目录
ipcMain.handle('select-file', async (e, file) => {
    let fileInfo = {}
    let dialogConfig = {}
    switch (file) {
        case 'avatar':
            dialogConfig = {
                properties: ['openFile'],
                // 限制仅能选择图片文件，避免选到其他类型
                filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
            }
            break
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