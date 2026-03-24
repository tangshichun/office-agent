// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import {contextBridge, ipcRenderer} from "electron";

const logger = async data => {
  return await ipcRenderer.invoke('logger', data);
};

contextBridge.exposeInMainWorld('ipc', {
  logger
})