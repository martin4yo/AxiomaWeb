const { contextBridge } = require('electron')

// Exponer API segura al renderer process
contextBridge.exposeInMainWorld('printManager', {
  version: '1.0.0'
})
