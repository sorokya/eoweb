import { playSfxById, SfxId } from '../../../sfx';
import { Base } from '../../base-ui';

import './small-alert-large-header.css';

export class SmallAlertLargeHeader extends Base {
  public el = document.getElementById('small-alert');
  private cover = document.getElementById('cover');
  private title: HTMLSpanElement = this.el.querySelector('.title');
  private message: HTMLSpanElement = this.el.querySelector('.message');
  private btnCancel: HTMLButtonElement = this.el.querySelector(
    'button[data-id="ok"]',
  );

  show() {
    this.cover.classList.remove('hidden');
    this.el.classList.remove('hidden');
    this.el.style.left = `${Math.floor(window.innerWidth / 2 - this.el.clientWidth / 2)}px`;
    this.el.style.top = `${Math.floor(window.innerHeight / 2 - this.el.clientHeight / 2)}px`;
  }

  constructor() {
    super();
    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
      this.cover.classList.add('hidden');
    });
  }

  setContent(message: string, title = 'Error') {
    this.title.innerText = title;
    this.message.innerText = message;
  }
}
