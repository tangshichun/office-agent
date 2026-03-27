import fs from "node:fs";
import path from "path";
import {tool} from "@langchain/core/tools";
import {formatResults} from "./FileTools";
import {z} from "zod";

const getAbsolutePath = (filePath) => {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
}

const copyExcel = (filePath) => {
  const fullPath = getAbsolutePath(filePath)

  if (!fs.existsSync(fullPath)) {
    return "文件已经存在，需要询问用户是否覆盖"
  }

  try {
    fs.copyFile("./empty.xlsx", fullPath, 'utf-8')
    return {path: fullPath, success: true, message: '创建excel成功'}
  } catch (error) {
    console.error(error);
    return {path: fullPath, success: false, message: '创建excel失败'}
  }
}


const writeFilesTool = tool(
  async ({files}) => {
    const results = files.map(({path, content}) => copyExcel(path, content))
    return formatResults(results, '创建Excel')
  },
  {
    name: 'write_files',
    description: `将内容写入一个或多个本地文件。

用途：
- 创建新的Excel类型文件，匹配后缀名为.xlsx的文件
- 支持同时写入多个文件
- 可以用于生成代码文件、配置文件、文档等
- 自动创建父目录（如果不存在）
- 写入之前先判断路径上是否已有文件，如果有文件，必须询问用户是否覆盖，如果用户选择不覆盖，那么询问用户 1.重命名相关的解决办法  2.跳过重复文件的写入  3.终止这一批次所有操作

注意事项：
- 如果有多个文件要写入，那么你一次性传入多个文件参数写入即可，不要调用多次每次写入一个文件
- 如果文件已存在，会覆盖原有内容
- 文件路径可以是绝对路径或相对于当前工作目录的路径
- 写入二进制数据请先转换为 Base64 或其他编码格式`,
    schema: z.object({
      files: z.array(z.object({
        path: z.string().describe('文件的绝对路径或相对于当前工作目录的路径'),
        content: z.string().describe('文件内容'),
      })).min(1).describe('要写入的文件列表，包含文件路径和内容'),
    }),
  }
)