import { Base } from '../../base-ui';
import classes from './cover.module.css';

export class Cover extends Base {
  public declare el: HTMLElement;

  constructor(parent: HTMLElement) {
    super();

    this.el = document.createElement('div');
    this.el.className = classes.cover;
    parent.appendChild(this.el);
  }
}
