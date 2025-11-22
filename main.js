const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const Store = require('electron-store');

// --- 🛑 КРИТИЧЕСКИ ВАЖНЫЕ СЕТЕВЫЕ НАСТРОЙКИ (для обхода DNS и SSL) ---

// 1. Принудительно направляем домен на рабочий IP (обход DNS).
// Это заставляет Electron идти на 89.169.164.26, когда он видит f2.ads365.ru.
// В main.js, в начале:
// Мы привязываем ваш SIP-идентификатор к рабочему IP.
app.commandLine.appendSwitch('host-resolver-rules', 'MAP f2.ads365.ru 89.169.164.26'); 

// Строки ignore-certificate-errors и disable-webrtc-encryption оставляем без изменений.

// 2. Игнорирование ошибок сертификатов (для WSS).
app.commandLine.appendSwitch('ignore-certificate-errors');

// 3. Отключение шифрования WebRTC (для звонков).
app.commandLine.appendSwitch('disable-webrtc-encryption');

const store = new Store();
let mainWindow;
let callPopup;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Автоматически разрешаем доступ к микрофону при запросе
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') return callback(true);
        callback(false);
    });

    mainWindow.loadFile('src/index.html');
}

function createCallPopup() {
    callPopup = new BrowserWindow({
        width: 400,
        height: 280,
        show: false,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    callPopup.loadFile('src/popup.html');
}

app.whenReady().then(() => {
    createMainWindow();
    createCallPopup();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- IPC Communication (Обработка сообщений между процессами) ---

ipcMain.handle('get-sip-config', () => {
    // Дефолтный порт здесь можно изменить на 7443, чтобы пользователю не приходилось его вводить
    return store.get('sip_config', { sip_server: '', username: '', password: '', port: 7443 });
});

ipcMain.handle('save-sip-config', (event, config) => {
    store.set('sip_config', config);
    return true;
});

ipcMain.on('sip:incoming-call', (event, callData) => {
    if (callPopup) {
        callPopup.webContents.send('popup:show', callData);
        callPopup.show();
    }
});

ipcMain.on('popup:action', (event, actionData) => {
    if (mainWindow) {
        mainWindow.webContents.send('sip:control', actionData);
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
    if (callPopup) callPopup.hide();
});