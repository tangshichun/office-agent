// fileMemory.js
import fs from 'fs/promises';
import path from 'path';
import {SystemMessage} from "@langchain/core/messages";

export class FileMemory {
  constructor(options = {}) {
    this.historyDir = options.historyDir || './chat_histories';
    this.sessionId = options.sessionId || 'default';
    this.chatHistory = [];

    // 确保目录存在
    this.ensureDirectoryExists();
  }

  // 确保历史记录目录存在
  async ensureDirectoryExists() {
    try {
      fs.mkdir(this.historyDir, {recursive: true});
    } catch (error) {
      console.error('创建历史记录目录失败:', error);
    }
  }

  // 获取当前会话的文件路径
  getSessionFilePath() {
    return path.join(this.historyDir, `${this.sessionId}.json`);
  }

  // 从文件加载历史记录
  async loadMemoryVariables() {
    try {
      const sessionFile = this.getSessionFilePath();
      const data = await fs.readFile(sessionFile, 'utf8');
      this.chatHistory = JSON.parse(data);
    } catch (error) {
      // 文件不存在或读取失败，初始化空历史
      console.log(`会话文件不存在或读取失败，初始化新历史记录: ${this.sessionId}`);
      this.chatHistory = [];
    }

    // 返回格式化的聊天历史字符串
    let historyString = '';
    for (const item of this.chatHistory) {
      historyString += `${item.role}: ${item.content}\n`;
    }

    return {history: historyString, chat_history: this.chatHistory};
  }

  // 保存历史记录到文件
  async saveContext(conversationString) {
    try {
      const sessionFile = this.getSessionFilePath();

      // 如果当前历史为空，从文件加载（可能其他地方已写入）
      if (this.chatHistory.length === 0) {
        try {
          const data = await fs.readFile(sessionFile, 'utf8');
          this.chatHistory = JSON.parse(data);
        } catch (error) {
          // 文件不存在则保持空数组
        }
      }

      // 添加用户输入
      conversationString.inputs && this.chatHistory.push({
        role: 'user',
        content: conversationString.inputs.input,
        timestamp: new Date().toISOString()
      });

      // 添加助手回复
      conversationString.outputs && this.chatHistory.push({
        role: 'model',
        content: conversationString.outputs.response,
        timestamp: new Date().toISOString()
      });

      // 限制历史记录数量，保留最近的50条
      if (this.chatHistory.length > 50) {
        this.chatHistory = this.chatHistory.slice(-50);
      }

      // 写入当前会话文件
      await fs.writeFile(sessionFile, JSON.stringify(this.chatHistory, null, 2));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  }

  // 获取当前会话的历史记录
  async getHistory() {
    try {
      const sessionFile = this.getSessionFilePath();
      const data = await fs.readFile(sessionFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  // 清除当前会话的历史记录
  async clearHistory() {
    try {
      const sessionFile = this.getSessionFilePath();
      await fs.unlink(sessionFile);
      this.chatHistory = [];
    } catch (error) {
      console.error('清除历史记录失败:', error);
    }
  }

  // 设置新的会话ID
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }
}

// 工具函数：获取所有会话ID
export async function getAllSessions(historyDir = './chat_histories') {
  console.error("getAllSessions")
  try {
    await fs.mkdir(historyDir, {recursive: true});
    const files = await fs.readdir(historyDir);
    const result = [];
    for (const fileName of files) {
      const dataListStr = await fs.readFile(path.join(historyDir, fileName), 'utf8');
      const dataList = JSON.parse(dataListStr);
      result.push({
        sessionId: fileName.replace('.json', ''),
        // 目前只留第一个和最后一个就够了
        list: dataList.length > 1 ? [dataList[0], dataList[dataList.length - 1]] : [...dataList]
      })
    }
    return result.reverse();
  } catch (error) {
    console.log(error)
    return [];
  }
}

// 工具函数：删除指定会话
export async function deleteSession(sessionId, historyDir = './chat_histories') {
  try {
    const sessionFile = path.join(historyDir, `${sessionId}.json`);
    await fs.unlink(sessionFile);
    return true;
  } catch (error) {
    console.error(`删除会话 ${sessionId} 失败:`, error);
    return false;
  }
}

export function buildSystemMessage(history = []) {
  if (history.length === 0) {
    return new SystemMessage("当你看到这条消息的时候，代表之前没有对话记录，当用户问你关于之前的记录时，你可以告诉用户没有历史记录，或者你也可以根据用户的提问来进行回答，不需要担心之前的历史记录，因为没有历史记录。");
  }

  let historyText = "以下是之前的对话历史:\n\n";
  for (const item of history.slice(-10)) { // 最近10条历史
    const roleLabel = item.role === 'user' ? '用户' : '助手';
    historyText += `${roleLabel}: ${item.content}\n\n`;
  }

  return new SystemMessage(historyText + "这是我们所有的对话的历史记录，请根据以上历史记录回答用户的问题，:");
}