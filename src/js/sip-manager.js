import * as SIP from 'sip.js';

export class SIPManager {
  constructor() {
    this.ua = null;
    this.registerer = null;
    this.session = null;
    this.callbacks = {};
    this.config = null;
    this.devicePrefs = {
      inputDeviceId: null,
      outputDeviceId: null
    };
    this.localHold = false;
  }

  setCallbacks(callbacks) {
    this.callbacks = callbacks;
  }

  async connect(config) {
    await this.stop(true);
    this.config = config;
    const uri = SIP.UserAgent.makeURI(`sip:${config.username}@${config.sip_server}`);
    if (!uri) throw new Error('Неверный SIP URI');

    const userAgentOptions = {
      uri,
      displayName: config.display_name || config.username,
      transportOptions: {
        server: `wss://${config.sip_server}:${config.port}`,
        connectionTimeout: 12000
      },
      authorizationUsername: config.username,
      authorizationPassword: config.password,
      realm: config.sip_server,
      sessionDescriptionHandlerFactory: this.createSessionHandlerFactory(),
      delegate: {
        onConnect: () => this.callbacks.onConnect?.(),
        onDisconnect: (error) => {
          console.warn('SIP disconnected', error);
          this.callbacks.onDisconnect?.();
        },
        onInvite: (invitation) => {
          this.session = invitation;
          this.attachSessionListeners(invitation);
          const number = invitation.remoteIdentity.uri.user;
          const headerName = invitation.request?.getHeader?.('X-Display-Name');
          const decodedHeader = headerName ? decodeURIComponent(headerName) : null;
          const displayName = decodedHeader || invitation.remoteIdentity.displayName || number || 'Неизвестный';
          this.callbacks.onIncoming?.({ number, displayName });
        }
      }
    };

    this.ua = new SIP.UserAgent(userAgentOptions);
    await this.ua.start();

    this.registerer = new SIP.Registerer(this.ua);
    this.registerer.stateChange.addListener((state) => {
      if (state === SIP.RegistererState.Registered) {
        this.callbacks.onConnect?.();
      }
    });
    await this.registerer.register();
  }

