import mitt from 'mitt';
import type { Client } from '@/client';
import { Base } from '@/ui/base-ui';

import './chat.css';
import { ChatIcon, ChatTab } from '@/ui/ui-types';

type Events = {
  click: undefined;
  chat: string;
  focus: undefined;
  blur: undefined;
};

export class Chat extends Base {
  protected container = document.getElementById('chat')!;
  private form: HTMLFormElement = this.container!.querySelector('form')!;
  private localChat =
    this.container!.querySelector<HTMLUListElement>('#local-chat');
  private globalChat =
    this.container!.querySelector<HTMLUListElement>('#global-chat');
  private groupChat =
    this.container!.querySelector<HTMLUListElement>('#group-chat');
  private systemChat =
    this.container!.querySelector<HTMLUListElement>('#system-chat');
  private activeChat: HTMLUListElement = this.localChat!;
  private message: HTMLInputElement = this.container!.querySelector('input')!;
  private emitter = mitt<Events>();
  private btnToggle: HTMLButtonElement =
    this.container!.querySelector('#btn-toggle-chat')!;
  private btnLocal: HTMLButtonElement = this.container!.querySelector(
    '#btn-chat-tab-local',
  )!;
  private btnGlobal: HTMLButtonElement = this.container!.querySelector(
    '#btn-chat-tab-global',
  )!;
  private btnGroup: HTMLButtonElement = this.container!.querySelector(
    '#btn-chat-tab-group',
  )!;
  private btnSystem: HTMLButtonElement = this.container!.querySelector(
    '#btn-chat-tab-system',
  )!;
  private collapsed = false;
  private client: Client;

  setMessage(message: string) {
    this.message.value = message;
    this.focus();
  }

  addMessage(tab: ChatTab, message: string, icon: ChatIcon, name?: string) {
    const li = document.createElement('li');
    li.setAttribute('data-author', name!);

    const img = document.createElement('div');
    img.classList.add('icon');
    img.setAttribute('data-id', icon.toString());
    li.appendChild(img);

    const msgContainer = document.createElement('div');
    msgContainer.classList.add('msg');

    if (name) {
      const playerName = document.createElement('span');
      playerName.classList.add('author');
      playerName.innerText = name;

      const click = () => {
        let playerName = name;
        if (playerName.includes('->')) {
          playerName = playerName
            .split('->')
            .filter(
              (n) => n.toLowerCase() !== this.client.name.toLowerCase(),
            )[0];
        }

        this.setMessage(`!${playerName} `);
      };

      playerName.addEventListener('click', click);
      playerName.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        click();
      });

