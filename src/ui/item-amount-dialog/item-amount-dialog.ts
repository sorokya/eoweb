import { playSfxById, SfxId } from '../../sfx';
import { Base } from '../base-ui';

import './item-amount-dialog.css';

export class ItemAmountDialog extends Base {
  protected container = document.getElementById('item-amount-dialog');
  private cover = document.getElementById('cover');
  private header = this.container.querySelector<HTMLDivElement>('.header');
  private label: HTMLParagraphElement = this.container.querySelector('.label');
  private btnCancel: HTMLButtonElement = this.container.querySelector(
    'button[data-id="cancel"]',
  );
  private form: HTMLFormElement = this.container.querySelector('form');
  private txtAmount: HTMLInputElement = this.container.querySelector('input');
  private amount = 1;
  private maxAmount = 1;
  private callback: ((amount: number) => void) | null = null;
  private cancelCallback: (() => void) | null = null;
  private slider: HTMLDivElement =
    this.container.querySelector('.slider-container');
  private thumb: HTMLDivElement = this.container.querySelector('.slider-thumb');
  private dragging = false;

  setHeader(header: 'drop' | 'junk' | 'give' | 'trade' | 'shop' | 'bank') {
    this.header.setAttribute('data-id', header);
  }

  setLabel(label: string) {
    this.label.innerText = label;
  }

  setMaxAmount(amount: number) {
    this.maxAmount = amount;
    this.txtAmount.max = this.maxAmount.toString();
  }

  setCallback(
    callback: (amount: number) => void,
    cancelCallback: () => void = () => {},
  ) {
    this.callback = callback;
    this.cancelCallback = cancelCallback;
  }

  show() {
    this.amount = 1;
    this.txtAmount.value = this.amount.toString();
    this.thumb.style.left = '0';
    this.cover.classList.remove('hidden');
    this.container.classList.remove('hidden');
    this.container.style.left = `${Math.floor(window.innerWidth / 2 - this.container.clientWidth / 2)}px`;
    this.container.style.top = `${Math.floor(window.innerHeight / 2 - this.container.clientHeight / 2)}px`;
    this.txtAmount.focus();
  }

  constructor() {
    super();

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (this.callback) {
        this.callback(this.amount);
        this.callback = null;
        this.cancelCallback = null;
      }

      this.hide();
      this.cover.classList.add('hidden');

      return false;
    });

    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
      this.cover.classList.add('hidden');
      if (this.cancelCallback) {
        this.cancelCallback();
        this.cancelCallback = null;
        this.callback = null;
      }
    });

    this.txtAmount.addEventListener('change', () => {
      this.amount = Number.parseInt(this.txtAmount.value, 10);
      if (Number.isNaN(this.amount)) {
        this.amount = 1;
      }

      if (this.amount > this.maxAmount) {
        this.amount = this.maxAmount;
        this.txtAmount.value = this.amount.toString();
      }

      const percent = (this.amount - 1) / (this.maxAmount - 1);
      const sliderWidth = this.slider.offsetWidth;
      const x = percent * sliderWidth;
      if (this.amount === 1) {
        this.thumb.style.left = '0';
      } else {
        this.thumb.style.left = `${x - this.thumb.offsetWidth}px`;
      }
    });

    this.thumb.addEventListener('mousedown', () => {
      this.dragging = true;
    });

    this.thumb.addEventListener('touchstart', () => {
      this.dragging = true;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.dragging) {
        return;
      }
      this.setValueFromX(e.clientX);
    });
    document.addEventListener('touchmove', (e) => {
      if (!this.dragging || !e.touches) {
        return;
      }
      this.setValueFromX(e.touches[0].clientX);
    });

    document.addEventListener('mouseup', () => {
      this.dragging = false;
    });
    document.addEventListener('touchend', () => {
      this.dragging = false;
    });
  }

  private setValueFromX(clientX: number) {
    const rect = this.slider.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    if (x - this.thumb.offsetWidth < 0) {
      return;
    }

    const percent = x / rect.width;
    this.amount = Math.floor(1 + percent * (this.maxAmount - 1));
    this.txtAmount.value = this.amount.toString();
    this.thumb.style.left = `${x - this.thumb.offsetWidth}px`;
  }
}
