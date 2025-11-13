import { TICKS_PER_CAST_TIME } from '../consts';
import { type Font, TextAlign } from '../fonts/base';
import type { Vector2 } from '../vector';
import { CharacterAnimation } from './character-base-animation';

export class CharacterSpellChantAnimation extends CharacterAnimation {
  spellId: number;
  chant: string;
  private rendered = false;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private font: Font;

  constructor(font: Font, spellId: number, chant: string, castTime: number) {
    super();
    this.font = font;
    this.spellId = spellId;
    this.chant = chant;
    this.ticks = castTime * TICKS_PER_CAST_TIME - 1;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  tick(): void {
    if (this.ticks === 0 || !this.renderedFirstFrame) {
      return;
    }

    this.ticks = Math.max(this.ticks - 1, 0);

    // animation frame should alternate between 0 and 1 every 2 ticks
    this.animationFrame = Math.floor((this.ticks % 4) / 2);
  }

  render(position: Vector2, ctx: CanvasRenderingContext2D) {
    if (!this.rendered) {
      const { width, height } = this.font.measureText(this.chant);
      this.canvas.width = width + 1;
      this.canvas.height = height + 1;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.font.render(
        this.ctx,
        this.chant,
        { x: 1, y: 1 },
        '#000',
        TextAlign.None,
      );
      this.font.render(
        this.ctx,
        this.chant,
        { x: 0, y: 0 },
        '#fff',
        TextAlign.None,
      );

      this.rendered = true;
    }

    ctx.drawImage(
      this.canvas,
      Math.floor(position.x - this.canvas.width / 2),
      Math.floor(position.y - this.canvas.height - 4),
    );
  }
}
