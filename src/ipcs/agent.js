import {ipcRenderer} from "electron";

export default {
    getSessions: (callback) => {
        return ipcRenderer.invoke('agent:list', callback);
    },
    deleteSessions: (sessionId) => {
        return ipcRenderer.invoke('agent:delete', sessionId);
    },
    createAgent: (data) => {
        return ipcRenderer.invoke('agent:create', data);
    },
    sendMessage: (data) => {
        return ipcRenderer.invoke('agent:message', data);
    },

    onMessage: (callback) => ipcRenderer.on('agent-back-message', callback),
}