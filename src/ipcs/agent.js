import {ipcRenderer} from "electron";

export default {
    getSessions: (callback) => {
        return ipcRenderer.invoke('agent:list', callback);
    },
    deleteSessions: (sessionId) => {
        return ipcRenderer.invoke('agent:delete', sessionId);
    },
    getSessionDetail: (sessionId) => {
        return ipcRenderer.invoke('agent:detail', sessionId);
    },
    sendMessage: (data) => {
        return ipcRenderer.invoke('agent:message', data);
    },

    onMessage: (callback) => ipcRenderer.on('agent-back-message', callback),
}