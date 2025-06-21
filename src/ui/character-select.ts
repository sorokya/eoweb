import mitt from 'mitt';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';
import type { CharacterSelectionListEntry } from 'eolib';

type Events = {
  cancel: undefined;
  selectCharacter: number;
};

export class CharacterSelect extends Base {
  protected container = document.getElementById('character-select');
  private btnCreate: HTMLButtonElement = this.container.querySelector(
    'button[data-id="create"]',
  );
  private btnPassword: HTMLButtonElement = this.container.querySelector(
    'button[data-id="password"]',
  );
  private btnCancel: HTMLButtonElement = this.container.querySelector(
    'button[data-id="cancel-big"]',
  );

  private emitter = mitt<Events>();

  private onLogin: ((e: Event) => undefined)[] = [];
  private onDelete: ((e: Event) => undefined)[] = [];

  setCharacters(characters: CharacterSelectionListEntry[]) {
    const characterBoxes = this.container.querySelectorAll('.character');
    let index = 0;
    for (const box of characterBoxes) {
      const nameLabel: HTMLSpanElement = box.querySelector('.name');
      nameLabel.innerText = '';
      const levelLabel: HTMLSpanElement = box.querySelector('.level');
      levelLabel.innerText = '';

      const btnLogin: HTMLButtonElement = box.querySelector(
        'button[data-id="login"]',
      );
      const btnDelete: HTMLButtonElement = box.querySelector(
        'button[data-id="delete"]',
      );

      const character = characters[index];
      if (character) {
        nameLabel.innerText = character.name;
        levelLabel.innerText = character.level.toString();
      }

      btnLogin.removeEventListener('click', this.onLogin[index]);
      this.onLogin[index] = () => {
        playSfxById(SfxId.ButtonClick);
        this.emitter.emit('selectCharacter', character.id);
      };
      btnLogin.addEventListener('click', this.onLogin[index]);

      btnDelete.removeEventListener('click', this.onDelete[index]);
      this.onDelete[index] = () => {
        playSfxById(SfxId.ButtonClick);
      };
      btnDelete.addEventListener('click', this.onDelete[index]);

      index += 1;
    }
  }

  constructor() {
    super();

    this.btnCreate.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
    });

    this.btnPassword.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
    });

    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('cancel', undefined);
    });
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }
}
