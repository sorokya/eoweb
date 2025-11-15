import { playSfxById, SfxId } from '../../sfx';
import { Base } from '../base-ui';

import './small-confirm.css';

export class SmallConfirm extends Base {
  protected container = document.getElementById('small-confirm');
  private cover = document.getElementById('cover');
  private title: HTMLSpanElement = this.container.querySelector('.title');
  private message: HTMLSpanElement = this.container.querySelector('.message');
  private btnOk: HTMLButtonElement = this.container.querySelector(
    'button[data-id="ok"]',
  );
  private btnCancel: HTMLButtonElement = this.container.querySelector(
    'button[data-id="cancel"]',
  );
  private callback: (() => undefined) | null = null;

  show() {
    this.cover.classList.remove('hidden');
    this.container.classList.remove('hidden');
    this.container.style.left = `${Math.floor(window.innerWidth / 2 - this.container.clientWidth / 2)}px`;
    this.container.style.top = `${Math.floor(window.innerHeight / 2 - this.container.clientHeight / 2)}px`;
  }

  constructor() {
    super();
    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
      this.cover.classList.add('hidden');
    });

    this.btnOk.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
      this.cover.classList.add('hidden');

      if (this.callback) {
        this.callback();
      }
    });
  }

  setContent(message: string, title = 'Error') {
    this.title.innerText = title;
    this.message.innerText = message;
  }

  setCallback(callback: () => undefined) {
    this.callback = callback;
  }
}
