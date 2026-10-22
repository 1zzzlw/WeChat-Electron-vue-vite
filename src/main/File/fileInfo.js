import fs from 'fs/promises'
import path from 'path'
import { shell } from 'electron'
import { saveWorkspace } from '../DB/insert'
import { getWorkspaceByName, queryWorkspaceList } from '../DB/select'
import { spawn } from 'child_process'

// 过滤掉没必要的目录，避免遍历过多文件，导致性能问题
const IGNORED = new Set(['node_modules', '.git', 'out', 'dist', '.idea', '.vscode', '.venv'])
const MAX_READ_BYTES = 1000000
const MAX_WRITE_CHARS = 2000000
const MAX_LIST_ENTRIES = 500
// 工作区别名 → 绝对路径的热缓存，真相源是 sqlite 的 workspace 表
const workspaceRoots = new Map()

// 只搜索文本类文件，避免读二进制浪费时间
const TEXT_EXTENSIONS = new Set([
    '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.vue', '.json', '.md', '.txt',
    '.yml', '.yaml', '.css', '.scss', '.less', '.html', '.htm', '.py', '.java',
    '.kt', '.go', '.rs', '.c', '.h', '.cpp', '.hpp', '.cs', '.php', '.rb', '.sh',
    '.sql', '.toml', '.ini', '.xml', '.gradle'
])

// 命令白名单：数组非空表示必须命中首个参数，空数组表示不需要子命令
const COMMAND_RULES = {
    npm: ['test', 'run'],
    pnpm: ['test', 'run'],
    yarn: ['test', 'run'],
    git: ['status', 'diff', 'log', 'show'],
    npx: ['tsc', 'eslint', 'vitest', 'jest'],
    pytest: []
}

// npm run 只允许这些脚本名，dev/serve 这类长驻进程不放行
const RUN_SCRIPTS = new Set(['build', 'test', 'lint', 'typecheck', 'check', 'format:check'])

/**
 * 取工作区根目录。缓存未命中时回查本地数据库并回填，
 * 这样 Electron 重启后不需要用户重新选择目录。
 */
const getWorkspaceRoot = (workspaceName) => {
    const cached = workspaceRoots.get(workspaceName)
    if (cached) return cached
    const record = getWorkspaceByName(workspaceName)
    if (!record?.rootPath) return null
    workspaceRoots.set(workspaceName, record.rootPath)
    return record.rootPath
}


const assertInsideWorkspace = (rootDir, targetPath) => {
    const relative = path.relative(rootDir, targetPath)
    if (
        relative === '..' ||
        relative.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relative)
    ) {
        throw new Error('目标路径超出了工作区范围')
    }
}

const resolveWorkspacePath = (workspaceName, relativePath) => {
    const rootDir = getWorkspaceRoot(workspaceName)
    if (!rootDir) throw new Error('本地工作区不存在，请重新选择工作目录')
    if (!relativePath || typeof relativePath !== 'string' || path.isAbsolute(relativePath)) {
        throw new Error('文件工具只接受相对路径')
    }

    const targetPath = path.resolve(rootDir, relativePath)
    assertInsideWorkspace(rootDir, targetPath)
    return { rootDir, targetPath }
}

// 列目录时允许空路径（表示工作区根目录）
const resolveDirectoryPath = (workspaceName, relativePath) => {
    const rootDir = getWorkspaceRoot(workspaceName)
    if (!rootDir) throw new Error('本地工作区不存在，请重新选择工作目录')

    const safeRelative = (relativePath || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/\/+$/, '')

    if (!safeRelative || safeRelative === '.') {
        return { rootDir, targetPath: rootDir }
    }
    if (path.isAbsolute(safeRelative)) throw new Error('文件工具只接受相对路径')

    const targetPath = path.resolve(rootDir, safeRelative)
    assertInsideWorkspace(rootDir, targetPath)
    return { rootDir, targetPath }
}

/**
 * 注册本地工作区：只把 "别名 → 绝对路径" 写入本机 sqlite，服务端不参与。
 * 文件清单不再一次性上报，改由 list 操作按需实时读取。
 */
async function registerWorkspace(workspaceName, rootDir) {
    if (!workspaceName || typeof workspaceName !== 'string') {
        throw new Error('工作区名称不能为空')
    }

    const normalizedName = workspaceName.trim()
    const resolvedRoot = await fs.realpath(rootDir)
    const rootStat = await fs.stat(resolvedRoot)
    if (!rootStat.isDirectory()) throw new Error('工作区根路径必须是目录')

    const affected = saveWorkspace({ name: normalizedName, rootPath: resolvedRoot })
    if (!affected) throw new Error('工作区保存到本地数据库失败')

    workspaceRoots.set(normalizedName, resolvedRoot)
    return { name: normalizedName, rootPath: resolvedRoot }
}

