import mitt from 'mitt';
import { Base } from './base-ui';

type Events = {
  click: undefined;
  chat: string;
  focus: undefined;
  blur: undefined;
};

export class Chat extends Base {
  protected container = document.getElementById('chat');
  private form: HTMLFormElement = this.container.querySelector('form');
  private chatWindow = this.container.querySelector('#local-chat');
  private message: HTMLInputElement = this.container.querySelector('input');
  private emitter = mitt<Events>();
  private btnToggle: HTMLButtonElement =
    this.container.querySelector('#btn-toggle-chat');
  private collapsed = false;

  addMessage(message: string) {
    const li = document.createElement('li');
    li.innerText = message;
    this.chatWindow.appendChild(li);
    this.chatWindow.scrollTo(0, this.chatWindow.scrollHeight);
  }

  clear() {
    this.chatWindow.innerHTML = '';
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
        this.chatWindow.classList.remove('hidden');
        this.collapsed = false;
      } else {
        this.chatWindow.classList.add('hidden');
        this.collapsed = true;
      }
    });
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }
}
