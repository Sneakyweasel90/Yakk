const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("minimize"),
  maximize: () => ipcRenderer.send("maximize"),
  close: () => ipcRenderer.send("close"),
  notify: (title, body) => ipcRenderer.send("notify", { title, body }),
});