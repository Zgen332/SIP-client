const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSipConfig: () => ipcRenderer.invoke('get-sip-config'),
  saveSipConfig: (config) => ipcRenderer.invoke('save-sip-config', config),

  showIncomingCall: (info) => ipcRenderer.send('show-incoming-call', info),
  closePopup: () => ipcRenderer.send('close-popup'),

  onTriggerAnswer: (callback) => ipcRenderer.on('trigger-answer-call', callback),
  onTriggerReject: (callback) => ipcRenderer.on('trigger-reject-call', callback),

  acceptCallAction: () => ipcRenderer.send('accept-call-action'),
  rejectCallAction: () => ipcRenderer.send('reject-call-action'),
  onSetCallerInfo: (callback) =>
    ipcRenderer.on('set-caller-info', (_, value) => callback(value))
});