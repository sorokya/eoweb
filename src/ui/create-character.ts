import { CharacterMapInfo, Direction, Gender } from 'eolib';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';
import mitt from 'mitt';
import {
  CHARACTER_HEIGHT,
  CHARACTER_WIDTH,
  GAME_FPS,
  HALF_CHARACTER_WIDTH,
} from '../consts';
import { renderCharacterStanding } from '../render/character-standing';
import { Rectangle, setCharacterRectangle } from '../collision';
import { renderCharacterHairBehind } from '../render/character-hair-behind';
import { renderCharacterHair } from '../render/character-hair';

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
  private character: CharacterMapInfo;

  private gender = 0;
  private hairStyle = 0;
  private hairColor = 0;
  private skin = 0;
  private open = false;

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
    renderCharacterHairBehind(this.character, this.ctx, 0, false, false);
    renderCharacterStanding(this.character, this.ctx);
    renderCharacterHair(this.character, this.ctx, 0, false, false);
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

  constructor() {
    super();

    this.canvas = document.createElement('canvas');
    this.canvas.width = CHARACTER_WIDTH + 40;
    this.canvas.height = CHARACTER_HEIGHT + 40;
    this.ctx = this.canvas.getContext('2d');

    setCharacterRectangle(
      0,
      new Rectangle(
        { x: this.canvas.width / 2 - HALF_CHARACTER_WIDTH, y: 20 },
        CHARACTER_WIDTH,
        CHARACTER_HEIGHT,
      ),
    );

    this.character = new CharacterMapInfo();
    this.character.playerId = 0;
    this.character.gender = Gender.Female;
    this.character.skin = 0;
    this.character.direction = Direction.Down;
    this.character.hairStyle = 1;
    this.character.hairColor = 0;

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
    });

    this.btnToggleHairStyle.addEventListener('click', () => {
      playSfxById(SfxId.TextBoxFocus);
      this.hairStyle = incrementOrWrap(this.hairStyle, MAX_HAIR_STYLE);
      this.character.hairStyle = this.hairStyle + 1;
      this.updateIcons();
    });

    this.btnToggleHairColor.addEventListener('click', () => {
      playSfxById(SfxId.TextBoxFocus);
      this.hairColor = incrementOrWrap(this.hairColor, MAX_HAIR_COLOR);
      this.character.hairColor = this.hairColor;
      this.updateIcons();
    });

    this.btnToggleSkin.addEventListener('click', () => {
      playSfxById(SfxId.TextBoxFocus);
      this.skin = incrementOrWrap(this.skin, MAX_SKIN);
      this.character.skin = this.skin;
      this.updateIcons();
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
