import { TICKS_PER_CAST_TIME } from '../consts';
import { CharacterAnimation } from './character-base-animation';

export class CharacterSpellChantAnimation extends CharacterAnimation {
  spellId: number;
  chant: string;

  constructor(spellId: number, chant: string, castTime: number) {
    super();
    this.spellId = spellId;
    this.chant = chant;
    this.ticks = castTime * TICKS_PER_CAST_TIME - 1;
  }

  tick(): void {
    if (this.ticks === 0 || !this.renderedFirstFrame) {
      return;
    }

    this.ticks = Math.max(this.ticks - 1, 0);

    // animation frame should alternate between 0 and 1 every 2 ticks
    this.animationFrame = Math.floor((this.ticks % 4) / 2);
  }
}
