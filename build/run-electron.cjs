// Windows 任务管理器读取 EXE 资源；开发启动也需要带品牌资源的程序副本。
const fs = require('node:fs/promises')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { pathToFileURL } = require('node:url')

const root = path.join(__dirname, '..')

async function prepareElectron() {
  const original = require('electron')
  if (process.platform !== 'win32') return original

  const runtimeDirectory = path.join(path.dirname(original), '../.lumina-development')
  const runtime = path.join(runtimeDirectory, path.basename(original))
  const cacheFile = path.join(runtimeDirectory, '.identity.json')
  const icon = path.join(root, 'resources/icon.ico')
  const source = await fs.stat(original)
  const identity = JSON.stringify({
    brand: 'Lumina-v1',
    sourceSize: source.size,
    sourceModified: source.mtimeMs,
    icon: createHash('sha256')
      .update(await fs.readFile(icon))
      .digest('hex')
  })
  const cached = await fs.readFile(cacheFile, 'utf8').catch(() => '')
  if (
    cached === identity &&
    (await fs.stat(runtime).then(
      () => true,
      () => false
    ))
  )
    return runtime

  // Electron 以程序名判断开发模式，必须保留 electron.exe，品牌只写入资源。
  await fs.cp(path.dirname(original), runtimeDirectory, {
    recursive: true,
    filter: (source) =>
      ![
        'EasyChat.exe',
        'Lumina.exe',
        '.easychat-development.json',
        '.lumina-development.json'
      ].includes(path.basename(source))
  })
  const { executeAppBuilder } = require('builder-util')
  await executeAppBuilder([
    'rcedit',
    '--args',
    JSON.stringify([
      runtime,
      '--set-icon',
      icon,
      '--set-version-string',
      'FileDescription',
      'Lumina',
      '--set-version-string',
      'ProductName',
      'Lumina',
      '--set-version-string',
      'InternalName',
      'Lumina',
      '--set-version-string',
      'OriginalFilename',
      'electron.exe'
    ])
  ])
  await fs.writeFile(cacheFile, identity)
  return runtime
}

async function main() {
  // electron-vite 使用这个路径启动主进程和 Chromium 子进程。
  if (!process.env.ELECTRON_EXEC_PATH) process.env.ELECTRON_EXEC_PATH = await prepareElectron()
  const cli = path.join(
    path.dirname(require.resolve('electron-vite/package.json')),
    'bin/electron-vite.js'
  )
  process.argv[1] = cli
  await import(pathToFileURL(cli).href)
}

module.exports = { prepareElectron }
if (require.main === module) {
  main().catch((error) => {
    console.error('开发程序启动失败：', error.message)
    process.exitCode = 1
  })
}
