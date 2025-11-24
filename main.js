// const { app, BrowserWindow, ipcMain, session } = require('electron');
// const path = require('path');
// const Store = require('electron-store');

// // --- 🛑 КРИТИЧЕСКИ ВАЖНЫЕ СЕТЕВЫЕ НАСТРОЙКИ (для обхода DNS и SSL) ---

// // 1. Принудительно направляем домен на рабочий IP (обход DNS).
// // Это заставляет Electron идти на 89.169.164.26, когда он видит f2.ads365.ru.
// // В main.js, в начале:
// // Мы привязываем ваш SIP-идентификатор к рабочему IP.
// app.commandLine.appendSwitch('host-resolver-rules', 'MAP f2.ads365.ru 89.169.164.26'); 

// // Строки ignore-certificate-errors и disable-webrtc-encryption оставляем без изменений.

// // 2. Игнорирование ошибок сертификатов (для WSS).
// app.commandLine.appendSwitch('ignore-certificate-errors');

// // 3. Отключение шифрования WebRTC (для звонков).
// app.commandLine.appendSwitch('disable-webrtc-encryption');

// const store = new Store();
// let mainWindow;
// let callPopup;

// function createMainWindow() {
//     mainWindow = new BrowserWindow({
//         width: 1280,
//         height: 800,
//         webPreferences: {
//             preload: path.join(__dirname, 'preload.js'),
//             contextIsolation: true,
//             nodeIntegration: false
//         }
//     });

//     // Автоматически разрешаем доступ к микрофону при запросе
//     mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
//         if (permission === 'media') return callback(true);
//         callback(false);
//     });

//     mainWindow.loadFile('src/index.html');
// }

// function createCallPopup() {
//     callPopup = new BrowserWindow({
//         width: 400,
//         height: 280,
//         show: false,
//         frame: false,
//         alwaysOnTop: true,
//         resizable: false,
//         webPreferences: {
//             preload: path.join(__dirname, 'preload.js'),
//             contextIsolation: true,
//             nodeIntegration: false
//         }
//     });
//     callPopup.loadFile('src/popup.html');
// }

// app.whenReady().then(() => {
//     createMainWindow();
//     createCallPopup();

//     app.on('activate', () => {
//         if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
//     });
// });

// app.on('window-all-closed', () => {
//     if (process.platform !== 'darwin') app.quit();
// });

// // --- IPC Communication (Обработка сообщений между процессами) ---

// ipcMain.handle('get-sip-config', () => {
//     // Дефолтный порт здесь можно изменить на 7443, чтобы пользователю не приходилось его вводить
//     return store.get('sip_config', { sip_server: '', username: '', password: '', port: 7443 });
// });

// ipcMain.handle('save-sip-config', (event, config) => {
//     store.set('sip_config', config);
//     return true;
// });

// ipcMain.on('sip:incoming-call', (event, callData) => {
//     if (callPopup) {
//         callPopup.webContents.send('popup:show', callData);
//         callPopup.show();
//     }
// });

// ipcMain.on('popup:action', (event, actionData) => {
//     if (mainWindow) {
//         mainWindow.webContents.send('sip:control', actionData);
//         if (mainWindow.isMinimized()) mainWindow.restore();
//         mainWindow.focus();
//     }
//     if (callPopup) callPopup.hide();
// });

//v2

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Инициализация хранилища
const store = new Store();

// Храним ссылки на окна глобально, чтобы обращаться к ним из IPC
let mainWindow = null;
let popupWindow = null;

// --- ВАШИ СЕТЕВЫЕ ХАКИ ---
// Подмена DNS (Host Mapping)
app.commandLine.appendSwitch('host-resolver-rules', 'MAP f2.ads365.ru 89.169.164.26');
// Игнорирование ошибок SSL (для самоподписанных сертификатов)
app.commandLine.appendSwitch('ignore-certificate-errors');
// Опционально: отключение шифрования WebRTC (если нужно для сниффинга, иначе можно убрать)
// app.commandLine.appendSwitch('disable-webrtc-encryption');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 700,
        webPreferences: {
            nodeIntegration: false,     // Безопасность
            contextIsolation: true,     // Безопасность
            preload: path.join(__dirname, 'preload.js'),
            devTools: true
        }
    });

    mainWindow.loadFile('src/index.html');

    // Открываем DevTools (можно закомментировать для продакшена)
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
        // Если закрыли главное окно, закрываем и попап
        if (popupWindow) popupWindow.close();
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- IPC ОБРАБОТЧИКИ (СВЯЗЬ МЕЖДУ ОКНАМИ) ---

// 1. Сохранение конфига (ваша старая функция)
ipcMain.handle('save-sip-config', (event, config) => {
    store.set('sip_config', config);
    return true;
});

// 2. Команда от index.html: "Открыть окно входящего звонка"
ipcMain.on('show-incoming-call', (event, callerInfo) => {
    if (popupWindow) {
        // Если окно уже есть, просто обновим инфу и фокус
        popupWindow.focus();
        popupWindow.webContents.send('set-caller-info', callerInfo);
        return;
    }

    popupWindow = new BrowserWindow({
        width: 350,
        height: 250,
        resizable: false,
        alwaysOnTop: true, // Окно всегда сверху
        parent: mainWindow, // Привязка к главному окну
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'src/preload.js')
        }
    });

    popupWindow.loadFile('src/popup.html');
    popupWindow.setMenu(null); // Убираем меню у попапа

    // Когда окно загрузилось, передаем имя звонящего
    popupWindow.webContents.on('did-finish-load', () => {
        popupWindow.webContents.send('set-caller-info', callerInfo);
    });

    popupWindow.on('closed', () => {
        popupWindow = null;
    });
});

// 3. Команда от popup.html: "Пользователь нажал ПРИНЯТЬ"
ipcMain.on('accept-call-action', () => {
    if (mainWindow) {
        // Пересылаем сигнал в главное окно, где живет SIP.js и Audio
        mainWindow.webContents.send('trigger-answer-call');
    }
    if (popupWindow) popupWindow.close();
});

// 4. Команда от popup.html: "Пользователь нажал ОТКЛОНИТЬ"
ipcMain.on('reject-call-action', () => {
    if (mainWindow) {
        mainWindow.webContents.send('trigger-reject-call');
    }
    if (popupWindow) popupWindow.close();
});

// 5. Команда от index.html: "Закрыть попап принудительно" (если отменили или ответили с другого устройства)
ipcMain.on('close-popup', () => {
    if (popupWindow) popupWindow.close();
});