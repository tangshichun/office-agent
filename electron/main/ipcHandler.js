const { app, ipcMain, shell, dialog } = require('electron');


function registryHandler(window) {
  ipcMain.handle('logger', (_, ...message) => {
    console.log(...message);
  })

  ipcMain.handle('agent:create', (_, data) => {
    console.log('create agent', data.type)
  })
}

export {
  registryHandler
}