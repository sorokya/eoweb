import { Base } from '../../base-ui';
import classes from './dialog-container.module.css';

export class DialogContainer extends Base {
  public declare el: HTMLElement;

  constructor(parent: HTMLElement) {
    super();

    this.el = document.createElement('div');
    this.el.className = classes['dialog-container'];
    this.el.classList.add('hidden');
    parent.appendChild(this.el);
  }
}
