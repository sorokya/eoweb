import { Base } from './base-ui';

const x: number[] = [0, 0, 0, 0];
const y: number[] = [0, 0, 0, 0];

export function getOffsetX(index: number): number {
  return x[index];
}

export function getOffsetY(index: number): number {
  return y[index];
}

export class OffsetTweaker extends Base {
  public el = document.querySelector('#offset-tweaker');
  private txtX0: HTMLInputElement = this.el.querySelector('#tweak-x-0');
  private txtY0: HTMLInputElement = this.el.querySelector('#tweak-y-0');
  private txtX1: HTMLInputElement = this.el.querySelector('#tweak-x-1');
  private txtY1: HTMLInputElement = this.el.querySelector('#tweak-y-1');
  private txtX2: HTMLInputElement = this.el.querySelector('#tweak-x-2');
  private txtY2: HTMLInputElement = this.el.querySelector('#tweak-y-2');
  private txtX3: HTMLInputElement = this.el.querySelector('#tweak-x-3');
  private txtY3: HTMLInputElement = this.el.querySelector('#tweak-y-3');

  constructor() {
    super();

    this.txtX0.addEventListener('change', () => {
      const value = Number.parseInt(this.txtX0.value, 10);
      if (!Number.isNaN(value)) {
        x[0] = value;
      }
    });

    this.txtY0.addEventListener('change', () => {
      const value = Number.parseInt(this.txtY0.value, 10);
      if (!Number.isNaN(value)) {
        y[0] = value;
      }
    });

    this.txtX1.addEventListener('change', () => {
      const value = Number.parseInt(this.txtX1.value, 10);
      if (!Number.isNaN(value)) {
        x[1] = value;
      }
    });

    this.txtY1.addEventListener('change', () => {
      const value = Number.parseInt(this.txtY1.value, 10);
      if (!Number.isNaN(value)) {
        y[1] = value;
      }
    });

    this.txtX2.addEventListener('change', () => {
      const value = Number.parseInt(this.txtX2.value, 10);
      if (!Number.isNaN(value)) {
        x[2] = value;
      }
    });

    this.txtY2.addEventListener('change', () => {
      const value = Number.parseInt(this.txtY2.value, 10);
      if (!Number.isNaN(value)) {
        y[2] = value;
      }
    });

    this.txtX3.addEventListener('change', () => {
      const value = Number.parseInt(this.txtX3.value, 10);
      if (!Number.isNaN(value)) {
        x[3] = value;
      }
    });

    this.txtY3.addEventListener('change', () => {
      const value = Number.parseInt(this.txtY3.value, 10);
      if (!Number.isNaN(value)) {
        y[3] = value;
      }
    });
  }
}
