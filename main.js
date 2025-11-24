const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store({ name: 'sip-config' });
let mainWindow = null;
let popupWindow = null;

app.commandLine.appendSwitch('host-resolver-rules', 'MAP f2.ads365.ru 89.169.164.26');
app.commandLine.appendSwitch('ignore-certificate-errors');

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.webContents.session.setPermissionRequestHandler((_, permission, callback) => {
    if (permission === 'media') return callback(true);
    return callback(false);
  });

  mainWindow.loadFile('src/index.html');
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (popupWindow) popupWindow.close();
  });
}

app.whenReady().then(() => {
  createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-sip-config', () => {
  return store.get('sip_config', {
    sip_server: 'f2.ads365.ru',
    port: '7443',
    username: '',
    password: ''
  });
});

ipcMain.handle('save-sip-config', (_, config) => {
  store.set('sip_config', config);
  return true;
});

ipcMain.on('show-incoming-call', (_, callerInfo) => {
  if (popupWindow) {
    popupWindow.focus();
    popupWindow.webContents.send('set-caller-info', callerInfo);
    return;
  }

  popupWindow = new BrowserWindow({
    width: 360,
    height: 260,
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    parent: mainWindow,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  popupWindow.loadFile('src/popup.html');
  popupWindow.setMenu(null);

  popupWindow.webContents.on('did-finish-load', () => {
    popupWindow.webContents.send('set-caller-info', callerInfo);
  });

  popupWindow.on('closed', () => {
    popupWindow = null;
  });
});

ipcMain.on('accept-call-action', () => {
  mainWindow?.webContents.send('trigger-answer-call');
  popupWindow?.close();
});

ipcMain.on('reject-call-action', () => {
  mainWindow?.webContents.send('trigger-reject-call');
  popupWindow?.close();
});

ipcMain.on('close-popup', () => popupWindow?.close());