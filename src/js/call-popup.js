const numberEl = document.getElementById('callerNumber');
const nameEl = document.getElementById('callerName');

window.api.onPopupShow((data) => {
    numberEl.textContent = data.number || 'Скрыт';
    nameEl.textContent = data.displayName || 'Входящий звонок';
});

document.getElementById('btnAnswer').addEventListener('click', () => {
    window.api.sendPopupAction({ action: 'answer' });
});

document.getElementById('btnReject').addEventListener('click', () => {
    window.api.sendPopupAction({ action: 'reject' });
});

document.getElementById('btnAppeal').addEventListener('click', () => {
    const number = numberEl.textContent;
    window.api.sendPopupAction({ action: 'create_appeal', number: number });
});