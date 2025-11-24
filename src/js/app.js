// import { SIPManager } from './sip-manager.js';
// import { APIClient } from './api-client.js';
// import { AppealsModule } from './appeals.js';
// import { CallsModule } from './calls.js';

// const sipManager = new SIPManager();
// const apiClient = new APIClient('https://api.example.com');
// const appealsModule = new AppealsModule(apiClient);
// const callsModule = new CallsModule(apiClient);
// const statusEl = document.getElementById('sipStatus');

// async function init() {
//     // 1. Получаем настройки
//     const config = await window.api.getSipConfig();
//     setupSettings(config);

//     // 2. Инициализируем модули
//     appealsModule.init();
//     callsModule.init();

//     // 3. Настраиваем SIP колбэки
//     sipManager.setCallbacks({
//         onConnect: () => {
//             statusEl.textContent = "ONLINE";
//             statusEl.classList.add('online');
//         },
//         onDisconnect: () => {
//             statusEl.textContent = "OFFLINE";
//             statusEl.classList.remove('online');
//         },
//         onIncoming: (data) => {
//             window.api.sendIncomingCallTrigger(data);
//         }
//     });

//     // 4. Подключаемся, если есть настройки
//     if(config.sip_server && config.username) {
//         try {
//             console.log(config)
//             await sipManager.connect(config);
//         } catch (e) {
//             console.error("Ошибка SIP:", e);
//         }
//     }
// }

// // Форма настроек
// function setupSettings(config) {
//     const form = document.getElementById('sipSettingsForm');
//     document.getElementById('sipServer').value = config.sip_server || '';
//     document.getElementById('sipUser').value = config.username || '';
//     document.getElementById('sipPort').value = config.port || '';
    
//     form.addEventListener('submit', async (e) => {
//         e.preventDefault();
//         await window.api.saveSipConfig({
//             sip_server: document.getElementById('sipServer').value,
//             username: document.getElementById('sipUser').value,
//             password: document.getElementById('sipPass').value || config.password,
//             port: parseInt(document.getElementById('sipPort').value)
//         });
//         window.location.reload();
//     });
// }

// // Кнопки звонилки
// document.getElementById('btnCall')?.addEventListener('click', () => {
//     const num = document.getElementById('phoneNumber').value;
//     if(num) sipManager.makeCall(num);
// });

// document.getElementById('btnHangup')?.addEventListener('click', () => {
//     sipManager.hangUp();
// });

// // Обработка событий из всплывающего окна
// window.api.onSipControl((data) => {
//     if (data.action === 'answer') sipManager.answerCall();
//     if (data.action === 'reject') sipManager.hangUp();
//     if (data.action === 'create_appeal') {
//         window.router('appeals');
//         sipManager.answerCall();
//         appealsModule.prefillForm(data.number);
//     }
// });

// // Роутер страниц
// window.router = (id) => {
//     document.querySelectorAll('main section').forEach(s => s.style.display = 'none');
//     document.getElementById(id).style.display = 'block';
// };

// init();

//v2

import { SIPManager } from './sip-manager.js';

const sipManager = new SIPManager();

// --- Элементы UI ---
const settingsForm = document.getElementById('settings-form');
const statusLight = document.getElementById('status-light');
const statusText = document.getElementById('status-text');

// Панели
const dialerPanel = document.getElementById('dialer-panel');
const callPanel = document.getElementById('call-panel');

// Элементы внутри панели звонка
const callerNameDisplay = document.getElementById('caller-name');
const callerNumberDisplay = document.getElementById('caller-number'); // Здесь будем писать статус
const callTimerDisplay = document.getElementById('call-timer');

// Кнопки
const btnCall = document.getElementById('btn-call');
const btnHangup = document.getElementById('btn-hangup');
const btnHold = document.getElementById('btn-hold');
const btnAnswerMain = document.getElementById('btn-answer'); // Кнопка ответа в главном окне (на всякий случай)
const volumeSlider = document.getElementById('volume-slider');

// Таймер
let timerInterval;
let callSeconds = 0;


