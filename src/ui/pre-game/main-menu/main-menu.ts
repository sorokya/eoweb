import { playSfxById, SfxId } from '../../../sfx';
import { Base } from '../../base-ui';
import { ImgButton } from '../../shared/img-button/img-button';
import classes from './main-menu.module.css';

export class MainMenu extends Base {
  protected declare container: HTMLElement;
  private btnCreateAccount: HTMLButtonElement;
  private btnPlayGame: HTMLButtonElement;
  private btnViewCredits: HTMLButtonElement;
  private txtHost: HTMLInputElement;

  constructor(parent: HTMLElement, slogan: string) {
    super();

    this.container = document.createElement('div');
    this.container.className = classes.container;

    const logoContainer = document.createElement('div');
    logoContainer.className = classes.logo;
    logoContainer.setAttribute('data-slogan', slogan);

    const logo = document.createElement('img');
    logo.src = 'logo.png';
    logo.alt = 'Game Logo';
    logoContainer.appendChild(logo);
    this.container.appendChild(logoContainer);

    this.txtHost = document.createElement('input');
    this.txtHost.type = 'text';
    this.txtHost.value = 'wss://ws.reoserv.net';
    this.txtHost.addEventListener('change', () => {});
    this.container.appendChild(this.txtHost);

    this.btnCreateAccount = new ImgButton('create-account', this.container);
    this.btnCreateAccount.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
    });

    this.btnPlayGame = new ImgButton('play-game', this.container);
    this.btnPlayGame.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
    });

    this.btnViewCredits = new ImgButton('view-credits', this.container);
    this.btnViewCredits.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
    });

    parent.appendChild(this.container);
  }
}
