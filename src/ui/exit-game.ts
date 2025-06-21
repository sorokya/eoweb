import mitt, { Emitter } from 'mitt';
import { Base } from './base-ui';

type Events = {
  click: undefined;
};

export class ExitGame extends Base {
  protected container = document.getElementById('exit-game');
  private button: HTMLButtonElement = this.container.querySelector(
    'button[data-id="exit-game"]',
  );
  private emitter = mitt<Events>();

  constructor() {
    super();
    this.button.addEventListener('click', () => {
      this.emitter.emit('click', undefined);
    });
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }
}
