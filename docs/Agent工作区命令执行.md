# Agent 工作区命令执行修复

## 错误来源

用户日志中的根异常是 Electron IPC 返回的 `spawn EINVAL`，发生于 `run_workspace_command`，并由后端工具失败处理继续抛出。不是 SSE 读取超时，也不是模型服务额度错误。

`src/main/File/fileInfo.js` 原本在 Windows 上给所有命令追加 `.cmd`，再用 `spawn(..., {shell: false})` 启动。有两处不匹配：

- npm、pnpm、yarn、npx 的 `.cmd` 入口需要命令解释器，不能作为原生程序直接启动。
- git、pytest 应使用原生 `.exe`，追加 `.cmd` 会导致找不到对应程序。

具体用户调用了哪一个命令，原日志未附工具参数；源码已确认上述通用启动缺陷。[Node.js 官方说明](https://nodejs.org/api/child_process.html#spawning-bat-and-cmd-files-on-windows)

## 修改方式

命令白名单和允许的项目脚本保持原范围。Windows 下仅包管理工具使用 `cmd.exe /d /v:off /s /c`，每个参数单独引用，拒绝引号、变量展开、换行和命令控制符，保留普通空格及中文参数；git、pytest 直接启动对应可执行程序。其他平台继续使用命令及独立参数数组。

同步 `spawn` 异常与异步启动失败都返回 `success: false` 和包含命令名称的错误，供前端回传及后端记录。规划模式仍会在真实工具失败时停止并保留失败状态，不把启动失败当作已完成。

没有新增依赖或改用任意 shell 命令。现有单命令 5～110 秒时限、输出截断方式及非零退出码交给模型处理的行为保留。

## 生效与验证

这是 Electron 主进程改动，需要完整重启 Electron；已安装版本需要重新构建安装包，仅刷新 AI 页面不会加载新代码。当前问题修复不需要修改 Python 后端或 Nginx。

按用户此前要求，没有执行测试、构建或实际工作区命令。只核对语法、静态检查及 Git 差异。

`tests/workspaceTools.test.cjs` 新增包管理工具的 Windows 启动参数、git/pytest 原生入口、控制符拒绝、同步启动失败、非 Windows 行为的隔离回归场景。用户可执行该文件，随后在 Electron 里用允许的 `npm run build`、`git status` 等实际命令联调；本机须原本已安装相应开发工具。