/**
 * 读取本地已保存的全部工作区，供渲染进程启动时恢复列表。
 */
function listLocalWorkspaces() {
    return queryWorkspaceList().map((item) => ({
        name: item.name,
        path: item.rootPath
    }))
}

async function resolveExistingFile(workspaceName, relativePath) {
    const { rootDir, targetPath } = resolveWorkspacePath(workspaceName, relativePath)
    const realTarget = await fs.realpath(targetPath)
    assertInsideWorkspace(rootDir, realTarget)
    const stat = await fs.stat(realTarget)
    if (!stat.isFile()) throw new Error('目标路径不是文件')
    return { targetPath: realTarget, stat }
}

async function resolveReadableFile(workspaceName, relativePath) {
    const { targetPath, stat } = await resolveExistingFile(workspaceName, relativePath)
    if (stat.size > MAX_READ_BYTES) throw new Error('文件超过 1MB，暂不支持读取')
    return targetPath
}

async function resolveWritableFile(workspaceName, relativePath) {
    const { rootDir, targetPath } = resolveWorkspacePath(workspaceName, relativePath)

    try {
        const realTarget = await fs.realpath(targetPath)
        assertInsideWorkspace(rootDir, realTarget)
        const stat = await fs.stat(realTarget)
        if (!stat.isFile()) throw new Error('目标路径不是文件')
        return realTarget
    } catch (error) {
        if (error?.code !== 'ENOENT') throw error
    }

    let existingAncestor = path.dirname(targetPath)
    while (true) {
        try {
            const realAncestor = await fs.realpath(existingAncestor)
            assertInsideWorkspace(rootDir, realAncestor)
            break
        } catch (error) {
            if (error?.code !== 'ENOENT') throw error
            const parent = path.dirname(existingAncestor)
            if (parent === existingAncestor) throw new Error('无法确定安全的写入目录')
            existingAncestor = parent
        }
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    return targetPath
}

/**
 * 实时列出工作区目录内容。默认只列一层，depth=2 时多展开一层。
 * 目录名以 / 结尾并排在文件之前，便于模型逐层下钻。
 */
async function listWorkspaceDirectory(workspaceName, relativePath, depth) {
    const { targetPath } = resolveDirectoryPath(workspaceName, relativePath)
    const stat = await fs.stat(targetPath)
    if (!stat.isDirectory()) throw new Error(`${relativePath} 不是目录`)

    const maxDepth = Math.max(1, Math.min(Number(depth) || 1, 2))
    const lines = []

    const walk = async (dir, prefix, level) => {
        let entries
        try {
            entries = await fs.readdir(dir, { withFileTypes: true })
        } catch {
            return                       // 无权限/已消失的目录：跳过，不要让整次列举失败
        }

        const dirs = []
        const files = []
        for (const entry of entries) {
            if (entry.isSymbolicLink()) continue
            if (entry.isDirectory()) {
                if (IGNORED.has(entry.name)) continue
                dirs.push(entry.name)
            } else if (entry.isFile()) {
                files.push(entry.name)
            }
        }
        dirs.sort()
        files.sort()

        for (const name of dirs) {
            if (lines.length >= MAX_LIST_ENTRIES) return
            lines.push(`${prefix}${name}/`)
            if (level < maxDepth) {
                await walk(path.join(dir, name), `${prefix}${name}/`, level + 1)
            }
        }
        for (const name of files) {
            if (lines.length >= MAX_LIST_ENTRIES) return
            lines.push(`${prefix}${name}`)
        }
    }

    await walk(targetPath, '', 1)

    if (lines.length === 0) {
        return { success: true, content: '该目录为空' }
    }
    const truncated = lines.length >= MAX_LIST_ENTRIES
    return {
        success: true,
        content: truncated
            ? `${lines.join('\n')}\n……已截断到 ${MAX_LIST_ENTRIES} 项，请指定更具体的 path`
            : lines.join('\n')
    }
}

/**
 * 在工作区中按关键字搜索文本，返回 "相对路径:行号: 内容"。
 * 先广度优先收集候选文件，再用小并发池读取匹配。
 */
async function searchWorkspaceText(request) {
    const { workspaceName, path: relativePath, pattern, glob, useRegex, maxResults } = request ?? {}
    const { rootDir, targetPath } = resolveDirectoryPath(workspaceName, relativePath)

    const stat = await fs.stat(targetPath)
    if (!stat.isDirectory()) throw new Error(`${relativePath} 不是目录`)

    const keyword = (pattern || '').trim()
    if (!keyword) throw new Error('搜索关键字不能为空')
    if (keyword.length > 200) throw new Error('搜索关键字过长')

    let matcher
    if (useRegex) {
        try {
            matcher = new RegExp(keyword, 'i')
        } catch (error) {
            throw new Error(`正则表达式无效：${error.message}`)
        }
    } else {
        const lowered = keyword.toLowerCase()
        matcher = { test: (line) => line.toLowerCase().includes(lowered) }
    }

    const wantedExt = (glob || '').trim().toLowerCase()
    const limit = Math.max(1, Math.min(Number(maxResults) || 100, MAX_SEARCH_RESULTS))

    // 1. 收集候选文件
    const queue = [targetPath]
    const candidates = []
    while (queue.length) {
        const current = queue.shift()
        let entries
        try {
            entries = await fs.readdir(current, { withFileTypes: true })
        } catch {
            continue
        }
        for (const entry of entries) {
            if (entry.isSymbolicLink()) continue
            const full = path.join(current, entry.name)
            if (entry.isDirectory()) {
                if (!IGNORED.has(entry.name)) queue.push(full)
                continue
            }
            if (!entry.isFile()) continue
            const ext = path.extname(entry.name).toLowerCase()
            if (!TEXT_EXTENSIONS.has(ext)) continue
            if (wantedExt && ext !== wantedExt) continue
            candidates.push(full)
        }
    }

    // 2. 并发匹配，命中够了就停
    const hits = []
    let cursor = 0
    const worker = async () => {
        while (cursor < candidates.length && hits.length < limit) {
            const file = candidates[cursor]
            cursor += 1
            let buffer
            try {
                const fileStat = await fs.stat(file)
                if (fileStat.size > MAX_READ_BYTES) continue
                buffer = await fs.readFile(file)
            } catch {
                continue
            }
            if (buffer.includes(0)) continue                 // 二进制内容跳过
            const lines = buffer.toString('utf-8').split(/\r?\n/)
            for (let index = 0; index < lines.length; index += 1) {
                if (!matcher.test(lines[index])) continue
                if (hits.length >= limit) return
                const relative = path.relative(rootDir, file).split(path.sep).join('/')
                hits.push(`${relative}:${index + 1}: ${lines[index].trim().slice(0, 200)}`)
            }
        }
    }
    await Promise.all(
        Array.from({ length: Math.min(SEARCH_CONCURRENCY, candidates.length) }, worker)
    )

    if (hits.length === 0) {
        return { success: true, content: `没有匹配 "${keyword}" 的内容` }
    }
    const truncated = hits.length >= limit
    return {
        success: true,
        content: truncated
            ? `${hits.join('\n')}\n……已截断到 ${limit} 条，请缩小 path 或 file_glob 范围`
            : hits.join('\n')
    }
}

/**
 * 把 stdout/stderr 合并成受行数限制的文本，保留头尾，中间省略。
 * 编译错误的真正原因通常在末尾，所以不能只截前面。
 */
function formatCommandOutput(stdout, stderr) {
    const combined = [stdout.trimEnd(), stderr.trimEnd()].filter(Boolean).join('\n')
    if (!combined) return '（没有输出）'

    const lines = combined.split(/\r?\n/)
    if (lines.length <= MAX_COMMAND_OUTPUT_LINES) return combined

    const half = Math.floor(MAX_COMMAND_OUTPUT_LINES / 2)
    return [
        ...lines.slice(0, half),
        `……省略 ${lines.length - MAX_COMMAND_OUTPUT_LINES} 行……`,
        ...lines.slice(-half)
    ].join('\n')
}

/**
 * 在工作区根目录执行白名单内的命令。
 * 用 spawn + 参数数组，不拼接 shell 字符串。
 */
async function runWorkspaceCommand(request) {
    const { workspaceName, command, args, timeoutSeconds } = request ?? {}
    const rootDir = getWorkspaceRoot(workspaceName)
    if (!rootDir) throw new Error('本地工作区不存在，请重新选择工作目录')

    const program = (command || '').trim()
    const argumentList = Array.isArray(args) ? args.map(String) : []
    if (!COMMAND_RULES[program]) {
        throw new Error(`命令不在允许范围内：${program || '空'}`)
    }
    if (argumentList.length > 20) throw new Error('命令参数过多')

    const allowed = COMMAND_RULES[program]
    if (allowed.length > 0) {
        if (!allowed.includes(argumentList[0])) {
            throw new Error(`不允许执行 ${program} ${argumentList[0] || ''}`)
        }
        const isPackageManager = program === 'npm' || program === 'pnpm' || program === 'yarn'
        if (isPackageManager && argumentList[0] === 'run') {
            if (!RUN_SCRIPTS.has(argumentList[1])) {
                throw new Error(`不允许执行脚本 ${argumentList[1] || '空'}`)
            }
        }
    }

    // Windows 下 npm/pnpm 需要走 .cmd
    const executable = process.platform === 'win32' && !program.includes('.')
        ? `${program}.cmd`
        : program
    const limitMs = Math.max(5, Math.min(Number(timeoutSeconds) || 60, 110)) * 1000

    return await new Promise((resolve) => {
        let settled = false
        const child = spawn(executable, argumentList, {
            cwd: rootDir,
            shell: false,
            windowsHide: true
        })
        let stdout = ''
        let stderr = ''

        const finish = (result) => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            resolve(result)
        }
        const timer = setTimeout(() => {
            child.kill('SIGKILL')
            finish({ success: false, error: `命令执行超过 ${limitMs / 1000} 秒已终止` })
        }, limitMs)

        child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
        child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
        child.on('error', (error) => finish({ success: false, error: error.message }))
        child.on('close', (code) => {
            // 退出码非 0 也把输出交给模型看，编译错误本身就是有效信息
            finish({
                success: true,
                content: `退出码 ${code}\n${formatCommandOutput(stdout, stderr)}`
            })
        })
    })
}

