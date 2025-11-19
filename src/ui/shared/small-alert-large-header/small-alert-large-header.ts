import type { Client } from '../../../client';
import { playSfxById, SfxId } from '../../../sfx';
import { ComponentId } from '../../component-id';
import { BaseAlert } from '../base-alert';
import { Button } from '../button';

import classes from './small-alert-large-header.module.css';

export class SmallAlertLargeHeader extends BaseAlert {
  public declare el: HTMLDivElement;
  protected declare title: HTMLSpanElement;
  protected declare message: HTMLSpanElement;

  constructor(parent: HTMLElement, client: Client) {
    super();

    this.el = document.createElement('div');
    this.el.className = classes['small-alert-large-header'];

    const container = document.createElement('div');
    container.className = classes.container;

    const titleBackground = document.createElement('div');
    titleBackground.className = classes['title-background'];
    container.appendChild(titleBackground);

    this.title = document.createElement('span');
    this.title.className = classes.title;
    container.appendChild(this.title);

    this.message = document.createElement('span');
    this.message.className = classes.message;
    container.appendChild(this.message);

    const btnContainer = document.createElement('div');
    btnContainer.className = classes['btn-container'];
    container.appendChild(btnContainer);

    const btnCancel = new Button('OK!', btnContainer);
    btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      client.dismissAlert(ComponentId.SmallAlertLargeHeader);
    });

    this.el.appendChild(container);
    parent.appendChild(this.el);
  }
}
