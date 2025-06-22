import mitt from 'mitt';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';
import type { CharacterSelectionListEntry } from 'eolib';
import { capitalize } from '../utils/capitalize';

type Events = {
  cancel: undefined;
  selectCharacter: number;
  create: undefined;
  changePassword: undefined;
  error: { title: string; message: string };
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
  private characterCount = 0;

  setCharacters(characters: CharacterSelectionListEntry[]) {
    this.characterCount = characters.length;
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
        nameLabel.innerText = capitalize(character.name);
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

      if (this.characterCount >= 3) {
        this.emitter.emit('error', {
          title: 'Request denied',
          message:
            'You can only have 3 characters. Please delete a character and try again.',
        });
        return;
      }

      this.emitter.emit('create', undefined);
    });

    this.btnPassword.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('changePassword', undefined);
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
