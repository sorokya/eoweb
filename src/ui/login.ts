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

  show() {
    this.username.value = '';
    this.password.value = '';
    this.container.classList.remove('hidden');
  }

  constructor() {
    super();
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('login', {
        username: this.username.value.trim(),
        password: this.password.value.trim(),
      });
      return false;
    });
    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('cancel', undefined);
    });
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }
}
