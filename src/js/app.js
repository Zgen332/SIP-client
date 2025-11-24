import { SIPManager } from './sip-manager.js';

const sipManager = new SIPManager();

const settingsForm = document.getElementById('settings-form');
const statusLight = document.getElementById('status-light');
const statusText = document.getElementById('status-text');
const dialerPanel = document.getElementById('dialer-panel');
const callPanel = document.getElementById('call-panel');
const callerNameDisplay = document.getElementById('caller-name');
const callerNumberDisplay = document.getElementById('caller-number');
const callTimerDisplay = document.getElementById('call-timer');
const btnCall = document.getElementById('btn-call');
const btnHangup = document.getElementById('btn-hangup');
const btnHold = document.getElementById('btn-hold');
const btnAnswerMain = document.getElementById('btn-answer');
const volumeSlider = document.getElementById('volume-slider');
const phoneInput = document.getElementById('phone-number');
const soundToggle = document.getElementById('call-sound-enabled');
const vibrationToggle = document.getElementById('call-vibration-enabled');
const inputDeviceSelect = document.getElementById('input-device');
const outputDeviceSelect = document.getElementById('output-device');

let savedConfig = null;
let timerInterval = null;
let callSeconds = 0;

const storedPrefs = JSON.parse(localStorage.getItem('callPrefs') || '{}');
if (typeof storedPrefs.sound === 'boolean') soundToggle.checked = storedPrefs.sound;
if (typeof storedPrefs.vibration === 'boolean') vibrationToggle.checked = storedPrefs.vibration;

const storedDevicePrefs = getStoredDevicePrefs();
sipManager.setDevicePreferences(storedDevicePrefs);

init();

async function init() {
  savedConfig = await window.electronAPI.getSipConfig();
  hydrateForm(savedConfig);
  await initializeDeviceSelectors();

  sipManager.setCallbacks({
    onConnect: () => setStatus(true),
    onDisconnect: () => setStatus(false),
    onIncoming: (info) => {
      const formatted = formatPhone(info.number || info.displayName);
      const prefs = currentNotificationPrefs();
      window.electronAPI.showIncomingCall({
        ...info,
        formatted,
        preferences: prefs
      });
      showCallInterface(formatted, 'Входящий звонок...', true);
    },
    onCallEstablished: () => {
      window.electronAPI.closePopup();
      updateCallStatus('Разговор идет');
      startTimer();
      btnHold.disabled = false;
      btnAnswerMain?.classList.add('hidden');
    },
    onCallEnded: () => {
      window.electronAPI.closePopup();
      stopTimer();
      hideCallInterface();
    }
  });

  if (savedConfig.username && savedConfig.password) {
    await sipManager.connect(savedConfig);
  }
}

function hydrateForm(config) {
  document.getElementById('sip-server').value = config.sip_server || '';
  document.getElementById('port').value = config.port || '';
  document.getElementById('username').value = config.username || '';
  document.getElementById('password').value = config.password || '';
}

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const config = {
    sip_server: document.getElementById('sip-server').value.trim(),
    port: document.getElementById('port').value.trim(),
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value
  };

  localStorage.setItem(
    'callPrefs',
    JSON.stringify(currentNotificationPrefs())
  );

  await window.electronAPI.saveSipConfig(config);
  await sipManager.connect(config);
});

btnCall.addEventListener('click', () => {
  const number = phoneInput.value.trim();
  if (!number) return;
  const formatted = formatPhone(number);
  showCallInterface(formatted, 'Исходящий вызов...', false);
  sipManager.makeCall(number);
});

btnHangup.addEventListener('click', () => sipManager.hangUp());
btnAnswerMain?.addEventListener('click', () => sipManager.answerCall());

btnHold.addEventListener('click', async () => {
  const isHeld = await sipManager.toggleHold();
  if (isHeld) {
    btnHold.classList.add('active-hold');
    btnHold.textContent = '▶️ Продолжить';
    updateCallStatus('На удержании');
  } else {
    btnHold.classList.remove('active-hold');
    btnHold.textContent = 'II Удержать';
    updateCallStatus('Разговор идет');
  }
});

