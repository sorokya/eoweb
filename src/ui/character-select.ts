import {
  CharacterMapInfo,
  type CharacterSelectionListEntry,
  Direction,
  EquipmentMapInfo,
} from 'eolib';
import mitt from 'mitt';
import type { Client } from '../client';
import {
  getCharacterRectangle,
  Rectangle,
  setCharacterRectangle,
} from '../collision';
import {
  CHARACTER_HEIGHT,
  CHARACTER_WIDTH,
  GAME_FPS,
  HALF_CHARACTER_WIDTH,
} from '../consts';
import { DialogResourceID } from '../edf';
import { playSfxById, SfxId } from '../sfx';
import { capitalize } from '../utils/capitalize';
import { Base } from './base-ui';

type Events = {
  cancel: undefined;
  selectCharacter: number;
  create: undefined;
  changePassword: undefined;
  error: { title: string; message: string };
};

let lastTime: DOMHighResTimeStamp | undefined;

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
  private characters: CharacterSelectionListEntry[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private open = false;

  isOpen(): boolean {
    return this.open;
  }

  private emitter = mitt<Events>();

  private onLogin: ((e: Event) => undefined)[] = [];
  private onDelete: ((e: Event) => undefined)[] = [];
  private client: Client;

  show() {
    this.container.classList.remove('hidden');
    this.container.style.left = `${Math.floor(window.innerWidth / 2 - this.container.clientWidth / 2)}px`;
    this.container.style.top = `${Math.floor(window.innerHeight / 2 - this.container.clientHeight / 2)}px`;
    this.open = true;
    for (const el of this.container.querySelectorAll('.preview')) {
      const image = el as HTMLImageElement;
      image.src = '';
    }
    window.requestAnimationFrame((now) => {
      this.render(now);
    });
  }

  hide() {
    this.container.classList.add('hidden');
    this.open = false;
  }

  render(now: DOMHighResTimeStamp) {
    if (!lastTime) {
      lastTime = now;
    }

    const ellapsed = now - lastTime;
    if (ellapsed < GAME_FPS) {
      requestAnimationFrame((n) => {
        this.render(n);
      });
      return;
    }

    lastTime = now;

    const rect = getCharacterRectangle(1);
    if (!rect) {
      setCharacterRectangle(
        1,
        new Rectangle(
          {
            x: this.canvas.width / 2 - HALF_CHARACTER_WIDTH,
            y: 20,
          },
          CHARACTER_WIDTH,
          CHARACTER_HEIGHT,
        ),
      );
    }

    let index = 0;
    for (const character of this.characters) {
      const mapInfo = new CharacterMapInfo();
      mapInfo.playerId = 1;
      mapInfo.gender = character.gender;
      mapInfo.skin = character.skin;
      mapInfo.direction = Direction.Down;
      mapInfo.hairColor = character.hairColor;
      mapInfo.hairStyle = character.hairStyle;
      mapInfo.equipment = new EquipmentMapInfo();
      mapInfo.equipment.boots = character.equipment.boots;
      mapInfo.equipment.armor = character.equipment.armor;
      mapInfo.equipment.weapon = character.equipment.weapon;
      mapInfo.equipment.hat = character.equipment.hat;
      mapInfo.equipment.shield = character.equipment.shield;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const preview: HTMLImageElement = this.container.querySelectorAll(
        '.preview',
      )[index] as HTMLImageElement;
      if (preview) {
        preview.src = this.canvas.toDataURL();
      }

      const adminLevel: HTMLImageElement =
        this.container.querySelector('.admin-level');
      if (adminLevel) {
        adminLevel.classList.add(`level-${character.admin}`);
      }
      index++;
    }

    if (this.open) {
      window.requestAnimationFrame((now) => {
        this.render(now);
      });
    }
  }

  setCharacters(characters: CharacterSelectionListEntry[]) {
    this.characters = characters;
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

  constructor(client: Client) {
    super();

    this.client = client;

    this.canvas = document.createElement('canvas');
    const w = CHARACTER_WIDTH + 40;
    const h = CHARACTER_HEIGHT + 40;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');

    this.btnCreate.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);

      if (this.characters.length >= 3) {
        const text = this.client.getDialogStrings(
          DialogResourceID.CHARACTER_CREATE_TOO_MANY_CHARS,
        );
        this.emitter.emit('error', {
          title: text[0],
          message: text[1],
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

  selectCharacter(index: number) {
    const character = this.characters[index - 1];
    if (character) {
      playSfxById(SfxId.ButtonClick);
      this.emitter.emit('selectCharacter', character.id);
    }
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }
}
