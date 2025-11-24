// import * as SIP from 'sip.js';

// export class SIPManager {
//     constructor() {
//         this.ua = null;
//         this.registerer = null;
//         this.session = null;
//         this.callbacks = {};
//     }

//     setCallbacks(callbacks) {
//         this.callbacks = callbacks;
//     }

//     async connect(config) {
//         console.log("Подключение к SIP:", config.sip_server);

       
//         const uri = SIP.UserAgent.makeURI(`sip:${config.username}@${config.sip_server}:${config.port}`); 
//         console.log(uri)
//         const transportOptions = {
//             // server: `wss://${config.sip_server}:${config.port}`,
//             server: `wss://f2.ads365.ru:7443`,
//             connectionTimeout: 10000
//         };

//         const sessionDescriptionHandlerFactory = (session, options) => {
//             const logger = session.userAgent.getLogger("sip.SessionDescriptionHandler");
//             const mediaStreamFactory = SIP.Web.defaultMediaStreamFactory();
            
//             const sessionDescriptionHandlerConfiguration = {
//                 peerConnectionConfiguration: {
//                     iceServers: [], // Отключаем Google STUN
//                     iceTransportPolicy: 'relay'
//                 }
//             };
            
//             return new SIP.Web.SessionDescriptionHandler(
//                 logger,
//                 mediaStreamFactory,
//                 sessionDescriptionHandlerConfiguration
//             );
//         };

//         // this.ua = new SIP.UserAgent({
//         //     uri: uri,
//         //     transportOptions: transportOptions,
//         //     authorizationUsername: `${config.username}@${config.sip_server}`,
//         //     authorizationPassword: config.password,
//         //     logLevel: "error",

//         //     // 💡 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Добавляем realm (домен) для аутентификации
//         //     realm: config.sip_server, 
            
//         //     sessionDescriptionHandlerFactory: sessionDescriptionHandlerFactory,
//         // this.ua = new SIP.UserAgent({
//         //     uri: uri, // "sip:505"
//         //     transportOptions: transportOptions,
            
//         //     // 💡 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Используем полный URI для авторизации
//         //     authorizationUsername: config.username,
//         //     authorizationPassword: config.password, 
//         //     logLevel: "error",
//         //     realm: config.sip_server, 
//         this.ua = new SIP.UserAgent({
//             uri: uri, // uri = sip:505
//             transportOptions: transportOptions,
            
//             // 💡 КРИТИЧНО: Используем полный URI для аутентификации
//             authorizationUsername: `${config.username}`, // 505@ooo-tehnologija-i-servis.megapbx.ru
            
//             authorizationPassword: config.password,
//             logLevel: "error",
            
//             // 💡 КРИТИЧНО: Указываем новый SIP Identity как realm
//             realm: config.sip_server, // ooo-tehnologija-i-servis.megapbx.ru
            
//             // ... остальной код
//             sessionDescriptionHandlerFactory: sessionDescriptionHandlerFactory,
        
            
            
            

//             delegate: {
//                 onConnect: () => {
//                     console.log("SIP Transport Connected");
//                 },
//                 onDisconnect: (error) => {
//                     console.log("SIP Disconnected", error);
//                     this.callbacks.onDisconnect?.();
//                 },
//                 onInvite: (invitation) => {
//                     console.log("Входящий звонок");
//                     this.session = invitation;
//                     const name = invitation.remoteIdentity.displayName || 'Неизвестный';
//                     const number = invitation.remoteIdentity.uri.user;
//                     this.callbacks.onIncoming?.({ number, displayName: name });
//                 }
                
//             }
//         });

//         try {
//             await this.ua.start();
            
//             this.registerer = new SIP.Registerer(this.ua);
            
//             this.registerer.stateChange.addListener((newState) => {
//                 if (newState === SIP.RegistererState.Registered) {
//                     console.log("SIP Registered (Готов к звонкам)");
//                     this.callbacks.onConnect?.(); 
//                 }
//             });

//             await this.registerer.register();

//         } catch (error) {
//             console.error("Ошибка старта SIP:", error);
//         }
//     }

//     async makeCall(number) {
//         if (!this.ua) return console.error("SIP не подключен");
        
//         // Звонок всегда идет на адрес SIP сервера
//         const target = SIP.UserAgent.makeURI(`sip:${number}@${this.ua.configuration.realm}`); 
//         if (!target) return alert("Некорректный номер");

//         this.session = new SIP.Inviter(this.ua, target);
        
//         const inviteOptions = {
//             sessionDescriptionHandlerOptions: {
//                 constraints: { audio: true, video: false },
//                 peerConnectionConfiguration: {
//                     iceServers: []
//                 }
//             }
//         };
// const options = {
//     sessionDescriptionHandlerOptions: {
//         // 💡 КРИТИЧЕСКИ ВАЖНО: Запрашиваем аудио
//         constraints: { 
//             audio: true, // Захватывает микрофон
//             video: false 
//         },
//         peerConnectionConfiguration: { 
//             iceServers: [] // Используется для обхода NAT/фаерволов, сейчас пустой
//         }
//     }
// };
//         await this.session.invite(inviteOptions);
//     }