volumeSlider.addEventListener('input', (e) => sipManager.setVolume(e.target.value));

window.electronAPI.onTriggerAnswer(() => sipManager.answerCall());
window.electronAPI.onTriggerReject(() => sipManager.hangUp());
window.electronAPI.onTriggerCreateAppeal(() => {
  hideCallInterface();
  // TODO: при необходимости откройте модуль обращений и подставьте номер
});

inputDeviceSelect?.addEventListener('change', handleDevicePreferenceChange);
outputDeviceSelect?.addEventListener('change', handleDevicePreferenceChange);

function setStatus(isOnline) {
  statusLight.className = isOnline ? 'status-online' : 'status-offline';
  statusText.textContent = isOnline ? 'Online' : 'Offline';
}

function showCallInterface(name, status, isIncoming) {
  dialerPanel.classList.add('hidden');
  callPanel.classList.remove('hidden');

  callerNameDisplay.textContent = name || 'Неизвестный';
  callerNumberDisplay.textContent = status;
  btnHold.disabled = true;

  if (btnAnswerMain) {
    if (isIncoming) btnAnswerMain.classList.remove('hidden');
    else btnAnswerMain.classList.add('hidden');
  }
}

function hideCallInterface() {
  callPanel.classList.add('hidden');
  dialerPanel.classList.remove('hidden');
  callerNameDisplay.textContent = 'Неизвестный';
  callerNumberDisplay.textContent = '';
  btnHold.classList.remove('active-hold');
  btnHold.textContent = 'II Удержать';
}

function updateCallStatus(text) {
  callerNumberDisplay.textContent = text;
}

function startTimer() {
  callSeconds = 0;
  callTimerDisplay.textContent = '00:00';
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    callSeconds += 1;
    const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const s = String(callSeconds % 60).padStart(2, '0');
    callTimerDisplay.textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  callTimerDisplay.textContent = '00:00';
}

function currentNotificationPrefs() {
  return {
    sound: soundToggle.checked,
    vibration: vibrationToggle.checked
  };
}

function formatPhone(number = '') {
  const digits = number.replace(/\D/g, '').slice(-10);
  if (digits.length < 10) return number;
  return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function getStoredDevicePrefs() {
  try {
    return JSON.parse(localStorage.getItem('devicePrefs')) || {};
  } catch (_) {
    return {};
  }
}

function saveDevicePrefs(prefs) {
  localStorage.setItem('devicePrefs', JSON.stringify(prefs));
}

async function initializeDeviceSelectors() {
  if (!navigator.mediaDevices?.enumerateDevices) return;

  try {
    await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (error) {
    console.warn('Не удалось запросить доступ к микрофону', error);
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioInputs = devices.filter((d) => d.kind === 'audioinput');
  const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

  populateDeviceSelect(
    inputDeviceSelect,
    audioInputs,
    storedDevicePrefs.inputDeviceId,
    'Системный микрофон'
  );

  populateDeviceSelect(
    outputDeviceSelect,
    audioOutputs,
    storedDevicePrefs.outputDeviceId,
    'Системный динамик'
  );
}

function populateDeviceSelect(selectEl, devices, selectedId, defaultLabel) {
  if (!selectEl) return;
  selectEl.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = defaultLabel;
  selectEl.appendChild(defaultOption);

  devices.forEach((device, index) => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || `${defaultLabel} ${index + 1}`;
    selectEl.appendChild(option);
  });

  selectEl.value = selectedId || '';
}

function handleDevicePreferenceChange() {
  const prefs = {
    inputDeviceId: inputDeviceSelect?.value || null,
    outputDeviceId: outputDeviceSelect?.value || null
  };
  saveDevicePrefs(prefs);
  sipManager.setDevicePreferences(prefs);
}