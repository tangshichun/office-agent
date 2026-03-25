import {ipcRenderer} from "electron";

export default {
    createAgent: (data) => {
        return ipcRenderer.invoke('agent:create', data);
    },
    sendMessage: (data) => {
        return ipcRenderer.invoke('agent:message', data);
    },

    onMessage: (callback) => ipcRenderer.on('agent-back-message', callback),
}