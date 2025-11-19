import mitt from 'mitt';
import { playSfxById, SfxId } from '../../../sfx';
import { Base } from '../../base-ui';

import './in-game-menu.css';

type Events = {
  toggle: 'inventory' | 'map' | 'spells' | 'stats' | 'online' | 'party';
};

export class InGameMenu extends Base {
  private emitter = mitt<Events>();

  constructor() {
    super();
    this.el = document.querySelector('#in-game-menu');

    const btnInventory = this.el.querySelector('button[data-id="inventory"]');
    const btnMap = this.el.querySelector('button[data-id="map"]');
    const btnSpells = this.el.querySelector('button[data-id="spells"]');
    const btnStats = this.el.querySelector('button[data-id="stats"]');
    const btnOnline = this.el.querySelector('button[data-id="online"]');
    const btnParty = this.el.querySelector('button[data-id="party"]');

    btnInventory.addEventListener('click', (e) => {
      e.stopPropagation();
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('toggle', 'inventory');
    });

    btnMap.addEventListener('click', (e) => {
      e.stopPropagation();
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('toggle', 'map');
    });

    btnSpells.addEventListener('click', (e) => {
      e.stopPropagation();
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('toggle', 'spells');
    });

    btnStats.addEventListener('click', (e) => {
      e.stopPropagation();
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('toggle', 'stats');
    });

    btnOnline.addEventListener('click', (e) => {
      e.stopPropagation();
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('toggle', 'online');
    });

    btnParty.addEventListener('click', (e) => {
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
