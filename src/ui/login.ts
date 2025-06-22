import mitt from 'mitt';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';

type Events = {
  login: { username: string; password: string };
  cancel: undefined;
};

export class LoginForm extends Base {
  protected container = document.getElementById('login-form');
  private form: HTMLFormElement = this.container.querySelector('form');
  private username: HTMLInputElement =
    this.container.querySelector('#login-username');
  private password: HTMLInputElement =
    this.container.querySelector('#login-password');
  private btnCancel: HTMLButtonElement = this.container.querySelector(
    'button[data-id="cancel"]',
  );

  private emitter = mitt<Events>();
  private formElements: (HTMLInputElement | HTMLButtonElement)[];

  show() {
    this.username.value = '';
    this.password.value = '';
    this.container.classList.remove('hidden');
    this.username.focus();
  }

  constructor() {
    super();
    this.formElements = [this.username, this.password, this.btnCancel];
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('login', {
        username: this.username.value.trim(),
        password: this.password.value.trim(),
      });
      this.password.value = '';
      this.password.focus();
      return false;
    });
    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('cancel', undefined);
    });

    this.setupTabTrapping();
  }

  private setupTabTrapping() {
    this.formElements.forEach((element, index) => {
      element.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Tab' && !this.container.classList.contains('hidden')) {
          e.preventDefault();         
          if (e.shiftKey) {
            const prevIndex = index === 0 ? this.formElements.length - 1 : index - 1;
            this.formElements[prevIndex].focus();
          } else {
            const nextIndex = index === this.formElements.length - 1 ? 0 : index + 1;
            this.formElements[nextIndex].focus();
          }
        }
      });
    });
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }
}