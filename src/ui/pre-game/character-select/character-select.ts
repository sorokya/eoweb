import {
  CharacterMapInfo,
  type CharacterSelectionListEntry,
  Direction,
  EquipmentMapInfo,
  ThreeItem,
} from 'eolib';
import { CharacterFrame } from '../../../atlas';
import type { Client } from '../../../client';
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, GAME_FPS } from '../../../consts';
import { DialogResourceID } from '../../../edf';
import { playSfxById, SfxId } from '../../../sfx';
import { capitalize } from '../../../utils/capitalize';
import { Base } from '../../base-ui';
import { Button } from '../../shared/button';
import classes from './character-select.module.css';

let lastTime: DOMHighResTimeStamp | undefined;

class CharacterEntry {
  el: HTMLDivElement;
  preview: HTMLImageElement;
  name: HTMLDivElement;
  level: HTMLDivElement;
  icon: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = classes.character;

    this.preview = document.createElement('img');
    this.preview.src = '';
    this.el.appendChild(this.preview);

    this.name = document.createElement('div');
    this.name.className = classes.name;
    this.el.appendChild(this.name);

    this.level = document.createElement('div');
    this.level.className = classes.level;
    this.el.appendChild(this.level);

    this.icon = document.createElement('div');
    this.icon.className = classes.icon;
    this.el.appendChild(this.icon);

    parent.appendChild(this.el);
  }
}

export class CharacterSelect extends Base {
  public declare el: HTMLElement;
  private btnCreate: HTMLButtonElement;
  private btnPassword: HTMLButtonElement;
  private btnCancel: HTMLButtonElement;
  private characters: CharacterEntry[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  confirmed = false;

  private client: Client;

  show() {
    super.show();
    for (const el of this.el.querySelectorAll('.preview')) {
      const image = el as HTMLImageElement;
      image.src = '';
    }
    window.requestAnimationFrame(this.render.bind(this));
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

    for (const [index, character] of this.characters.entries()) {
      const data: CharacterSelectionListEntry | undefined =
        this.client.characters[index];

      character.name.innerText = capitalize(data?.name || '');
      character.icon.setAttribute('data-id', (data?.admin || 0).toString());
      character.level.innerText = data?.level.toString() || '';

      if (!data) {
        continue;
      }

      const frame = this.client.atlas.getCharacterFrame(
        this.client.playerId + index + 1,
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

      character.preview.src = this.canvas.toDataURL();
    }

    if (!this.hidden) {
      window.requestAnimationFrame(this.render.bind(this));
      return;
    }
  }

  constructor(parent: HTMLElement, client: Client) {
    super();

    this.client = client;

    this.canvas = document.createElement('canvas');
    const w = CHARACTER_WIDTH + 40;
    const h = CHARACTER_HEIGHT + 40;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');

    this.el = document.createElement('div');
    this.el.className = classes['character-select'];

    const characterList = document.createElement('div');
    characterList.className = classes['character-list'];

    for (let i = 0; i < 3; ++i) {
      const character = new CharacterEntry(characterList);
      this.characters.push(character);
    }

    this.el.appendChild(characterList);

    const buttonRow = document.createElement('div');
    buttonRow.className = classes['button-row'];

    this.btnCreate = new Button('Create', buttonRow, 'button', 'large');
    this.btnCreate.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);

      if (this.client.characters.length >= 3) {
        const text = this.client.getDialogStrings(
          DialogResourceID.CHARACTER_CREATE_TOO_MANY_CHARS,
        );
        this.client.showAlert(text[0], text[1]);
        return;
      }

      // Show create
    });

    this.btnPassword = new Button('Password', buttonRow, 'button', 'large');
    this.btnPassword.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      // Show password
    });

    this.btnCancel = new Button('Cancel', buttonRow, 'button', 'large');
    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      // Show something
    });

    this.el.appendChild(buttonRow);
    parent.appendChild(this.el);
  }
}
