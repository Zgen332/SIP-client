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

        // this.ua = new SIP.UserAgent({
        //     uri: uri,
        //     transportOptions: transportOptions,
        //     authorizationUsername: `${config.username}@${config.sip_server}`,
        //     authorizationPassword: config.password,
        //     logLevel: "error",

        //     // 💡 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Добавляем realm (домен) для аутентификации
        //     realm: config.sip_server, 
            
        //     sessionDescriptionHandlerFactory: sessionDescriptionHandlerFactory,
        // this.ua = new SIP.UserAgent({
        //     uri: uri, // "sip:505"
        //     transportOptions: transportOptions,
            
        //     // 💡 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Используем полный URI для авторизации
        //     authorizationUsername: config.username,
        //     authorizationPassword: config.password, 
        //     logLevel: "error",
        //     realm: config.sip_server, 
        this.ua = new SIP.UserAgent({
            uri: uri, // uri = sip:505
            transportOptions: transportOptions,
            
            // 💡 КРИТИЧНО: Используем полный URI для аутентификации
            authorizationUsername: `${config.username}`, // 505@ooo-tehnologija-i-servis.megapbx.ru
            
            authorizationPassword: config.password,
            logLevel: "error",
            
            // 💡 КРИТИЧНО: Указываем новый SIP Identity как realm
            realm: config.sip_server, // ooo-tehnologija-i-servis.megapbx.ru
            
            // ... остальной код
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

    async makeCall(number) {
        if (!this.ua) return console.error("SIP не подключен");
        
        // Звонок всегда идет на адрес SIP сервера
        const target = SIP.UserAgent.makeURI(`sip:${number}@${this.ua.configuration.realm}`); 
        if (!target) return alert("Некорректный номер");

        this.session = new SIP.Inviter(this.ua, target);
        
        const inviteOptions = {
            sessionDescriptionHandlerOptions: {
                constraints: { audio: true, video: false },
                peerConnectionConfiguration: {
                    iceServers: []
                }
            }
        };

        await this.session.invite(inviteOptions);
    }

    // answerCall() {
    //     if (this.session) {
    //         const answerOptions = {
    //             sessionDescriptionHandlerOptions: {
    //                 constraints: { audio: true, video: false },
    //                 peerConnectionConfiguration: {
    //                     iceServers: []
    //                 }
    //             }
    //         };
    //         this.session.accept(answerOptions);
    //     }
    // }
    answerCall() {
        if (!this.session) {
            console.error("Нет активной сессии для ответа.");
            return;
        }

        // 💡 КРИТИЧЕСКАЯ ПРОВЕРКА: Разрешаем прием только в состоянии "Initial"
        if (this.session.state !== SIP.SessionState.Initial) {
            console.warn(`Невозможно ответить. Сессия в состоянии: ${this.session.state}`);
            // Можно добавить тут this.session = null; чтобы очистить сессию
            return;
        }
        
        // Стандартные опции ответа
        const answerOptions = {
            sessionDescriptionHandlerOptions: {
                constraints: { audio: true, video: false },
                peerConnectionConfiguration: {
                    iceServers: []
                }
            }
        };
        
        // Принимаем звонок, только если состояние ОК
        this.session.accept(answerOptions);
    }

    hangUp() {
        if (!this.session) return;
        
        switch(this.session.state) {
            case SIP.SessionState.Initial:
            case SIP.SessionState.Establishing:
                if (this.session instanceof SIP.Inviter) this.session.cancel();
                else this.session.reject();
                break;
            case SIP.SessionState.Established:
                this.session.bye();
                break;
        }
        this.session = null;
    }
}