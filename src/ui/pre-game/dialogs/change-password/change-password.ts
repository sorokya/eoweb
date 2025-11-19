import mitt from 'mitt';
import type { Client } from '../../../../client';
import { DialogResourceID } from '../../../../edf';
import { playSfxById, SfxId } from '../../../../sfx';
import { Base } from '../../../base-ui';

import './change-password.css';

type Events = {
  error: { title: string; message: string };
  changePassword: {
    username: string;
    oldPassword: string;
    newPassword: string;
  };
};

export class ChangePasswordForm extends Base {
  public el = document.getElementById('change-password-form');
  private emitter = mitt<Events>();
  private cover: HTMLDivElement = document.querySelector('#cover');
  private username: HTMLInputElement = this.el.querySelector(
    'input[name="username"]',
  );
  private oldPassword: HTMLInputElement = this.el.querySelector(
    'input[name="old-password"]',
  );
  private newPassword: HTMLInputElement = this.el.querySelector(
    'input[name="new-password"]',
  );
  private confirmNewPassword: HTMLInputElement = this.el.querySelector(
    'input[name="confirm-new-password"]',
  );
  private form: HTMLFormElement = this.el.querySelector('form');
  private btnCancel: HTMLButtonElement = this.el.querySelector(
    'button[data-id="cancel"]',
  );

  private client: Client;

  private open = false;
  isOpen(): boolean {
    return this.open;
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  show() {
    this.open = true;
    this.username.value = '';
    this.oldPassword.value = '';
    this.newPassword.value = '';
    this.confirmNewPassword.value = '';
    this.cover.classList.remove('hidden');
    this.el.classList.remove('hidden');
    this.el.style.left = `${Math.floor(window.innerWidth / 2 - this.el.clientWidth / 2)}px`;
    this.el.style.top = `${Math.floor(window.innerHeight / 2 - this.el.clientHeight / 2)}px`;
    this.username.focus();
  }

  hide() {
    this.open = false;
    this.el.classList.add('hidden');
    this.cover.classList.add('hidden');
  }

  constructor(client: Client) {
    super();

    this.client = client;

    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
    });

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      playSfxById(SfxId.ButtonClick);

      const username = this.username.value.trim();
      const oldPassword = this.oldPassword.value.trim();
      const newPassword = this.newPassword.value.trim();
      const confirmNewPassword = this.confirmNewPassword.value.trim();

      if (!username || !oldPassword || !newPassword || !confirmNewPassword) {
        const text = this.client.getDialogStrings(
          DialogResourceID.ACCOUNT_CREATE_FIELDS_STILL_EMPTY,
        );
        this.emitter.emit('error', {
          title: text[0],
          message: text[1],
        });
        return false;
      }

      if (newPassword !== confirmNewPassword) {
        const text = this.client.getDialogStrings(
          DialogResourceID.CHANGE_PASSWORD_MISMATCH,
        );
        this.emitter.emit('error', {
          title: text[0],
          message: text[1],
        });
        return false;
      }

      this.emitter.emit('changePassword', {
        username,
        oldPassword,
        newPassword,
      });

      return false;
    });
  }
}
