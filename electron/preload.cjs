// Electron preload script: exposes a minimal API for download folder
// selection to the renderer (start.html, index.html) via window.electronAPI.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Ask main process to choose and remember a download directory.
  chooseDownloadDir: () => ipcRenderer.invoke('downloads:chooseBaseDir'),
  // Get the current download directory (or default Downloads if none set).
  getDownloadDir: () => ipcRenderer.invoke('downloads:getBaseDir'),
});
