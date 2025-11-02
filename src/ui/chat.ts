import mitt from 'mitt';
import { ChatTab } from '../client';
import { Base } from './base-ui';

type Events = {
  click: undefined;
  chat: string;
  focus: undefined;
  blur: undefined;
};

export enum ChatIcon {
  None = -1,
  SpeechBubble = 0,
  Note = 1,
  Error = 2,
  NoteLeftArrow = 3,
  GlobalAnnounce = 4,
  Star = 5,
  Exclamation = 6,
  LookingDude = 7,
  Heart = 8,
  Player = 9,
  PlayerParty = 10,
  PlayerPartyDark = 11,
  GM = 12,
  GMParty = 13,
  HGM = 14,
  HGMParty = 15,
  DownArrow = 16,
  UpArrow = 17,
  DotDotDotDot = 18,
  Guild = 19,
  Skeleton = 20,
  Trophy = 21,
  Information = 22,
  QuestMessage = 23,
}

export class Chat extends Base {
  protected container = document.getElementById('chat');
  private form: HTMLFormElement = this.container.querySelector('form');
  private localChat =
    this.container.querySelector<HTMLUListElement>('#local-chat');
  private globalChat =
    this.container.querySelector<HTMLUListElement>('#global-chat');
  private groupChat =
    this.container.querySelector<HTMLUListElement>('#group-chat');
  private systemChat =
    this.container.querySelector<HTMLUListElement>('#system-chat');
  private activeChat: HTMLUListElement = this.localChat;
  private message: HTMLInputElement = this.container.querySelector('input');
  private emitter = mitt<Events>();
  private btnToggle: HTMLButtonElement =
    this.container.querySelector('#btn-toggle-chat');
  private btnLocal: HTMLButtonElement = this.container.querySelector(
    '#btn-chat-tab-local',
  );
  private btnGlobal: HTMLButtonElement = this.container.querySelector(
    '#btn-chat-tab-global',
  );
  private btnGroup: HTMLButtonElement = this.container.querySelector(
    '#btn-chat-tab-group',
  );
  private btnSystem: HTMLButtonElement = this.container.querySelector(
    '#btn-chat-tab-system',
  );
  private collapsed = false;

  setMessage(message: string) {
    this.message.value = message;
    this.focus();
  }

  addMessage(tab: ChatTab, message: string, icon: ChatIcon) {
    const li = document.createElement('li');

    const img = document.createElement('div');
    img.classList.add('icon');
    img.setAttribute('data-id', icon.toString());
    li.appendChild(img);

    const msg = document.createElement('span');
    msg.innerHTML = this.replaceLinks(this.sanitize(message));
    li.appendChild(msg);

    let chatWindow: HTMLUListElement;
    let chatTab: HTMLButtonElement;
    switch (tab) {
      case ChatTab.Local:
        chatWindow = this.localChat;
        chatTab = this.btnLocal;
        break;
      case ChatTab.Global:
        chatWindow = this.globalChat;
        chatTab = this.btnGlobal;
        break;
      case ChatTab.Group:
        chatWindow = this.groupChat;
        chatTab = this.btnGroup;
        break;
      case ChatTab.System:
        chatWindow = this.systemChat;
        chatTab = this.btnSystem;
        break;
      default:
        throw new Error(`Invalid chat tab: ${tab}`);
    }

    chatWindow.appendChild(li);
    chatWindow.scrollTo(0, chatWindow.scrollHeight);
    chatTab.classList.add('active');
  }

  clear() {
    this.localChat.innerHTML = '';
    this.globalChat.innerHTML = '';
    this.groupChat.innerHTML = '';
    this.systemChat.innerHTML = '';
  }

  focus() {
    this.message.focus();
  }

  constructor() {
    super();
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.emitter.emit('chat', this.message.value);
      if (!this.message.value) {
        setTimeout(() => {
          this.message.blur();
        }, 200);
      }
      this.message.value = '';
      return false;
    });

    this.message.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') {
        this.message.value = '';
        this.message.blur();
      }
    });

    this.message.addEventListener('focus', () => {
      this.emitter.emit('focus', undefined);
    });

    this.message.addEventListener('blur', () => {
      this.emitter.emit('blur', undefined);
    });

    this.btnToggle.addEventListener('click', () => {
      if (this.collapsed) {
        this.activeChat.classList.remove('hidden');
        this.collapsed = false;
      } else {
        this.activeChat.classList.add('hidden');
        this.collapsed = true;
      }
    });

    this.btnLocal.addEventListener('click', () => {
      this.localChat.classList.remove('hidden');
      this.globalChat.classList.add('hidden');
      this.groupChat.classList.add('hidden');
      this.systemChat.classList.add('hidden');
      this.btnLocal.classList.add('active');
      this.btnGlobal.classList.remove('active');
      this.btnGroup.classList.remove('active');
      this.btnSystem.classList.remove('active');
      this.localChat.scrollTo(0, this.localChat.scrollHeight);
      this.activeChat = this.localChat;
      this.collapsed = false;
    });

    this.btnGlobal.addEventListener('click', () => {
      this.localChat.classList.add('hidden');
      this.globalChat.classList.remove('hidden');
      this.groupChat.classList.add('hidden');
      this.systemChat.classList.add('hidden');
      this.btnLocal.classList.remove('active');
      this.btnGlobal.classList.add('active');
      this.btnGroup.classList.remove('active');
      this.btnSystem.classList.remove('active');
      this.globalChat.scrollTo(0, this.globalChat.scrollHeight);
      this.activeChat = this.globalChat;
    });

    this.btnGroup.addEventListener('click', () => {
      this.localChat.classList.add('hidden');
      this.globalChat.classList.add('hidden');
      this.groupChat.classList.remove('hidden');
      this.systemChat.classList.add('hidden');
      this.btnLocal.classList.remove('active');
      this.btnGlobal.classList.remove('active');
      this.btnGroup.classList.add('active');
      this.btnSystem.classList.remove('active');
      this.groupChat.scrollTo(0, this.groupChat.scrollHeight);
      this.activeChat = this.groupChat;
      this.collapsed = false;
    });

    this.btnSystem.addEventListener('click', () => {
      this.localChat.classList.add('hidden');
      this.globalChat.classList.add('hidden');
      this.groupChat.classList.add('hidden');
      this.systemChat.classList.remove('hidden');
      this.btnLocal.classList.remove('active');
      this.btnGlobal.classList.remove('active');
      this.btnGroup.classList.remove('active');
      this.btnSystem.classList.add('active');
      this.systemChat.scrollTo(0, this.systemChat.scrollHeight);
      this.activeChat = this.systemChat;
      this.collapsed = false;
    });
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  private sanitize(input: string): string {
    const sanitized = input.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
    return sanitized;
  }

  private replaceLinks(input: string): string {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return input.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  }
}
