// 引入计算md5的库
import SparkMD5 from 'spark-md5'

export function computedChunksMD5(file, index, chunkSize) {
  return new Promise((resolve) => {
    // 计算当前块的起始位置
    const start = index * chunkSize
    // 计算当前块的结束位置
    const end = start + chunkSize

    // 定义读取文件信息的对象
    const fileReader = new FileReader()

    const spark = new SparkMD5.ArrayBuffer()

    const blob = file.slice(start, end)

    // 异步读取文件信息，不阻塞主线程，需要提前定义好读取完成事件，否则会导致读取文件的信息错过
    fileReader.onload = (e) => {
      // 计算当前块的md5值,通过 spark.end() 合并所有片段,算出完整的md5值
      spark.append(e.target.result)

      // 所有异步处理进行完成之后，spark.end() 合并所有片段,算出完整的md5值，在进行返回数据
      resolve({
        filename: file.name,
        chunkStart: start,
        chunkEnd: end,
        chunkIndex: index,
        chunkHash: spark.end(),
        chunkBlob: blob,
        isUploaded: false, // 是否已经上传成功的标志，默认没有上传成功
        _uploaded: 0 // 已上传的大小，默认没有上传
      })
    }

    // 需要在onload之后，才能保证文件信息不被错过
    fileReader.readAsArrayBuffer(blob)
  })
}
