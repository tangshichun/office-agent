import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import * as XLSX from 'xlsx'
import path from 'path'
import * as fs from 'fs';
XLSX.set_fs(fs);

const getAbsolutePath = (filePath) => {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
}

const ensureDirectory = (filePath) => {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export const formatResults = (results, actionName) => {
  const successResults = results.filter(r => r.success)
  const failResults = results.filter(r => !r.success)

  let output = `${actionName}结果：共 ${results.length} 个，成功 ${successResults.length} 个`

  if (successResults.length > 0) {
    output += '\n成功：\n'
    successResults.forEach(r => {
      output += `- ${r.path}${r.message ? ' - ' + r.message : ''}${r.dataLength !== undefined ? ` (${r.dataLength} 行数据)` : ''}\n`
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

const readExcel = (filePath, sheetName) => {
  const fullPath = getAbsolutePath(filePath)

  if (!fs.existsSync(fullPath)) {
    return { path: fullPath, success: false, error: '文件不存在' }
  }

  try {
    const workbook = XLSX.readFile(fullPath)
    const sheetNames = workbook.SheetNames

    if (sheetNames.length === 0) {
      return { path: fullPath, success: false, error: '文件中没有 Sheet' }
    }

    let targetSheetName = sheetName
    if (!targetSheetName) {
      targetSheetName = sheetNames[0]
    }

    if (!sheetNames.includes(targetSheetName)) {
      return { path: fullPath, success: false, error: `Sheet "${targetSheetName}" 不存在，可用的 Sheet 有: ${sheetNames.join(', ')}` }
    }

    const worksheet = workbook.Sheets[targetSheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)

    return {
      path: fullPath,
      success: true,
      sheetName: targetSheetName,
      data,
      dataLength: data.length
    }
  } catch (error) {
    return { path: fullPath, success: false, error: error.message }
  }
}


const writeExcel = (filePath, sheets) => {
  const fullPath = filePath

  try {
    ensureDirectory(fullPath)

    let workbook
    if (fs.existsSync(fullPath)) {
      workbook = XLSX.readFile(fullPath)
    } else {
      workbook = XLSX.utils.book_new()
    }


    const existingSheetNames = workbook.SheetNames

    let autoSheetIndex = 1

    for (const sheetObj of sheets) {
      const { sheetName, data } = sheetObj

      let targetSheetName
      if (sheetName) {
        targetSheetName = sheetName
      } else {
        while (true) {
          targetSheetName = `Sheet${autoSheetIndex}`
          autoSheetIndex++
          if (!existingSheetNames.includes(targetSheetName) && 
              !sheets.some((s, i) => i < sheets.indexOf(sheetObj) && s.sheetName === targetSheetName)) {
            break
          }
        }
      }

      const isNewSheet = !existingSheetNames.includes(targetSheetName) && 
                        !sheets.some((s, i) => i < sheets.indexOf(sheetObj) && s.sheetName === targetSheetName)

      let worksheet
      if (fs.existsSync(fullPath) && !isNewSheet) {
        worksheet = workbook.Sheets[targetSheetName]
      } else {
        worksheet = XLSX.utils.aoa_to_sheet([[]])
      }

      let updatedCellsCount = 0
      let maxCol = 0
      let maxRow = 0

      for (const cellObj of data) {
        for (const [cellAddr, value] of Object.entries(cellObj)) {
          const validAddr = /^[A-Z]+[0-9]+$/i.test(cellAddr)
          if (!validAddr) {
            return { path: fullPath, success: false, error: `无效的单元格地址: ${cellAddr}` }
          }
          const upperAddr = cellAddr.toUpperCase()
          worksheet[upperAddr] = { t: 's', v: String(value) }

          const colMatch = upperAddr.match(/^[A-Z]+/)
          const rowMatch = upperAddr.match(/[0-9]+$/)
          if (colMatch && rowMatch) {
            const col = colMatch[0].split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0)
            const row = parseInt(rowMatch[0], 10)
            maxCol = Math.max(maxCol, col)
            maxRow = Math.max(maxRow, row)
          }

          updatedCellsCount++
        }
      }

      if (maxCol > 0 && maxRow > 0) {
        const colLetter = (col) => {
          let result = ''
          while (col > 0) {
            col--
            result = String.fromCharCode(65 + (col % 26)) + result
            col = Math.floor(col / 26)
          }
          return result
        }
        worksheet['!ref'] = `A1:${colLetter(maxCol)}${maxRow}`
      }

      if (existingSheetNames.includes(targetSheetName)) {
        workbook.Sheets[targetSheetName] = worksheet
      } else {
        XLSX.utils.book_append_sheet(workbook, worksheet, targetSheetName)
      }
    }

    XLSX.writeFile(workbook, fullPath)

    return {
      path: fullPath,
      success: true,
      message: `数据已写入 ${sheets.length} 个 Sheet`,
      dataLength: sheets.length
    }
  } catch (error) {
    console.log(error)
    return { path: fullPath, success: false, error: error.message }
  }
}

const getSheetNames = (filePath) => {
  const fullPath = getAbsolutePath(filePath)

  if (!fs.existsSync(fullPath)) {
    return { path: fullPath, success: false, error: '文件不存在' }
  }

  try {
    const workbook = XLSX.readFile(fullPath)
    const sheetNames = workbook.SheetNames

    return {
      path: fullPath,
      success: true,
      sheetNames,
      message: `共 ${sheetNames.length} 个 Sheet`
    }
  } catch (error) {
    return { path: fullPath, success: false, error: error.message }
  }
}

const ExcelFileSchema = z.object({
  path: z.string().describe('Excel 文件的绝对路径或相对于当前工作目录的路径'),
  sheetName: z.string().optional().describe('Sheet 名称，不指定则默认操作第一个 Sheet'),
})

const SheetDataSchema = z.object({
  sheetName: z.string().optional().describe('Sheet 名称，不填则自动创建名为 "Sheet1", "Sheet2"... 的 Sheet'),
  data: z.array(z.record(z.string(), z.any()))
    .describe('单元格数据数组，如 [{"A1": "值1"}, {"B2": "值2"}]，每个对象包含一个或多个单元格地址和值的映射')
})

const ExcelFileWithDataSchema = z.object({
  path: z.string().describe('Excel 文件的绝对路径或相对于当前工作目录的路径'),
  sheets: z.array(SheetDataSchema).optional().describe('要写入的 Sheet 列表，支持多 Sheet 批量写入（推荐格式）')
}).refine(data => data.sheets || data.data, {
  message: "必须提供 sheets 或 data 字段之一"
})

const ReadExcelFilesSchema = z.object({
  files: z.array(ExcelFileSchema).min(1).describe('要读取的 Excel 文件列表'),
})

const WriteExcelFilesSchema = z.object({
  files: z.array(ExcelFileWithDataSchema).min(1).describe('要写入的 Excel 文件列表，包含文件路径、Sheet 名称和数据'),
})

const GetSheetNamesSchema = z.object({
  files: z.array(ExcelFileSchema).min(1).describe('要查询 Sheet 名称的 Excel 文件列表'),
})

const readExcelFilesTool = tool(
  async ({ files }) => {
    const results = files.map(({ path, sheetName }) => readExcel(path, sheetName))
    return formatResults(results, '读取 Excel 文件')
  },
  {
    name: 'read_excel_files',
    description: `读取一个或多个 Excel (.xlsx) 文件的内容。

用途：
- 读取 Excel 文件中的数据并转换为 JSON 格式
- 支持同时读取多个文件进行对比或分析
- 用于数据处理、分析、导入等场景

返回数据格式：
- 返回结果为 JSON 数组格式，每项对应 Excel 中的一行
- 每个对象包含该行所有列的键值对
- 第一行即为数据内容，无表头

Sheet 操作逻辑：
- 如果指定了 sheetName 参数，会尝试读取指定名称的 Sheet
  - 如果该 Sheet 不存在则返回失败，并列出可用的 Sheet
- 如果未指定 sheetName，默认读取第一个 Sheet
- 建议：优先让用户先调用 get_excel_sheet_names 查询文件有哪些 Sheet，再选择要操作的 Sheet

注意事项：
- 多个文件优先批量处理，一次性传入所有文件参数
- 文件路径可以是绝对路径或相对于当前工作目录的路径
- 如果文件不存在或无读取权限，会返回错误信息
- 返回的数据为 JSON 数组格式，每项对应 Excel 中的一行`,
    schema: ReadExcelFilesSchema,
  }
)

const writeExcelFilesTool = tool(
  async ({ files }) => {
    console.log("files", files)
    const results = files.map((file) => {
      let sheets = file.sheets
      if (!sheets && file.data) {
        sheets = [{ sheetName: file.sheetName || 'Sheet1', data: file.data }]
      }
      if (!sheets) {
        return { path: file.path, success: false, error: '缺少 sheets 或 data 字段' }
      }
      return writeExcel(file.path, sheets)
    })
    return formatResults(results, '写入 Excel 文件')
  },
  {
    name: 'write_excel_files',
    description: `创建或修改一个或多个 Excel (.xlsx) 文件中的指定单元格。

用途：
- 修改 Excel 文件中特定单元格的值
- 批量更新多个单元格
- 创建新的 Excel 文件并写入初始数据
- 支持在一个文件中创建多个 Sheet 页

调用优先级：
- 多文件+多 Sheet 页时，优先一次性传入所有文件的所有 Sheet 数据
- 不需要逐个文件或逐个 Sheet 单独调用，应一次性批量处理

数据格式：
- files 参数为数组，每个元素包含文件路径 path 和 sheets 数组
- sheets 数组中每个元素包含：
  - sheetName（可选）：Sheet 名称
    - 如果填写了 sheetName：查找已存在的同名 Sheet，找不到则新建该名称的 Sheet
    - 如果未填写：自动创建名为 "Sheet1", "Sheet2"... 的 Sheet（按顺序跳过已存在的名称）
  - data：单元格数据数组，如 [{"A1": "值1", "B2": "值2"}, {"C3": "值3"}]
    - 每个对象代表一次批量写入操作，对象的键为单元格地址（如 A1, B4, C10），值为要写入的内容
    - 支持同时在同一个 Sheet 中修改多个单元格
    - 第一行直接为数据，无表头

单元格地址规则：
- 使用 Excel 标准列行表示法，如 A1, B4, C10, AA100 等
- 列标签不区分大小写，会自动转换为大写
- 行号从 1 开始，如 A1 表示第 1 列第 1 行
- 示例：B4 表示第 2 列第 4 行

Sheet 操作逻辑：
- 文件不存在：创建新文件，自动创建第一个 Sheet
- 文件存在时：
  - 传入的 sheetName 查找已存在的 Sheet，找到则写入该 Sheet，找不到则新建同名 Sheet
  - 未传入 sheetName 则自动创建 "Sheet1", "Sheet2"...（跳过已存在的名称）
- 此操作是增量修改，只会更新 data 中指定的单元格，不会影响文件中未指定的单元格内容

示例：
写入单个文件单个 Sheet：
{
  "files": [{
    "path": "test.xlsx",
    "sheets": [{ "sheetName": "数据", "data": [{"A1": "标题", "B1": "值"}] }]
  }]
}

写入单个文件多个 Sheet：
{
  "files": [{
    "path": "test.xlsx",
    "sheets": [
      { "sheetName": "SheetA", "data": [{"A1": "数据1"}] },
      { "data": [{"B1": "数据2"}] }
    ]
  }]
}

写入多个文件，每个文件多个 Sheet：
{
  "files": [
    {
      "path": "file1.xlsx",
      "sheets": [{ "sheetName": "工作表1", "data": [{"A1": "内容"}] }]
    },
    {
      "path": "file2.xlsx",
      "sheets": [
        { "sheetName": "A", "data": [{"A1": "数据A"}] },
        { "data": [{"B1": "数据B"}] }
      ]
    }
  ]
}

注意事项：
- 多个文件+多个 Sheet 时，优先一次性批量传入所有数据
- 文件路径可以是绝对路径或相对于当前工作目录的路径
- 如果父目录不存在，会自动创建`,
    schema: WriteExcelFilesSchema,
  }
)

const getExcelSheetNamesTool = tool(
  async ({ files }) => {
    const results = files.map(({ path }) => getSheetNames(path))

    const successResults = results.filter(r => r.success)
    const failResults = results.filter(r => !r.success)

    let output = `查询 Sheet 名称结果：共 ${results.length} 个，成功 ${successResults.length} 个`

    if (successResults.length > 0) {
      output += '\n\n成功：\n'
      successResults.forEach(r => {
        output += `- ${r.path} (${r.message})\n`
        output += `  Sheet 列表: ${r.sheetNames.join(', ')}\n`
      })
    }

    if (failResults.length > 0) {
      output += '\n失败：\n'
      failResults.forEach(r => {
        output += `- ${r.path} - ${r.error}\n`
      })
    }

    return output
  },
  {
    name: 'get_excel_sheet_names',
    description: `获取一个或多个 Excel (.xlsx) 文件的所有 Sheet 名称。

用途：
- 在读取或写入 Excel 文件前，先查询文件有哪些 Sheet
- 让用户选择要操作的 Sheet 名称
- 检查指定 Sheet 是否存在

注意事项：
- 多个文件优先批量处理，一次性传入所有文件参数
- 文件路径可以是绝对路径或相对于当前工作目录的路径
- 如果文件不存在，会返回错误信息
- 返回文件包含的所有 Sheet 名称列表`,
    schema: GetSheetNamesSchema,
  }
)

export const excelTools = [readExcelFilesTool, writeExcelFilesTool, getExcelSheetNamesTool]
