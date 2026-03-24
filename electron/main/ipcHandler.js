const { app, ipcMain, shell, dialog } = require('electron');


function registryHandler(window) {
  ipcMain.handle('logger', (_, ...message) => {
    console.log(...message);
  })
}

export {
  registryHandler
}