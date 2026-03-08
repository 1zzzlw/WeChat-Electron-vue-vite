npm 版本 22.16.0

第一部分：先介绍一下git拉去github项目要的基础命令

方法一：使用git clone命令拉取项目
如果项目中之前执行过 git init 命令，即初始化过 git 需要先清理一下
git clone -b master 项目HTTPS地址

方法二：本地初始化过，关联远程拉取
首先需要先初始化本地仓库
git init
然后关联远程仓库
git remote add origin 项目HTTPS地址
最后拉取项目代码
git pull origin master
如果要保持实时更新，确保当前在master分支
git checkout master
拉取远程master分支的最新代码
pinia缓存多窗口共享的理解，代码不小心清空了，但是思路也理解了不少，
以后有机会的话，会继续完善这个前端多窗口缓存共享的。
![img.png](img.png)

git 拉取最新修改代码
第一步：先暂存当前设备修改的代码
    git stash push -m "暂存本地修改的路径代码"
第二步：拉取最新代码
    git pull --tags origin master
第三步：恢复暂存的修改，并尝试合并
    git stash pop

清理所有更改的代码，回到仓库的最新状态
git reset --hard origin/master

计算md5值的依赖
npm install spark-md5

生成照片，视频的预览压缩图 -- ffmpeg
npm install ffmpeg
这个只是封装ffmpeg的命令的库
 
下载ffmpeg的二进制文件 npm i ffmpeg-static
下载这个以来需要注意配置一个临时的环境变量
$env:FFMPEG_BINARIES_URL = "https://cdn.npmmirror.com/binaries/ffmpeg-static"
npm install ffmpeg-static --save

还需要下载它的二进制文件
npm install ffprobe-static

FFmpeg 的主要功能和特性：
格式转换：FFmpeg 可以将一个媒体文件从一种格式转换为另一种格式，支持几乎所有常见的音频和视频格式，包括 MP4、AVI、MKV、MOV、FLV、MP3、AAC 等。
视频处理：FFmpeg 可以进行视频编码、解码、裁剪、旋转、缩放、调整帧率、添加水印等操作。你可以使用它来调整视频的分辨率、剪辑和拼接视频片段，以及对视频进行各种效果处理。
音频处理：FFmpeg 可以进行音频编码、解码、剪辑、混音、音量调节等操作。你可以用它来提取音频轨道、剪辑和拼接音频片段，以及对音频进行降噪、均衡器等处理。
流媒体传输：FFmpeg 支持将音视频流实时传输到网络上，可以用于实时流媒体服务、直播和视频会议等应用场景。
视频处理效率高：FFmpeg 是一个高效的工具，针对处理大型视频文件和高分辨率视频进行了优化，可以在保持良好质量的同时提供较快的处理速度。
跨平台支持：FFmpeg 可以在多个操作系统上运行，包括 Windows、MacOS、Linux 等，同时支持多种硬件加速技术，如 NVIDIA CUDA 和 Intel Quick Sync Video。

雪花id生成依赖
npm install node-snowflake

npm install snowflake-id --save

vue3用这个
npm i vue3-virtual-scroller

vue2 里的
npm install --save vue-virtual-scroller

虚拟滚动

图片的滚动，放大，缩小等处理的组件库
npm install v-viewer viewerjs

视频播放编辑库
npm install dplayer

笔记组件库安装步骤
npm install @tiptap/vue-3 @tiptap/starter-kit

npm install @tiptap/extension-image  # 图片
npm install @tiptap/extension-link   # 链接
npm install @tiptap/extension-table  # 表格