async function executeWorkspaceTool(request) {
    const { workspaceName, operation, path: relativePath, depth } = request ?? {}
    if (operation === 'search') {
        return await searchWorkspaceText(request)
    }
    if (operation === 'command') {
        return await runWorkspaceCommand(request)
    }
    if (operation === 'list') {
        return await listWorkspaceDirectory(workspaceName, relativePath, depth)
    }
    if (operation === 'read') {
        const targetPath = await resolveReadableFile(workspaceName, relativePath)
        const startLine = Math.max(1, Number(request.startLine) || 1)
        const endLine = Math.max(startLine, Math.min(Number(request.endLine) || 400, startLine + 999))
        const lines = (await fs.readFile(targetPath, 'utf-8')).split(/\r?\n/)
        const selected = lines.slice(startLine - 1, endLine)
        return {
            success: true,
            content: selected.length
                ? selected.map((line, index) => `${startLine + index}: ${line}`).join('\n')
                : '指定行范围没有内容'
        }
    }

    if (operation === 'write') {
        if (typeof request.content !== 'string') throw new Error('写入内容必须是字符串')
        if (request.content.length > MAX_WRITE_CHARS) {
            throw new Error('单次写入内容不能超过 200 万字符')
        }

        const targetPath = await resolveWritableFile(workspaceName, relativePath)
        await fs.writeFile(targetPath, request.content, 'utf-8')
        return { success: true, content: `已写入 ${relativePath}` }
    }

    if (operation === 'edit') {
        if (typeof request.oldText !== 'string' || !request.oldText) {
            throw new Error('待替换的旧文本不能为空')
        }
        if (typeof request.newText !== 'string') throw new Error('新文本必须是字符串')

        const targetPath = await resolveReadableFile(workspaceName, relativePath)
        const originalContent = await fs.readFile(targetPath, 'utf-8')
        const occurrenceCount = originalContent.split(request.oldText).length - 1
        if (occurrenceCount === 0) throw new Error('文件中没有找到待替换文本')
        if (!request.replaceAll && occurrenceCount !== 1) {
            throw new Error(`待替换文本出现 ${occurrenceCount} 次，请提供更精确的上下文或启用全部替换`)
        }

        const updatedContent = request.replaceAll
            ? originalContent.split(request.oldText).join(request.newText)
            : originalContent.replace(request.oldText, request.newText)
        if (updatedContent.length > MAX_WRITE_CHARS) {
            throw new Error('修改后的文件内容不能超过 200 万字符')
        }
        await fs.writeFile(targetPath, updatedContent, 'utf-8')
        return {
            success: true,
            content: `已修改 ${relativePath}，替换 ${request.replaceAll ? occurrenceCount : 1} 处`
        }
    }

    if (operation === 'delete') {
        const { targetPath } = await resolveExistingFile(workspaceName, relativePath)
        await shell.trashItem(targetPath)
        return { success: true, content: `已将 ${relativePath} 移动到回收站` }
    }

    throw new Error(`不支持的文件操作：${operation || '未知'}`)
}

export {
    executeWorkspaceTool,
    registerWorkspace,
    listLocalWorkspaces
}