//     answerCall() {
//         if (!this.session) {
//             console.error("Нет активной сессии для ответа.");
//             return;
//         }

//         // 💡 КРИТИЧЕСКАЯ ПРОВЕРКА: Разрешаем прием только в состоянии "Initial"
//         if (this.session.state !== SIP.SessionState.Initial) {
//             console.warn(`Невозможно ответить. Сессия в состоянии: ${this.session.state}`);
//             // Можно добавить тут this.session = null; чтобы очистить сессию
//             return;
//         }
        
//         // Стандартные опции ответа
//         const answerOptions = {
//             sessionDescriptionHandlerOptions: {
//                 constraints: { audio: true, video: false },
//                 peerConnectionConfiguration: {
//                     iceServers: []
//                 }
//             }
//         };
        
//         const options = {
//     sessionDescriptionHandlerOptions: {
//         // 💡 КРИТИЧЕСКИ ВАЖНО: Запрашиваем аудио
//         constraints: { 
//             audio: true, // Захватывает микрофон
//             video: false 
//         },
//         peerConnectionConfiguration: { 
//             iceServers: [] // Используется для обхода NAT/фаерволов, сейчас пустой
//         }
//     }
// };
//         // Принимаем звонок, только если состояние ОК
//         this.session.accept(answerOptions);
//     }

//     hangUp() {
//         if (!this.session) return;
        
//         switch(this.session.state) {
//             case SIP.SessionState.Initial:
//             case SIP.SessionState.Establishing:
//                 if (this.session instanceof SIP.Inviter) this.session.cancel();
//                 else this.session.reject();
//                 break;
//             case SIP.SessionState.Established:
//                 this.session.bye();
//                 break;
//         }
//         this.session = null;
//     }
// }

import * as SIP from 'sip.js';

export class SIPManager {
    constructor() {
        this.ua = null;
        this.registerer = null;
        this.session = null;
        this.callbacks = {};
    }

    setCallbacks(callbacks) {
        this.callbacks = callbacks;
    }

    // --- Блок подключения и регистрации (Не изменен) ---
    async connect(config) {
        console.log("Подключение к SIP:", config.sip_server);

        
        const uri = SIP.UserAgent.makeURI(`sip:${config.username}@${config.sip_server}:${config.port}`); 
        console.log(uri)
        const transportOptions = {
            // server: `wss://${config.sip_server}:${config.port}`,
            server: `wss://f2.ads365.ru:7443`,
            connectionTimeout: 10000
        };

        const sessionDescriptionHandlerFactory = (session, options) => {
            const logger = session.userAgent.getLogger("sip.SessionDescriptionHandler");
            const mediaStreamFactory = SIP.Web.defaultMediaStreamFactory();
            
            const sessionDescriptionHandlerConfiguration = {
                peerConnectionConfiguration: {
                    iceServers: [], // Отключаем Google STUN
                    iceTransportPolicy: 'relay'
                }
            };
            
            return new SIP.Web.SessionDescriptionHandler(
                logger,
                mediaStreamFactory,
                sessionDescriptionHandlerConfiguration
            );
        };

        this.ua = new SIP.UserAgent({
            uri: uri, // uri = sip:505
            transportOptions: transportOptions,
            
            // 💡 КРИТИЧНО: Используем полный URI для аутентификации
            authorizationUsername: `${config.username}`, 
            
            authorizationPassword: config.password,
            logLevel: "error",
            
            // 💡 КРИТИЧНО: Указываем новый SIP Identity как realm
            realm: config.sip_server, 
            
            sessionDescriptionHandlerFactory: sessionDescriptionHandlerFactory,
        
            
            
            delegate: {
                onConnect: () => {
                    console.log("SIP Transport Connected");
                },
                onDisconnect: (error) => {
                    console.log("SIP Disconnected", error);
                    this.callbacks.onDisconnect?.();
                },
                onInvite: (invitation) => {
                    console.log("Входящий звонок");
                    this.session = invitation;
                    const name = invitation.remoteIdentity.displayName || 'Неизвестный';
                    const number = invitation.remoteIdentity.uri.user;
                    this.callbacks.onIncoming?.({ number, displayName: name });
                    
                    // 💡 ДОБАВЛЕНО: Устанавливаем слушатели состояния для аудио
                    this.setupSessionListeners();
                }
                
            }
        });

        try {
            await this.ua.start();
            
            this.registerer = new SIP.Registerer(this.ua);
            
            this.registerer.stateChange.addListener((newState) => {
                if (newState === SIP.RegistererState.Registered) {
                    console.log("SIP Registered (Готов к звонкам)");
                    this.callbacks.onConnect?.(); 
                }
            });

            await this.registerer.register();

        } catch (error) {
            console.error("Ошибка старта SIP:", error);
        }
    }

    // --- Функционал WebRTC и управления звонком (ДОБАВЛЕНО) ---

