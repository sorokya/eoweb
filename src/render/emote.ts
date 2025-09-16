import { type CharacterMapInfo, Emote as EmoteType } from 'eolib';
import { getCharacterRectangle } from '../collision';
import { EMOTE_ANIMATION_FRAMES, EMOTE_ANIMATION_TICKS } from '../consts';
import { GfxType, getBitmapById } from '../gfx';

const EMOTE_POSITION = {
  [EmoteType.Happy]: 0,
  [EmoteType.Sad]: 1,
  [EmoteType.Surprised]: 2,
  [EmoteType.Confused]: 3,
  [EmoteType.Moon]: 4,
  [EmoteType.Angry]: 5,
  [EmoteType.Hearts]: 6,
  [EmoteType.Depressed]: 7,
  [EmoteType.Embarrassed]: 8,
  [EmoteType.Suicidal]: 9,
  [EmoteType.Drunk]: 10,
  [EmoteType.Trade]: 11,
  [EmoteType.LevelUp]: 12,
  [EmoteType.Playful]: 13,
};

export class Emote {
  ticks = EMOTE_ANIMATION_TICKS;
  type: EmoteType;
  animationFrame = 0;

  constructor(type: EmoteType) {
    this.type = type;
  }

  tick() {
    if (!this.ticks) {
      return;
    }

    this.animationFrame = EMOTE_ANIMATION_FRAMES - Math.ceil(this.ticks / 2);
    this.ticks = Math.max(this.ticks - 1, 0);
  }

  render(character: CharacterMapInfo, ctx: CanvasRenderingContext2D) {
    const bmp = getBitmapById(GfxType.PostLoginUI, 38);
    if (!bmp) {
      return;
    }

    const rect = getCharacterRectangle(character.playerId);
    if (!rect) {
      return;
    }

    const sourceX =
      EMOTE_POSITION[this.type as number] * 50 * EMOTE_ANIMATION_FRAMES +
      this.animationFrame * 50;

    ctx.globalAlpha = this.ticks / EMOTE_ANIMATION_TICKS;

    ctx.drawImage(
      bmp,
      sourceX,
      0,
      50,
      50,
      rect.position.x + rect.width / 2 - 25,
      rect.position.y - 50,
      50,
      50,
    );

    ctx.globalAlpha = 1;
  }
}
