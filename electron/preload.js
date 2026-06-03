const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getSession: () => ipcRenderer.invoke('session:get'),
  setSession: (data) => ipcRenderer.invoke('session:set', data),
  clearSession: () => ipcRenderer.invoke('session:clear'),
  biometricEnroll: (user) => ipcRenderer.invoke('biometric:enroll', user),
  biometricIdentify: () => ipcRenderer.invoke('biometric:identify'),
});
