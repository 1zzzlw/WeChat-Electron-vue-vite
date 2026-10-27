import { toRaw } from 'vue'
import { messageInfo } from '@/stores/modules/MessageStore'
import { fileStatusListInfo } from '@/stores/modules/FileStatusInfoStore'
import { statusMap } from '@/utils/constants'
import { updateMessageFileSendStatusApi } from '@/api/Message'
import { updateMessage } from '@/db/dualDB'

let _fileTransferHandlersRegistered = false

// 短语音可能先完成上传；只有 REST 已返回 remoteUrl 才允许投递 WS。
export function sendUploadedFileIfReady(fileId) {
    const store = messageInfo()
    const pending = store.getFileMessage(fileId)
    const status = fileStatusListInfo().getFileUploadUpdateInfo(fileId)?.uploadStatus
    if (!pending) return
    if (status === statusMap.fail.value) pending.sendStatus = 2
    const message = toRaw(pending)
    if (!message.remoteUrl) return
    if (status === statusMap.fail.value) {
        updateMessageFileSendStatusApi(fileId, 2)
        updateMessage({ fileId }, { sendStatus: 2 })
        return
    }
    if (status !== statusMap.upload_finish.value) return
    pending.sendStatus = 0
    store.sendFileMessage(message, message.conversationId, message.receiverIds)
    // 上传完成后由正常消息及 ACK 管理，移除临时项也避免重复完成事件再次投递。
    store.removeFileMessage(fileId)
    updateMessageFileSendStatusApi(fileId, 1)
    updateMessage({ fileId }, { sendStatus: 1 })
}

export function registerFileTransferHandlers() {
    if (_fileTransferHandlersRegistered) return
    _fileTransferHandlersRegistered = true

    window.uploadFileApi.updateUploadProgress((e, uploadStatus) => {
        const { fileId, uploadProgress, uploadSpeed } = uploadStatus
        fileStatusListInfo().updateFileUploadProgressStatus(fileId, uploadProgress, uploadSpeed)
    })

    window.uploadFileApi.updateUploadStatus(async (e, uploadStatus) => {
        const { fileId, status } = await uploadStatus
        fileStatusListInfo().updateFileUploadStatus(fileId,
            status === 1 ? statusMap.upload_finish.value : statusMap.fail.value, status === 1 ? 100 : 0)
        sendUploadedFileIfReady(fileId)
    })

    window.uploadFileApi.updateDownloadProgress((e, downloadStatus) => {
        const { fileId, downloadProgress, downloadSpeed } = downloadStatus
        fileStatusListInfo().updateFileDownloadProgressStatus(fileId, downloadProgress, downloadSpeed)
    })

    window.uploadFileApi.updateDownloadStatus((e, downloadStatus) => {
        const { fileId, status } = downloadStatus
        const condition = {
            fileId: fileId
        }
        let data = {};
        if (status === 1) {
            console.log('下载成功')
            fileStatusListInfo().updateFileDownloadStatus(fileId, statusMap.download_finish.value, 100)
            data = {
                downloadStatus: 1
            }
        } else {
            console.log('下载失败')
            fileStatusListInfo().updateFileDownloadStatus(fileId, statusMap.fail.value, 0)
            data = {
                downloadStatus: 2
            }
        }
        updateMessage(condition, data)
    })
}

