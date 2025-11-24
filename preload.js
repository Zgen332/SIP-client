// const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('api', {
//     getSipConfig: () => ipcRenderer.invoke('get-sip-config'),
//     saveSipConfig: (config) => ipcRenderer.invoke('save-sip-config', config),
    
//     onIncomingCall: (callback) => ipcRenderer.on('sip:incoming-call', callback),
//     sendIncomingCallTrigger: (data) => ipcRenderer.send('sip:incoming-call', data),
    
//     onPopupShow: (callback) => ipcRenderer.on('popup:show', (_event, value) => callback(value)),
//     sendPopupAction: (action) => ipcRenderer.send('popup:action', action),
//     onSipControl: (callback) => ipcRenderer.on('sip:control', (_event, value) => callback(value))
// });

//v2

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // --- Методы для Главного окна (index.html) ---
    saveSipConfig: (config) => ipcRenderer.invoke('save-sip-config', config),
    
    // Показать/Скрыть попап
    showIncomingCall: (info) => ipcRenderer.send('show-incoming-call', info),
    closePopup: () => ipcRenderer.send('close-popup', {}),
    
    // Слушать команды от попапа
    onTriggerAnswer: (callback) => ipcRenderer.on('trigger-answer-call', callback),
    onTriggerReject: (callback) => ipcRenderer.on('trigger-reject-call', callback),


    // --- Методы для Попапа (popup.html) ---
    
    // Отправить действия пользователя
    acceptCallAction: () => ipcRenderer.send('accept-call-action', {}),
    rejectCallAction: () => ipcRenderer.send('reject-call-action', {}),
    
    // Получить инфу о звонящем
    onSetCallerInfo: (callback) => ipcRenderer.on('set-caller-info', (_event, value) => callback(value))
});