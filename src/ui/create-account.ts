import mitt from 'mitt';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';

type Events = {
  cancel: undefined;
  error: { title: string; message: string };
  create: {
    username: string;
    password: string;
    name: string;
    location: string;
    email: string;
  };
};

export class CreateAccountForm extends Base {
  protected container = document.getElementById('create-account-form');
  private form: HTMLFormElement = this.container.querySelector('form');
  private username: HTMLInputElement =
    this.container.querySelector('#create-username');
  private password: HTMLInputElement =
    this.container.querySelector('#create-password');
  private confirmPassword: HTMLInputElement = this.container.querySelector(
    '#create-confirm-password',
  );
  private name: HTMLInputElement = this.container.querySelector('#create-name');
  private location: HTMLInputElement =
    this.container.querySelector('#create-location');
  private email: HTMLInputElement =
    this.container.querySelector('#create-email');
  private btnCreate: HTMLButtonElement = this.container.querySelector(
    'button[data-id="create"]',
  );
  private btnCancel: HTMLButtonElement = this.container.querySelector(
    'button[data-id="cancel-big"]',
  );
  private emitter = mitt<Events>();
  private formElements: HTMLInputElement[];

  show() {
    this.username.value = '';
    this.password.value = '';
    this.confirmPassword.value = '';
    this.name.value = '';
    this.location.value = '';
    this.email.value = '';
    this.container.classList.remove('hidden');
    this.username.focus();
  }

  constructor() {
    super();

    this.formElements = [
      this.username,
      this.password,
      this.confirmPassword,
      this.name,
      this.location,
      this.email,
    ];

    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('cancel');
    });

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      playSfxById(SfxId.ButtonClick);
      const username = this.username.value.trim();
      const password = this.password.value.trim();
      const confirmPassword = this.confirmPassword.value.trim();
      const name = this.name.value.trim();
      const location = this.location.value.trim();
      const email = this.email.value.trim();

      if (
        !username ||
        !password ||
        !confirmPassword ||
        !name ||
        !location ||
        !email
      ) {
        this.emitter.emit('error', {
          title: 'Wrong input',
          message:
            'Some of the fields are still empty. Fill in all the fields and try again',
        });
        return false;
      }

      if (password !== confirmPassword) {
        this.emitter.emit('error', {
          title: 'Wrong password',
          message:
            'The two passwords you provided are not the same, please try again.',
        });
        return false;
      }

      if (!email.includes('@') || !email.includes('.')) {
        this.emitter.emit('error', {
          title: 'Wrong input',
          message: 'Enter a valid email address.',
        });
        return false;
      }

      this.emitter.emit('create', {
        username,
        password,
        name,
        location,
        email,
      });
      return false;
    });

    this.setupTabTrapping();
  }

  private setupTabTrapping() {
    this.formElements.forEach((element, index) => {
      element.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Tab' && !this.container.classList.contains('hidden')) {
          e.preventDefault();

          if (e.shiftKey) {
            const prevIndex =
              index === 0 ? this.formElements.length - 1 : index - 1;
            this.formElements[prevIndex].focus();
          } else {
            const nextIndex =
              index === this.formElements.length - 1 ? 0 : index + 1;
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
