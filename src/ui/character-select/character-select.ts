import {
  CharacterMapInfo,
  type CharacterSelectionListEntry,
  Direction,
  EquipmentMapInfo,
} from 'eolib';
import mitt from 'mitt';
import { CharacterFrame } from '../../atlas';
import type { Client } from '../../client';
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, GAME_FPS } from '../../consts';
import { DialogResourceID } from '../../edf';
import { playSfxById, SfxId } from '../../sfx';
import { capitalize } from '../../utils/capitalize';
import { Base } from '../base-ui';

import './character-select.css';

type Events = {
  cancel: undefined;
  selectCharacter: number;
  requestCharacterDeletion: {
    id: number;
    name: string;
  };
  deleteCharacter: {
    id: number;
    name: string;
  };
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
  confirmed = false;

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
    window.requestAnimationFrame(this.render.bind(this));
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

    for (let i = 0; i < 3; ++i) {
      const preview: HTMLImageElement = this.container.querySelectorAll(
        '.preview',
      )[i] as HTMLImageElement;
      const adminLevel: HTMLImageElement =
        this.container.querySelector('.admin-level');

      const character = this.characters[i];
      if (!character) {
        preview.src = '';
        adminLevel.className = 'admin-level';
        continue;
      }

      const frame = this.client.atlas.getCharacterFrame(
        this.client.playerId + i + 1,
        CharacterFrame.StandingDownRight,
      );
      if (!frame) {
        continue;
      }

      const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
      if (!atlas) {
        continue;
      }

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(
        atlas,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        Math.floor((this.canvas.width >> 1) - (frame.w >> 1)),
        Math.floor((this.canvas.height >> 1) - (frame.h >> 1)),
        frame.w,
        frame.h,
      );

      if (preview) {
        preview.src = this.canvas.toDataURL();
      }

      if (adminLevel) {
        adminLevel.classList.add(`level-${character.admin}`);
      }
    }

    if (this.open) {
      window.requestAnimationFrame(this.render.bind(this));
      return;
    }
  }

  setCharacters(characters: CharacterSelectionListEntry[]) {
    this.confirmed = false;
    this.characters = characters;

    this.client.nearby.characters = this.client.nearby.characters.filter(
      (c) => c.playerId === this.client.playerId,
    );
    this.client.nearby.characters.push(
      ...this.characters.map((c, i) => {
        const info = new CharacterMapInfo();
        info.playerId = this.client.playerId + i + 1;
        info.name = c.name;
        info.mapId = this.client.mapId;
        info.direction = Direction.Down;
        info.gender = c.gender;
        info.hairStyle = c.hairStyle;
        info.hairColor = c.hairColor;
        info.skin = c.skin;
        info.equipment = new EquipmentMapInfo();
        info.equipment.armor = c.equipment.armor;
        info.equipment.weapon = c.equipment.weapon;
        info.equipment.boots = c.equipment.boots;
        info.equipment.shield = c.equipment.shield;
        info.equipment.hat = c.equipment.hat;
        return info;
      }),
    );

    this.client.atlas.refresh();
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
        if (!character) {
          return;
        }

        this.emitter.emit('selectCharacter', character.id);
      };
      btnLogin.addEventListener('click', this.onLogin[index]);

      btnDelete.removeEventListener('click', this.onDelete[index]);
      this.onDelete[index] = () => {
        playSfxById(SfxId.ButtonClick);
        if (!character) {
          return;
        }

        if (this.confirmed) {
          this.emitter.emit('deleteCharacter', {
            id: character.id,
            name: character.name,
          });
        } else {
          this.emitter.emit('requestCharacterDeletion', {
            id: character.id,
            name: character.name,
          });
        }
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
