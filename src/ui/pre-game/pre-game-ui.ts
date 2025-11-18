import type { Client } from '../../client';
import { MainMenu } from './main-menu';
import classes from './pre-game-ui.module.css';

export class PreGameUI {
  private el: HTMLDivElement;
  private mainMenu: MainMenu;

  constructor(container: HTMLElement, client: Client) {
    this.el = document.createElement('div');
    this.el.id = 'pre-game-ui';
    this.el.className = classes.container;

    this.mainMenu = new MainMenu(this.el, client.config.slogan);

    container.appendChild(this.el);
  }
}
