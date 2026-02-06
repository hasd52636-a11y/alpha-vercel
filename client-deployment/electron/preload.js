const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electron', {
  app: {
    getVersion: () => ipcRenderer.invoke('get-app-version')
  },
  platform: process.platform,
  isDev: process.env.NODE_ENV === 'development'
});

// 监听主进程发送的消息
ipcRenderer.on('app-version', (event, version) => {
  console.log('App version:', version);
});