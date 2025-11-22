const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getSipConfig: () => ipcRenderer.invoke('get-sip-config'),
    saveSipConfig: (config) => ipcRenderer.invoke('save-sip-config', config),
    
    onIncomingCall: (callback) => ipcRenderer.on('sip:incoming-call', callback),
    sendIncomingCallTrigger: (data) => ipcRenderer.send('sip:incoming-call', data),
    
    onPopupShow: (callback) => ipcRenderer.on('popup:show', (_event, value) => callback(value)),
    sendPopupAction: (action) => ipcRenderer.send('popup:action', action),
    onSipControl: (callback) => ipcRenderer.on('sip:control', (_event, value) => callback(value))
});