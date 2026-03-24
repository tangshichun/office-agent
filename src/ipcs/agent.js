import {ipcRenderer} from "electron";

export default {
    createAgent: (data) => {
        return ipcRenderer.invoke('agent:create', data);
    }
}