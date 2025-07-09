import mitt from 'mitt';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';

type Events = {
  toggle: 'inventory' | 'map' | 'spells' | 'stats' | 'online' | 'party';
};

export class InGameMenu extends Base {
  private emitter = mitt<Events>();

  private btnInventory: HTMLButtonElement = this.container.querySelector(
    'button[data-id="inventory"]',
  );
  private btnMap: HTMLButtonElement = this.container.querySelector(
    'button[data-id="map"]',
  );
  private btnSpells: HTMLButtonElement = this.container.querySelector(
    'button[data-id="spells"]',
  );
  private btnStats: HTMLButtonElement = this.container.querySelector(
    'button[data-id="stats"]',
  );
  private btnOnline: HTMLButtonElement = this.container.querySelector(
    'button[data-id="online"]',
  );
  private btnParty: HTMLButtonElement = this.container.querySelector(
    'button[data-id="party"]',
  );

  constructor() {
    super(document.querySelector('#in-game-menu'));

    this.btnInventory.addEventListener('click', (e) => {
      e.stopPropagation();
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('toggle', 'inventory');
    });

    this.btnMap.addEventListener('click', (e) => {
      e.stopPropagation();
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('toggle', 'map');
    });

    this.btnSpells.addEventListener('click', (e) => {
      e.stopPropagation();
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('toggle', 'spells');
    });

    this.btnStats.addEventListener('click', (e) => {
      e.stopPropagation();
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('toggle', 'stats');
    });

    this.btnOnline.addEventListener('click', (e) => {
      e.stopPropagation();
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('toggle', 'online');
    });

    this.btnParty.addEventListener('click', (e) => {
      e.stopPropagation();
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('toggle', 'party');
    });
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }
}
