import type { Gender } from 'eolib';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';
import mitt from 'mitt';

const MAX_GENDER = 2;
const MAX_HAIR_STYLE = 20;
const MAX_HAIR_COLOR = 10;
const MAX_SKIN = 4;

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

  gender = 0;
  hairStyle = 0;
  hairColor = 0;
  skin = 0;

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  show() {
    this.cover.classList.remove('hidden');
    this.container.classList.remove('hidden');
    this.container.style.left = `${Math.floor(window.innerWidth / 2 - this.container.clientWidth / 2)}px`;
    this.container.style.top = `${Math.floor(window.innerHeight / 2 - this.container.clientHeight / 2)}px`;
  }

  hide() {
    this.container.classList.add('hidden');
    this.cover.classList.add('hidden');
  }

  private updateIcons() {
    this.lblGender.style.backgroundPositionX = `-${this.gender * 23}px`;
    this.lblHairStyle.style.backgroundPositionX = `-${this.hairStyle * 23}px`;
    this.lblHairColor.style.backgroundPositionX = `-${this.hairColor * 23}px`;
    this.lblSkin.style.backgroundPositionX = `-${this.skin * 23 + 46}px`;
  }

  constructor() {
    super();
    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
      this.cover.classList.add('hidden');
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
        hairStyle: this.hairStyle,
        hairColor: this.hairColor,
        skin: this.skin,
      });

      return false;
    });

    this.btnToggleGender.addEventListener('click', () => {
      playSfxById(SfxId.TextBoxFocus);
      this.gender = incrementOrWrap(this.gender, MAX_GENDER);
      this.updateIcons();
    });

    this.btnToggleHairStyle.addEventListener('click', () => {
      playSfxById(SfxId.TextBoxFocus);
      this.hairStyle = incrementOrWrap(this.hairStyle, MAX_HAIR_STYLE);
      this.updateIcons();
    });

    this.btnToggleHairColor.addEventListener('click', () => {
      playSfxById(SfxId.TextBoxFocus);
      this.hairColor = incrementOrWrap(this.hairColor, MAX_HAIR_COLOR);
      this.updateIcons();
    });

    this.btnToggleSkin.addEventListener('click', () => {
      playSfxById(SfxId.TextBoxFocus);
      this.skin = incrementOrWrap(this.skin, MAX_SKIN);
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
