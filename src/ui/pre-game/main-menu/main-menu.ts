import { type Client, GameState } from '../../../client';
import { HOST } from '../../../consts';
import { playSfxById, SfxId } from '../../../sfx';
import { Base } from '../../base-ui';
import { Button } from '../../shared/button';
import classes from './main-menu.module.css';

export class MainMenu extends Base {
  public declare el: HTMLElement;
  private btnCreateAccount: HTMLButtonElement;
  private btnPlayGame: HTMLButtonElement;
  private btnViewCredits: HTMLButtonElement;
  private txtHost: HTMLInputElement | undefined;

  constructor(parent: HTMLElement, client: Client) {
    super();

    this.el = document.createElement('div');
    this.el.className = classes['main-menu'];

    const logoContainer = document.createElement('div');
    logoContainer.className = classes.logo;
    logoContainer.setAttribute('data-slogan', client.config.slogan);

    const logo = document.createElement('img');
    logo.src = 'logo.png';
    logo.alt = 'Game Logo';
    logoContainer.appendChild(logo);
    this.el.appendChild(logoContainer);

    if (client.config.host === HOST) {
      this.txtHost = document.createElement('input');
      this.txtHost.type = 'text';
      this.txtHost.value = client.config.host;
      this.txtHost.name = 'host';
      this.txtHost.title = 'Game Server Host';
      this.txtHost.addEventListener('change', () => {
        client.config.host = this.txtHost.value;
        client.disconnect();
      });
      this.el.appendChild(this.txtHost);
    }

    this.btnCreateAccount = new Button('Create Account', this.el);
    this.btnCreateAccount.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      client.connect(GameState.CreateAccount);
    });

    this.btnPlayGame = new Button('Play Game', this.el);
    this.btnPlayGame.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      client.connect(GameState.Login);
    });

    this.btnViewCredits = new Button('View Credits', this.el);
    this.btnViewCredits.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      if (client.config.creditsUrl) {
        window.open(client.config.creditsUrl, '_blank');
      }
    });

    parent.appendChild(this.el);
  }
}
