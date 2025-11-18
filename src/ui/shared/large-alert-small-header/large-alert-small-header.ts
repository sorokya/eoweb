import { playSfxById, SfxId } from '../../../sfx';
import { Base } from '../../base-ui';

import './large-alert-small-header.css';

export class LargeAlertSmallHeader extends Base {
  protected container = document.getElementById('large-alert-small-header');
  private cover = document.getElementById('cover');
  private title: HTMLSpanElement = this.container.querySelector('.title');
  private message: HTMLSpanElement = this.container.querySelector('.message');
  private btnCancel: HTMLButtonElement = this.container.querySelector(
    'button[data-id="cancel"]',
  );

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
  }

  setContent(message: string, title = 'Error') {
    this.title.innerText = title;
    this.message.innerText = message;
  }
}
