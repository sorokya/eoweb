import type { CharacterSelectionListEntry } from 'eolib';
import mitt from 'mitt';
import { CharacterFrame } from '../atlas';
import type { Client } from '../client';
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, GAME_FPS } from '../consts';
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

    let index = 0;
    for (const character of this.characters) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const frame = this.client.atlas.getCharacterFrame(
        character.id,
        CharacterFrame.StandingDownRight,
      );
      if (!frame) {
        index++;
        continue;
      }

      const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
      if (!atlas) {
        index++;
        continue;
      }

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
      window.requestAnimationFrame(this.render.bind(this));
      return;
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
