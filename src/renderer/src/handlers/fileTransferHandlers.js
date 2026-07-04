import { toRaw } from 'vue'
import { messageInfo } from '@/stores/modules/MessageStore'
import { fileStatusListInfo } from '@/stores/modules/FileStatusInfoStore'
import { statusMap } from '@/utils/constants'
import { updateMessageFileSendStatusApi } from '@/api/Message'
import { updateMessage } from '@/db/dualDB'

let _fileTransferHandlersRegistered = false

export function registerFileTransferHandlers() {
    if (_fileTransferHandlersRegistered) return
    _fileTransferHandlersRegistered = true

    window.uploadFileApi.updateUploadProgress((e, uploadStatus) => {
        const { fileId, uploadProgress, uploadSpeed } = uploadStatus
        fileStatusListInfo().updateFileUploadProgressStatus(fileId, uploadProgress, uploadSpeed)
    })

    window.uploadFileApi.updateUploadStatus(async (e, uploadStatus) => {
        const { fileId, status } = await uploadStatus
        const condition = {
            fileId: fileId
        }
        let data = {};
        if (status === 1) {
            console.log('上传成功')
            fileStatusListInfo().updateFileUploadStatus(fileId, statusMap.upload_finish.value, 100)
            data = {
                sendStatus: 1
            }

            const rawMessagePack = toRaw(messageInfo().getFileMessage(fileId))

            console.log(rawMessagePack)

            messageInfo().sendFileMessage(rawMessagePack, rawMessagePack.conversationId, rawMessagePack.receiverIds)

            updateMessageFileSendStatusApi(fileId, 1)
        } else {
            console.log('上传失败')
            fileStatusListInfo().updateFileUploadStatus(fileId, statusMap.fail.value, 0)
            data = {
                sendStatus: 2
            }
            updateMessageFileSendStatusApi(fileId, 2)
        }
        updateMessage(condition, data)

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

