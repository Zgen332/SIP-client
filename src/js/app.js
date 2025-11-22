import { SIPManager } from './sip-manager.js';
import { APIClient } from './api-client.js';
import { AppealsModule } from './appeals.js';
import { CallsModule } from './calls.js';

const sipManager = new SIPManager();
const apiClient = new APIClient('https://api.example.com');
const appealsModule = new AppealsModule(apiClient);
const callsModule = new CallsModule(apiClient);
const statusEl = document.getElementById('sipStatus');

async function init() {
    // 1. Получаем настройки
    const config = await window.api.getSipConfig();
    setupSettings(config);

    // 2. Инициализируем модули
    appealsModule.init();
    callsModule.init();

    // 3. Настраиваем SIP колбэки
    sipManager.setCallbacks({
        onConnect: () => {
            statusEl.textContent = "ONLINE";
            statusEl.classList.add('online');
        },
        onDisconnect: () => {
            statusEl.textContent = "OFFLINE";
            statusEl.classList.remove('online');
        },
        onIncoming: (data) => {
            window.api.sendIncomingCallTrigger(data);
        }
    });

    // 4. Подключаемся, если есть настройки
    if(config.sip_server && config.username) {
        try {
            console.log(config)
            await sipManager.connect(config);
        } catch (e) {
            console.error("Ошибка SIP:", e);
        }
    }
}

// Форма настроек
function setupSettings(config) {
    const form = document.getElementById('sipSettingsForm');
    document.getElementById('sipServer').value = config.sip_server || '';
    document.getElementById('sipUser').value = config.username || '';
    document.getElementById('sipPort').value = config.port || '';
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await window.api.saveSipConfig({
            sip_server: document.getElementById('sipServer').value,
            username: document.getElementById('sipUser').value,
            password: document.getElementById('sipPass').value || config.password,
            port: parseInt(document.getElementById('sipPort').value)
        });
        window.location.reload();
    });
}

// Кнопки звонилки
document.getElementById('btnCall')?.addEventListener('click', () => {
    const num = document.getElementById('phoneNumber').value;
    if(num) sipManager.makeCall(num);
});

document.getElementById('btnHangup')?.addEventListener('click', () => {
    sipManager.hangUp();
});

// Обработка событий из всплывающего окна
window.api.onSipControl((data) => {
    if (data.action === 'answer') sipManager.answerCall();
    if (data.action === 'reject') sipManager.hangUp();
    if (data.action === 'create_appeal') {
        window.router('appeals');
        sipManager.answerCall();
        appealsModule.prefillForm(data.number);
    }
});

// Роутер страниц
window.router = (id) => {
    document.querySelectorAll('main section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
};

init();