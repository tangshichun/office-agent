import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'node:fs'
import path from 'path'

const execAsync = promisify(exec)

const platform = process.platform

const formatResults = (results, actionName) => {
  const successResults = results.filter(r => r.success)
  const failResults = results.filter(r => !r.success)
  
  let output = `${actionName}结果：共 ${results.length} 个，成功 ${successResults.length} 个`
  
  if (successResults.length > 0) {
    output += '\n成功：\n'
    successResults.forEach(r => {
      output += `- ${r.path}${r.message ? ' - ' + r.message : ''}${r.content !== undefined ? ` (${r.content.length} 字符)` : ''}\n`
    })
  }
  
  if (failResults.length > 0) {
    output += '\n失败：\n'
    failResults.forEach(r => {
      output += `- ${r.path} - ${r.error}\n`
    })
  }
  
  return output
}

const getAbsolutePath = (filePath) => {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
}

const ensureDirectory = (filePath) => {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const openFile = async (filePath) => {
  const fullPath = getAbsolutePath(filePath)
  
  if (!fs.existsSync(fullPath)) {
    return { path: fullPath, success: false, error: '文件不存在' }
  }

  try {
    const command = platform === 'win32'
      ? `start "" "${fullPath}"`
      : platform === 'darwin'
        ? `open "${fullPath}"`
        : `xdg-open "${fullPath}"`

    await execAsync(command)
    return { path: fullPath, success: true, message: '文件已打开' }
  } catch (error) {
    return { path: fullPath, success: false, error: error.message }
  }
}

const readFile = (filePath) => {
  const fullPath = getAbsolutePath(filePath)

  if (!fs.existsSync(fullPath)) {
    return { path: fullPath, success: false, error: '文件不存在' }
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8')
    return { path: fullPath, success: true, content }
  } catch (error) {
    return { path: fullPath, success: false, error: error.message }
  }
}

const writeFile = (filePath, content = '') => {
  const fullPath = getAbsolutePath(filePath)

  try {
    ensureDirectory(fullPath)
    fs.writeFileSync(fullPath, content, 'utf-8')
    return { path: fullPath, success: true, message: '文件写入成功' }
  } catch (error) {
    return { path: fullPath, success: false, error: error.message }
  }
}

const deleteFile = (filePath) => {
  const fullPath = getAbsolutePath(filePath)

  if (!fs.existsSync(fullPath)) {
    return { path: fullPath, success: false, error: '文件不存在' }
  }

  try {
    fs.rmSync(fullPath)
    return { path: fullPath, success: true, message: '文件删除成功' }
  } catch (error) {
    return { path: fullPath, success: false, error: error.message }
  }
}

const checkFileExists = (filePath) => {
  const fullPath = getAbsolutePath(filePath)
  const exists = fs.existsSync(fullPath)
  return { path: fullPath, exists, success: true }
}

const FileSchema = z.object({
  path: z.string().describe('文件的绝对路径或相对于当前工作目录的路径'),
})

const FileWithContentSchema = z.object({
  path: z.string().describe('文件的绝对路径或相对于当前工作目录的路径'),
  content: z.string().describe('文件内容'),
})

const ReadFilesSchema = z.object({
  files: z.array(FileSchema).min(1).describe('要读取的文件列表'),
})

const WriteFilesSchema = z.object({
  files: z.array(FileWithContentSchema).min(1).describe('要写入的文件列表，包含文件路径和内容'),
})

const OpenFilesSchema = z.object({
  files: z.array(FileSchema).min(1).describe('要用系统默认应用打开的文件列表'),
})

const DeleteFilesSchema = z.object({
  files: z.array(FileSchema).min(1).describe('要删除的文件列表'),
})

const CheckFilesSchema = z.object({
  files: z.array(FileSchema).min(1).describe('要检查是否存在的文件列表'),
})

const readFilesTool = tool(
  async ({ files }) => {
    const results = files.map(({ path }) => readFile(path))
    return formatResults(results, '读取文件')
  },
  {
    name: 'read_files',
    description: `读取一个或多个本地文件的完整内容。

用途：
- 查看代码文件、配置文件、文档等任意文本文件
- 支持同时读取多个文件进行对比或分析
- 读取图片时会返回文件路径而非内容（二进制文件请使用 open_files 打开）

注意事项：
- 文件路径可以是绝对路径或相对于当前工作目录的路径
- 二进制文件（如图片、音视频）无法正确读取内容，请使用 open_files 打开
- 如果文件不存在或无读取权限，会返回错误信息`,
    schema: ReadFilesSchema,
  }
)

const writeFilesTool = tool(
  async ({ files }) => {
    const results = files.map(({ path, content }) => writeFile(path, content))
    return formatResults(results, '写入文件')
  },
  {
    name: 'write_files',
    description: `将内容写入一个或多个本地文件。

用途：
- 创建新文件或修改现有文件内容
- 支持同时写入多个文件
- 可以用于生成代码文件、配置文件、文档等
- 自动创建父目录（如果不存在）

注意事项：
- 如果有多个文件要写入，那么你一次性传入多个文件参数写入即可，不要调用多次每次写入一个文件
- 如果文件已存在，会覆盖原有内容
- 文件路径可以是绝对路径或相对于当前工作目录的路径
- 写入二进制数据请先转换为 Base64 或其他编码格式`,
    schema: WriteFilesSchema,
  }
)

const openFilesTool = tool(
  async ({ files }) => {
    const results = await Promise.all(files.map(({ path }) => openFile(path)))
    return formatResults(results, '打开文件')
  },
  {
    name: 'open_files',
    description: `用系统默认应用程序打开一个或多个文件。

用途：
- 打开图片、音视频、PDF 等二进制文件查看
- 调用系统默认程序编辑代码文件（如 VS Code）
- 快速预览各类文件而无需自行处理
- 打开文件夹（传入文件夹路径）

注意事项：
- 写入之前先判断路径上是否已有文件，如果有文件，必须询问用户是否覆盖，如果用户选择不覆盖，那么询问用户 1.重命名相关的解决办法  2.跳过重复文件的写入  3.终止这一批次所有操作
- 如果有多个文件写入，优先批量写入多个文件
- Windows 使用 \`start\` 命令，macOS 使用 \`open\` 命令，Linux 使用 \`xdg-open\`
- 部分文件类型可能没有默认应用程序，需要手动选择
- 批量打开时可能会弹出多个应用程序窗口
- 如果文件不存在，会返回错误信息`,
    schema: OpenFilesSchema,
  }
)

const deleteFilesTool = tool(
  async ({ files }) => {
    const results = files.map(({ path }) => deleteFile(path))
    return formatResults(results, '删除文件')
  },
  {
    name: 'delete_files',
    description: `删除一个或多个本地文件。

用途：
- 删除临时文件或不再需要的文件
- 批量清理文件
- 注意：此操作不可撤销，请谨慎使用

注意事项：
- 如果用户没有明确说明删除文件，那么你在删除之前需要询问，绝对不允许未经用户允许删除任何一个文件
- 删除的是文件而非文件夹（文件夹请使用 rm 命令）
- 如果文件不存在，会返回错误信息
- 删除多个文件时，如果部分失败，会返回每个文件的删除结果`,
    schema: DeleteFilesSchema,
  }
)

const checkFilesTool = tool(
  async ({ files }) => {
    const results = files.map(({ path }) => checkFileExists(path))
    
    let output = `检查文件存在性结果：共 ${results.length} 个文件\n`
    results.forEach(r => {
      output += `${r.path} - ${r.exists ? '文件已存在' : '文件不存在'}\n`
    })
    
    return output
  },
  {
    name: 'check_files',
    description: `检查一个或多个文件是否存在。

用途：
- 批量检查多个文件是否存在
- 在读取或操作文件前先检查其存在性
- 验证文件路径是否正确

注意事项：
- 如果有多个文件查询是否存在，优先批量查询多个文件，尽可能一次性查询完成
- 返回每个文件的检查结果（存在/不存在）
- 文件路径可以是绝对路径或相对于当前工作目录的路径`,
    schema: CheckFilesSchema,
  }
)

export const fileTools = [readFilesTool, writeFilesTool, openFilesTool, deleteFilesTool, checkFilesTool]