  createSessionHandlerFactory() {
    return (session, options) => {
      const logger = session.userAgent.getLogger('sip.SessionDescriptionHandler');
      const mediaStreamFactory = SIP.Web.defaultMediaStreamFactory();
      return new SIP.Web.SessionDescriptionHandler(logger, mediaStreamFactory, {
        peerConnectionConfiguration: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ],
          iceTransportPolicy: 'all'
        }
      });
    };
  }

  setDevicePreferences(prefs = {}) {
    this.devicePrefs = {
      inputDeviceId: prefs.inputDeviceId || null,
      outputDeviceId: prefs.outputDeviceId || null
    };
    this.applyOutputDevicePreference();
  }

  createConstraints() {
    if (this.devicePrefs.inputDeviceId) {
      return {
        audio: {
          deviceId: { exact: this.devicePrefs.inputDeviceId }
        },
        video: false
      };
    }

    return { audio: true, video: false };
  }

  inviteOptions() {
    return {
      sessionDescriptionHandlerOptions: {
        constraints: this.createConstraints()
      }
    };
  }

  getExtraHeaders() {
    const headers = [];
    if (this.config?.display_name) {
      headers.push(`X-Display-Name: ${encodeURIComponent(this.config.display_name)}`);
    }
    return headers;
  }

  async makeCall(number) {
    if (!this.ua) return;
    const target = SIP.UserAgent.makeURI(`sip:${number}@${this.config.sip_server}`);
    if (!target) throw new Error('Некорректный номер');

    const inviteOptions = {
      ...this.inviteOptions(),
      requestOptions: {
        extraHeaders: this.getExtraHeaders()
      }
    };

    this.session = new SIP.Inviter(this.ua, target, inviteOptions);
    this.localHold = false;
    this.attachSessionListeners(this.session);
    await this.session.invite();
  }

  answerCall() {
    if (!this.session || this.session.state !== SIP.SessionState.Initial) return;
    this.localHold = false;
    this.session.accept(this.inviteOptions());
  }

  hangUp() {
    if (!this.session) return;
    const { state } = this.session;

    if (state === SIP.SessionState.Initial || state === SIP.SessionState.Establishing) {
      this.session instanceof SIP.Inviter ? this.session.cancel() : this.session.reject();
    } else if (state === SIP.SessionState.Established) {
      this.session.bye();
    }

    this.callbacks.onCallEnded?.();
    this.session = null;
    this.localHold = false;
  }

  async stop(soft = false) {
    if (this.session) {
      try {
        this.hangUp();
      } catch (error) {
        console.warn('Ошибка завершения активной сессии', error);
      }
    }

    if (this.registerer) {
      try {
        await this.registerer.unregister();
      } catch (error) {
        if (!soft) console.warn('Ошибка unregister', error);
      }
      this.registerer = null;
    }

    if (this.ua) {
      try {
        await this.ua.stop();
      } catch (error) {
        if (!soft) console.warn('Ошибка остановки UA', error);
      }
      this.ua = null;
    }
  }

  async toggleHold() {
    if (!this.session || this.session.state !== SIP.SessionState.Established) return false;
    const shouldHold = !this.localHold;
    const holdModifier = SIP.Web?.holdModifier;

    if (shouldHold && !holdModifier) {
      console.warn('Hold modifier недоступен в текущей версии SIP.js');
      return this.localHold;
    }

    const modifiers = shouldHold ? [holdModifier] : [];

    try {
      await this.session.invite({
        sessionDescriptionHandlerModifiers: modifiers,
        sessionDescriptionHandlerOptions: {
          constraints: this.createConstraints()
        }
      });
      this.localHold = shouldHold;
      return shouldHold;
    } catch (error) {
      console.error('Hold failed', error);
      return this.localHold;
    }
  }

  attachSessionListeners(session) {
    session.stateChange.addListener((state) => {
      if (state === SIP.SessionState.Established) {
        this.bindRemoteAudio(session);
        // Получаем имя собеседника из установленной сессии
        const remoteIdentity = session.remoteIdentity;
        const displayName = remoteIdentity?.displayName || remoteIdentity?.uri?.user || 'Неизвестный';
        this.callbacks.onCallEstablished?.(displayName);
        this.localHold = false;
      }
      if (state === SIP.SessionState.Terminated) {
        this.callbacks.onCallEnded?.();
        this.session = null;
        this.localHold = false;
      }
    });
  }

  bindRemoteAudio(session) {
    const audioEl = document.getElementById('remote-audio');
    const handler = session.sessionDescriptionHandler;
    if (!audioEl || !handler) return;

    const remoteStream = new MediaStream();
    const pc = handler.peerConnection;

    pc.getReceivers().forEach((receiver) => {
      if (receiver.track.kind === 'audio') remoteStream.addTrack(receiver.track);
    });

    pc.addEventListener('track', (event) => {
      if (event.track.kind === 'audio') {
        remoteStream.addTrack(event.track);
        audioEl.srcObject = remoteStream;
        audioEl.play().catch(() => {});
      }
    });

    audioEl.srcObject = remoteStream;
    this.applyOutputDevicePreference(audioEl);
  }

  setVolume(value) {
    const el = document.getElementById('remote-audio');
    if (el) el.volume = Number(value);
  }

  applyOutputDevicePreference(target) {
    const audioEl = target || document.getElementById('remote-audio');
    if (!audioEl || !audioEl.setSinkId || !this.devicePrefs.outputDeviceId) return;

    audioEl.setSinkId(this.devicePrefs.outputDeviceId).catch((error) => {
      console.warn('Не удалось применить устройство вывода', error);
    });
  }
}