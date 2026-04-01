import { TICKS_PER_CAST_TIME } from '@/consts';
import type { Font } from '@/fonts';
import { Animation } from './animation';

export class CharacterSpellChantAnimation extends Animation {
  spellId: number;
  chant: string;
  readonly font: Font;
  private layout: { width: number; height: number } | null = null;

  constructor(font: Font, spellId: number, chant: string, castTime: number) {
    super();
    this.font = font;
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

  render() {
    if (!this.renderedFirstFrame) {
      const { width, height } = this.font.measureText(this.chant);
      this.layout = { width: width + 1, height: height + 1 };
      this.renderedFirstFrame = true;
    }
  }

  getLayout(): { width: number; height: number } {
    if (!this.layout) {
      this.render();
    }
    return this.layout!;
  }
}