      msgContainer.prepend(playerName);
    }

    const msg = document.createElement('span');
    msg.classList.add('chat-message');

    const urlRegex = /\b((https?:\/\/|www\.)[^\s<]+)/gi;

    let lastIndex = 0;
    let match: RegExpExecArray | null = urlRegex.exec(message);
    while (match !== null) {
      let rawUrl = match[0];

      // Handle trailing punctuation (common in chat)
      const trailingMatch = rawUrl.match(/[.,!?)\]}]+$/);
      let trailing = '';

      if (trailingMatch) {
        trailing = trailingMatch[0];
        rawUrl = rawUrl.slice(0, -trailing.length);
      }

      // Append text before the URL
      if (match.index > lastIndex) {
        msg.appendChild(
          document.createTextNode(message.slice(lastIndex, match.index)),
        );
      }

      // Normalize URL (add protocol if missing)
      const normalizedUrl = rawUrl.startsWith('www.')
        ? `https://${rawUrl}`
        : rawUrl;

      if (this.isSafeUrl(normalizedUrl)) {
        const a = document.createElement('a');
        a.href = normalizedUrl;

        // Display original text (not normalized)
        a.textContent = rawUrl;

        a.target = '_blank';
        a.rel = 'noopener noreferrer nofollow';

        msg.appendChild(a);
      } else {
        // Fallback: treat as plain text
        msg.appendChild(document.createTextNode(rawUrl));
      }

      // Append trailing punctuation back as text
      if (trailing) {
        msg.appendChild(document.createTextNode(trailing));
      }

      lastIndex = match.index + match[0].length;
      match = urlRegex.exec(message);
    }

    // Append remaining text
    if (lastIndex < message.length) {
      msg.appendChild(document.createTextNode(message.slice(lastIndex)));
    }

    msgContainer.appendChild(msg);
    li.appendChild(msgContainer);

    if (icon === ChatIcon.Error) {
      li.classList.add('error-message');
    }

    let chatWindow: HTMLUListElement;
    let chatTab: HTMLButtonElement;
    switch (tab) {
      case ChatTab.Local:
        chatWindow = this.localChat!;
        chatTab = this.btnLocal;
        break;
      case ChatTab.Global:
        chatWindow = this.globalChat!;
        chatTab = this.btnGlobal;
        break;
      case ChatTab.Group:
        chatWindow = this.groupChat!;
        chatTab = this.btnGroup;
        break;
      case ChatTab.System:
        chatWindow = this.systemChat!;
        chatTab = this.btnSystem;
        break;
      default:
        throw new Error(`Invalid chat tab: ${tab}`);
    }

    chatWindow.appendChild(li);
    chatWindow.scrollTo(0, chatWindow.scrollHeight);
    chatTab.classList.add('active');
  }

  private isSafeUrl(url: string): boolean {
    try {
      const parsed = new URL(url);

      // Only allow safe protocols
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  clear() {
    this.localChat!.innerHTML = '';
    this.globalChat!.innerHTML = '';
    this.groupChat!.innerHTML = '';
    this.systemChat!.innerHTML = '';
  }

  focus() {
    this.message.focus();
  }

  constructor(client: Client) {
    super();
    this.client = client;
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
      this.localChat!.classList.remove('hidden');
      this.globalChat!.classList.add('hidden');
      this.groupChat!.classList.add('hidden');
      this.systemChat!.classList.add('hidden');
      this.btnLocal.classList.add('active');
      this.btnGlobal.classList.remove('active');
      this.btnGroup.classList.remove('active');
      this.btnSystem.classList.remove('active');
      this.localChat!.scrollTo(0, this.localChat!.scrollHeight);
      this.activeChat = this.localChat!;
      this.collapsed = false;
    });

    this.btnGlobal.addEventListener('click', () => {
      this.localChat!.classList.add('hidden');
      this.globalChat!.classList.remove('hidden');
      this.groupChat!.classList.add('hidden');
      this.systemChat!.classList.add('hidden');
      this.btnLocal.classList.remove('active');
      this.btnGlobal.classList.add('active');
      this.btnGroup.classList.remove('active');
      this.btnSystem.classList.remove('active');
      this.globalChat!.scrollTo(0, this.globalChat!.scrollHeight);
      this.activeChat = this.globalChat!;
    });

    this.btnGroup.addEventListener('click', () => {
      this.localChat!.classList.add('hidden');
      this.globalChat!.classList.add('hidden');
      this.groupChat!.classList.remove('hidden');
      this.systemChat!.classList.add('hidden');
      this.btnLocal.classList.remove('active');
      this.btnGlobal.classList.remove('active');
      this.btnGroup.classList.add('active');
      this.btnSystem.classList.remove('active');
      this.groupChat!.scrollTo(0, this.groupChat!.scrollHeight);
      this.activeChat = this.groupChat!;
      this.collapsed = false;
    });

    this.btnSystem.addEventListener('click', () => {
      this.localChat!.classList.add('hidden');
      this.globalChat!.classList.add('hidden');
      this.groupChat!.classList.add('hidden');
      this.systemChat!.classList.remove('hidden');
      this.btnLocal.classList.remove('active');
      this.btnGlobal.classList.remove('active');
      this.btnGroup.classList.remove('active');
      this.btnSystem.classList.add('active');
      this.systemChat!.scrollTo(0, this.systemChat!.scrollHeight);
      this.activeChat = this.systemChat!;
      this.collapsed = false;
    });
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }
}