    async makeCall(number) {
        if (!this.ua) return console.error("SIP не подключен");
        
        const target = SIP.UserAgent.makeURI(`sip:${number}@${this.ua.configuration.realm}`); 
        if (!target) return alert("Некорректный номер");

        this.session = new SIP.Inviter(this.ua, target);
        this.setupSessionListeners(); // Устанавливаем слушатели перед INVITE
        
        const inviteOptions = {
            sessionDescriptionHandlerOptions: {
                // 💡 ГЛАВНОЕ: Запрашиваем аудио для отправки
                constraints: { audio: true, video: false }, 
                peerConnectionConfiguration: {
                    iceServers: []
                }
            }
        };
        
        await this.session.invite(inviteOptions);
    }


    answerCall() {
        if (!this.session) {
            console.error("Нет активной сессии для ответа.");
            return;
        }

        if (this.session.state !== SIP.SessionState.Initial) {
            console.warn(`Невозможно ответить. Сессия в состоянии: ${this.session.state}`);
            return;
        }
        
        const answerOptions = {
            sessionDescriptionHandlerOptions: {
                // 💡 ГЛАВНОЕ: Запрашиваем аудио для отправки
                constraints: { audio: true, video: false },
                peerConnectionConfiguration: {
                    iceServers: []
                }
            }
        };
        
        this.session.accept(answerOptions);
        this.setupSessionListeners(); // Устанавливаем слушатели для сессии, которую мы приняли
    }

    async toggleHold() {
        if (!this.session || this.session.state !== SIP.SessionState.Established) return false;

        const isHolding = this.session.localHold;

        try {
            await this.session.invite({
                sessionDescriptionHandlerOptions: { 
                    hold: !isHolding // true для удержания, false для снятия
                }
            });
            return !isHolding; // Возвращаем новый статус
        } catch (e) {
            console.error("Ошибка Hold:", e);
            return isHolding;
        }
    }

    hangUp() {
        if (!this.session) return;
        
        const state = this.session.state;
        
        switch(state) {
            case SIP.SessionState.Initial:
            case SIP.SessionState.Establishing:
                if (this.session instanceof SIP.Inviter) this.session.cancel();
                else this.session.reject();
                break;
            case SIP.SessionState.Established:
                this.session.bye();
                break;
        }
        this.callbacks.onCallEnded?.(); // Вызов колбэка для сброса UI
        this.session = null;
    }

    // --- Логика WebRTC (Прием аудио и управление состоянием) ---
    
    setupSessionListeners() {
        if (!this.session) return;

        // Отслеживаем изменения состояния сессии
        this.session.stateChange.addListener((newState) => {
            console.log("Session state:", newState);
            
            if (newState === SIP.SessionState.Established) {
                this.setupRemoteMedia(); // Начинаем воспроизведение звука
                this.callbacks.onCallEstablished?.();
            }
            if (newState === SIP.SessionState.Terminated) {
                // Звонок окончен
                this.callbacks.onCallEnded?.();
                this.session = null;
            }
        });
        
        // Если звонящий сам повесил трубку (событие BYE)
    }

// src/js/sip-manager.js

// ... (остальной код SIPManager)

// --- Логика WebRTC: Привязка аудио ---
setupRemoteMedia() {
    if (!this.session || !this.session.sessionDescriptionHandler) {
        console.error("Нет активной сессии или sessionDescriptionHandler.");
        return;
    }

    const remoteAudio = document.getElementById('remote-audio');
    
    if (!remoteAudio) {
        // Эта ошибка возникала, если вы пытались запустить этот код в закрытом Popup!
        // Теперь, когда логика выполняется только в index.html, эта ошибка должна исчезнуть.
        console.error("Элемент #remote-audio не найден! Невозможно воспроизвести звук.");
        return;
    }

    // 1. Получаем удаленный медиа-поток (remoteStream)
    const remoteStream = new MediaStream();

    // 2. Получаем треки из обработчика сессии
    // sessionDescriptionHandler.remoteMediaStream - устарел, используем receiver
    
    // Получаем все аудио-трансиверы (приемники)
    const receivers = this.session.sessionDescriptionHandler.peerConnection.getReceivers();
    
    receivers.forEach(receiver => {
        // Нас интересуют только аудио-треки
        if (receiver.track && receiver.track.kind === 'audio') {
            remoteStream.addTrack(receiver.track);
        }
    });

    // 3. Привязываем поток к аудио-элементу
    if (remoteStream.getTracks().length > 0) {
        remoteAudio.srcObject = remoteStream;
        console.log("Удаленное аудио успешно привязано.");
        
        // 💡 Важно: Программно запускаем воспроизведение на случай блокировки браузером
        remoteAudio.play().catch(e => {
            console.warn("Ошибка автовоспроизведения (требуется взаимодействие пользователя):", e);
            // В Electron это часто не проблема, но в обычных браузерах требует клика
        });
    } else {
        console.warn("В удаленном потоке не найдено аудио-дорожек.");
    }
}
// ... (остальной код SIPManager)
    
    setVolume(value) {
        const el = document.getElementById('remote-audio');
        // Устанавливаем громкость в пределах 0.0 до 1.0
        if (el) el.volume = parseFloat(value); 
    }
}