// --- 1. Настройка SIP Callback'ов ---
sipManager.setCallbacks({
    onConnect: () => {
        statusLight.className = 'status-online';
        statusText.textContent = 'Online';
    },
    onDisconnect: () => {
        statusLight.className = 'status-offline';
        statusText.textContent = 'Offline';
    },
    
    // Входящий звонок
    onIncoming: (info) => {
        // 1. Показываем Popup (через main.js)
        window.electronAPI.showIncomingCall(info);

        // 2. Меняем интерфейс в главном окне (чтобы было видно, что идет звонок)
        showCallInterface(info.displayName, "Входящий звонок...", true); 
        // true = входящий (показываем кнопку ответа в главном окне на случай если popup не сработал)
    },

    // Соединение установлено (мы ответили или нам ответили)
    onCallEstablished: () => {
        // 1. Закрываем Popup
        window.electronAPI.closePopup();

        // 2. Обновляем UI
        updateCallStatus("Разговор идет");
        
        // 3. Запускаем таймер
        startTimer();

        // 4. Активируем кнопку удержания
        btnHold.disabled = false;
        
        // 5. Скрываем кнопку ответа в главном окне (если была)
        if(btnAnswerMain) btnAnswerMain.classList.add('hidden');
    },

    // Звонок завершен
    onCallEnded: () => {
        window.electronAPI.closePopup();
        stopTimer();
        hideCallInterface();
    }
});


// --- 2. Обработка команд от POPUP (через main.js) ---

// Popup сказал "Принять" -> Мы (Main Window) выполняем answerCall -> Звук работает!
window.electronAPI.onTriggerAnswer(() => {
    console.log("Получена команда от Popup: ПРИНЯТЬ");
    sipManager.answerCall();
});

// Popup сказал "Отклонить"
window.electronAPI.onTriggerReject(() => {
    console.log("Получена команда от Popup: ОТКЛОНИТЬ");
    sipManager.hangUp();
});


// --- 3. Обработчики кнопок UI ---

// Сохранение настроек
settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const config = {
        sip_server: document.getElementById('sip-server').value,
        port: document.getElementById('port').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
    };
    
    if (window.electronAPI) {
        await window.electronAPI.saveSipConfig(config);
    }
    sipManager.connect(config);
});

// Исходящий звонок
btnCall.addEventListener('click', () => {
    const number = document.getElementById('phone-number').value;
    if (number) {
        // Сразу показываем интерфейс
        showCallInterface(number, "Вызов абонента...", false); // false = исходящий
        
        // Инициируем звонок
        sipManager.makeCall(number);
    }
});

// Завершить (красная кнопка)
btnHangup.addEventListener('click', () => {
    sipManager.hangUp();
});

// Принять (если нажали в главном окне)
if (btnAnswerMain) {
    btnAnswerMain.addEventListener('click', () => {
        sipManager.answerCall();
    });
}

// Удержание
btnHold.addEventListener('click', async () => {
    const isHeld = await sipManager.toggleHold();
    if (isHeld) {
        btnHold.classList.add('active-hold');
        btnHold.innerText = "▶️ Продолжить";
        updateCallStatus("На удержании");
    } else {
        btnHold.classList.remove('active-hold');
        btnHold.innerText = "II Удержать";
        updateCallStatus("Разговор идет");
    }
});

// Громкость
volumeSlider.addEventListener('input', (e) => {
    sipManager.setVolume(e.target.value);
});


// --- 4. Вспомогательные функции UI ---

function showCallInterface(name, statusText, isIncoming) {
    dialerPanel.classList.add('hidden');
    callPanel.classList.remove('hidden');
    
    callerNameDisplay.textContent = name;
    callerNumberDisplay.textContent = statusText; // Пишем статус ("Вызов...", "Входящий...")
    
    // Если входящий - показываем кнопку ответа, если исходящий - скрываем
    if (btnAnswerMain) {
        if (isIncoming) btnAnswerMain.classList.remove('hidden');
        else btnAnswerMain.classList.add('hidden');
    }
    
    btnHold.disabled = true; // Удержание недоступно пока не соединились
}

function updateCallStatus(text) {
    callerNumberDisplay.textContent = text;
}

function hideCallInterface() {
    callPanel.classList.add('hidden');
    dialerPanel.classList.remove('hidden');
    
    // Сброс текстов и кнопок
    callerNameDisplay.textContent = "Неизвестный";
    callerNumberDisplay.textContent = "";
    btnHold.classList.remove('active-hold');
    btnHold.innerText = "II Удержать";
}

function startTimer() {
    callSeconds = 0;
    callTimerDisplay.textContent = "00:00";
    
    // Очищаем старый на всякий случай
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        callSeconds++;
        const m = Math.floor(callSeconds / 60).toString().padStart(2, '0');
        const s = (callSeconds % 60).toString().padStart(2, '0');
        callTimerDisplay.textContent = `${m}:${s}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    callTimerDisplay.textContent = "00:00";
}