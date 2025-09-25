import { type CharacterMapInfo, Direction, Gender } from 'eolib';
import mitt from 'mitt';
import { CharacterFrame } from '../atlas';
import type { Client } from '../client';
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, GAME_FPS } from '../consts';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';

const MAX_GENDER = 2;
const MAX_HAIR_STYLE = 20;
const MAX_HAIR_COLOR = 10;
const MAX_SKIN = 4;
let lastTime: DOMHighResTimeStamp | undefined;

type Events = {
  create: {
    name: string;
    gender: Gender;
    hairStyle: number;
    hairColor: number;
    skin: number;
  };
};

export class CreateCharacterForm extends Base {
  protected container = document.getElementById('create-character-form');
  private emitter = mitt<Events>();
  private cover = document.getElementById('cover');
  private form: HTMLFormElement = this.container.querySelector('form');
  private preview: HTMLImageElement = this.container.querySelector(
    '#create-character-preview',
  );
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private name: HTMLInputElement = this.container.querySelector(
    '#create-character-name',
  );
  private btnCancel: HTMLButtonElement = this.container.querySelector(
    'button[data-id="cancel"]',
  );
  private btnToggleGender: HTMLButtonElement = this.container.querySelector(
    'button[data-toggle="gender"]',
  );
  private lblGender: HTMLDivElement = this.container.querySelector(
    'div[data-id="gender"]',
  );
  private btnToggleHairStyle: HTMLButtonElement = this.container.querySelector(
    'button[data-toggle="hair-style"]',
  );
  private lblHairStyle: HTMLDivElement = this.container.querySelector(
    'div[data-id="hair-style"]',
  );
  private btnToggleHairColor: HTMLButtonElement = this.container.querySelector(
    'button[data-toggle="hair-color"]',
  );
  private lblHairColor: HTMLDivElement = this.container.querySelector(
    'div[data-id="hair-color"]',
  );
  private btnToggleSkin: HTMLButtonElement = this.container.querySelector(
    'button[data-toggle="skin"]',
  );
  private lblSkin: HTMLDivElement = this.container.querySelector(
    'div[data-id="skin"]',
  );
  private character: CharacterMapInfo | undefined;
  private client: Client;

  private gender = 0;
  private hairStyle = 0;
  private hairColor = 0;
  private skin = 0;
  private open = false;
  isOpen(): boolean {
    return this.open;
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
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

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const downRight = [Direction.Down, Direction.Right].includes(
      this.character.direction,
    );

    const frame = this.client.atlas.getCharacterFrame(
      this.client.playerId,
      downRight
        ? CharacterFrame.StandingDownRight
        : CharacterFrame.StandingUpLeft,
    );
    if (!frame) {
      return;
    }

    const atlas = this.client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    const mirrored = [Direction.Right, Direction.Up].includes(
      this.character.direction,
    );

    if (mirrored) {
      this.ctx.save();
      this.ctx.scale(-1, 1);
      this.ctx.translate(-this.canvas.width, 0);
    }

    this.ctx.drawImage(
      atlas,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      Math.floor(
        (this.canvas.width >> 1) +
          (mirrored ? frame.mirroredXOffset : frame.xOffset),
      ),
      this.canvas.height + frame.yOffset,
      frame.w,
      frame.h,
    );

    if (mirrored) {
      this.ctx.restore();
    }

    this.preview.src = this.canvas.toDataURL();

    if (this.open) {
      window.requestAnimationFrame((now) => {
        this.render(now);
      });
    }
  }

  show() {
    this.cover.classList.remove('hidden');
    this.container.classList.remove('hidden');
    this.container.style.left = `${Math.floor(window.innerWidth / 2 - this.container.clientWidth / 2)}px`;
    this.container.style.top = `${Math.floor(window.innerHeight / 2 - this.container.clientHeight / 2)}px`;
    this.name.value = '';
    this.character = this.client.getCharacterById(this.client.playerId);
    this.character.gender = Gender.Female;
    this.character.skin = 0;
    this.character.direction = Direction.Down;
    this.character.hairStyle = 1;
    this.character.hairColor = 0;
    this.gender = 0;
    this.hairStyle = 0;
    this.hairColor = 0;
    this.skin = 0;
    this.open = true;
    this.updateIcons();
    this.client.atlas.refresh();
    window.requestAnimationFrame((now) => {
      this.render(now);
    });
  }

  hide() {
    this.container.classList.add('hidden');
    this.cover.classList.add('hidden');
    this.open = false;
  }

  private updateIcons() {
    this.lblGender.style.backgroundPositionX = `-${this.gender * 23}px`;
    this.lblHairStyle.style.backgroundPositionX = `-${this.hairStyle * 23}px`;
    this.lblHairColor.style.backgroundPositionX = `-${this.hairColor * 23}px`;
    this.lblSkin.style.backgroundPositionX = `-${this.skin * 23 + 46}px`;
  }

  constructor(client: Client) {
    super();

    this.client = client;

    this.canvas = document.createElement('canvas');
    this.canvas.width = CHARACTER_WIDTH + 40;
    this.canvas.height = CHARACTER_HEIGHT + 40;
    this.ctx = this.canvas.getContext('2d');

    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
      this.cover.classList.add('hidden');
    });

    this.preview.addEventListener('click', () => {
      switch (this.character.direction) {
        case Direction.Up:
          this.character.direction = Direction.Right;
          break;
        case Direction.Down:
          this.character.direction = Direction.Left;
          break;
        case Direction.Left:
          this.character.direction = Direction.Up;
          break;
        case Direction.Right:
          this.character.direction = Direction.Down;
          break;
      }
    });

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      playSfxById(SfxId.ButtonClick);

      const name = this.name.value.trim().toLowerCase();
      if (!name) {
        return false;
      }

      this.emitter.emit('create', {
        name,
        gender: this.gender as Gender,
        hairStyle: this.hairStyle + 1,
        hairColor: this.hairColor,
        skin: this.skin,
      });

      return false;
    });

    this.btnToggleGender.addEventListener('click', () => {
      playSfxById(SfxId.TextBoxFocus);
      this.gender = incrementOrWrap(this.gender, MAX_GENDER);
      this.character.gender = this.gender as Gender;
      this.updateIcons();
      this.client.atlas.refresh();
    });

    this.btnToggleHairStyle.addEventListener('click', () => {
      playSfxById(SfxId.TextBoxFocus);
      this.hairStyle = incrementOrWrap(this.hairStyle, MAX_HAIR_STYLE);
      this.character.hairStyle = this.hairStyle + 1;
      this.updateIcons();
      this.client.atlas.refresh();
    });

    this.btnToggleHairColor.addEventListener('click', () => {
      playSfxById(SfxId.TextBoxFocus);
      this.hairColor = incrementOrWrap(this.hairColor, MAX_HAIR_COLOR);
      this.character.hairColor = this.hairColor;
      this.updateIcons();
      this.client.atlas.refresh();
    });

    this.btnToggleSkin.addEventListener('click', () => {
      playSfxById(SfxId.TextBoxFocus);
      this.skin = incrementOrWrap(this.skin, MAX_SKIN);
      this.character.skin = this.skin;
      this.updateIcons();
      this.client.atlas.refresh();
    });
  }
}

function incrementOrWrap(value: number, max: number): number {
  let result = value + 1;
  if (result >= max) {
    result = 0;
  }

  return result;
}
