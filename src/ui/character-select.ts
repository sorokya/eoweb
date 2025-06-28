import {
  CharacterMapInfo,
  type CharacterSelectionListEntry,
  Direction,
  EquipmentMapInfo,
} from 'eolib';
import mitt from 'mitt';
import { Rectangle, setCharacterRectangle } from '../collision';
import {
  CHARACTER_HEIGHT,
  CHARACTER_WIDTH,
  GAME_FPS,
  HALF_CHARACTER_WIDTH,
} from '../consts';
import { GfxType, loadBitmapById } from '../gfx';
import { renderCharacterBoots } from '../render/character-boots';
import { renderCharacterHair } from '../render/character-hair';
import { renderCharacterHairBehind } from '../render/character-hair-behind';
import { renderCharacterStanding } from '../render/character-standing';
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

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      renderCharacterHairBehind(mapInfo, this.ctx, 0, false, false);
      renderCharacterStanding(mapInfo, this.ctx);
      renderCharacterHair(mapInfo, this.ctx, 0, false, false);
      renderCharacterBoots(mapInfo, this.ctx, 0, false, false);

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
    loadBitmapById(GfxType.PostLoginUI, 32);
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

  constructor() {
    super();

    this.canvas = document.createElement('canvas');
    const w = CHARACTER_WIDTH + 40;
    const h = CHARACTER_HEIGHT + 40;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');

    setCharacterRectangle(
      1,
      new Rectangle(
        {
          x: w / 2 - HALF_CHARACTER_WIDTH,
          y: 20,
        },
        CHARACTER_WIDTH,
        CHARACTER_HEIGHT,
      ),
    );

    this.btnCreate.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);

      if (this.characters.length >= 3) {
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
