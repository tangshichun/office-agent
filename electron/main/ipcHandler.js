import {callLLM, getSessionMemory} from "../agent";
import {deleteSession, getAllSessions} from "../agent/file-memory";

const { app, ipcMain, shell, dialog } = require('electron');


function registryHandler(window) {
  ipcMain.handle('logger', (_, ...message) => {
    console.log(...message);
  })

  ipcMain.handle('agent:detail', async (_, sessionId) => {
    const list = await getSessionMemory(sessionId);
    console.log('agent:list', list);
    return list;
  })

  ipcMain.handle('agent:message', async (event, data) => {
    console.log('agent:message', data.message)
    if (!data.message) {
      return;
    }

    const onProgress = (progressData) => {
      // event.sender 是对应窗口的 webContents
      event.sender.send('agent-back-message', progressData);
    };

    try {
      // 调用 callLLM，传入回调
      const finalResult = await callLLM(data.sessionId ,data.message, onProgress);
      console.log("data.sessionId", data.sessionId)

      // 发送最终结果
      event.sender.send('llm-complete', finalResult);
    } catch (error) {
      event.sender.send('llm-error', error.message);
    }
  })

  ipcMain.handle('agent:list', async (event) => {
    return await getAllSessions();
  })

  ipcMain.handle('agent:delete', async (event, sessionId) => {
    try {
      await deleteSession(sessionId)
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  })

}

export {
  registryHandler
}