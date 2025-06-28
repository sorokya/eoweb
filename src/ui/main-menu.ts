import mitt from 'mitt';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';

type Events = {
  'create-account': undefined;
  'play-game': undefined;
  'view-credits': undefined;
  'host-change': string;
};

export class MainMenu extends Base {
  protected container = document.querySelector('#main-menu');
  private btnCreateAccount: HTMLButtonElement = this.container.querySelector(
    'button[data-id="create-account"]',
  );
  private btnPlayGame: HTMLButtonElement = this.container.querySelector(
    'button[data-id="play-game"]',
  );
  private btnViewCredits: HTMLButtonElement = this.container.querySelector(
    'button[data-id="view-credits"]',
  );
  private txtHost: HTMLInputElement =
    this.container.querySelector('input[name="host"]');
  private emitter = mitt<Events>();

  constructor() {
    super();
    this.btnCreateAccount.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('create-account', undefined);
    });
    this.btnPlayGame.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('play-game', undefined);
    });
    this.btnViewCredits.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('view-credits', undefined);
    });
    this.txtHost.addEventListener('change', () => {
      this.emitter.emit('host-change', this.txtHost.value);
    });
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }
}
