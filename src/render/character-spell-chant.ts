import { StaticAtlasEntryType } from '../atlas';
import type { Client } from '../client';
import { TICKS_PER_CAST_TIME } from '../consts';
import type { Vector2 } from '../vector';
import { CharacterAnimation } from './character-base-animation';

export class CharacterSpellChantAnimation extends CharacterAnimation {
  spellId: number;
  chant: string;
  private rendered = false;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(spellId: number, chant: string, castTime: number) {
    super();
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

  render(client: Client, position: Vector2, ctx: CanvasRenderingContext2D) {
    if (!this.rendered) {
      const frame = client.atlas.getStaticEntry(StaticAtlasEntryType.Sans11);
      if (!frame) {
        return;
      }

      const atlas = client.atlas.getAtlas(frame.atlasIndex);
      if (!atlas) {
        return;
      }

      const chars = this.chant
        .split('')
        .map((c) => client.sans11.getCharacter(c.charCodeAt(0)));

      const width = chars.reduce(
        (sum, char) => sum + (char ? char.width : 0),
        0,
      );

      const height = Math.max(...chars.map((char) => (char ? char.height : 0)));

      const shadowCanvas = document.createElement('canvas');
      const shadowCtx = shadowCanvas.getContext('2d');
      shadowCanvas.width = width;
      shadowCanvas.height = height;

      let x = 0;
      for (const char of chars) {
        if (char) {
          shadowCtx.drawImage(
            atlas,
            frame.x + char.x,
            frame.y + char.y,
            char.width,
            char.height,
            x,
            0,
            char.width,
            char.height,
          );
        }
        x += char.width;
      }

      shadowCtx.globalCompositeOperation = 'source-in';
      shadowCtx.fillStyle = 'black';
      shadowCtx.fillRect(0, 0, shadowCanvas.width, shadowCanvas.height);

      this.canvas.width = width + 1;
      this.canvas.height = height + 1;
      this.ctx.drawImage(shadowCanvas, 1, 1);

      x = 0;
      for (const char of chars) {
        if (char) {
          this.ctx.drawImage(
            atlas,
            frame.x + char.x,
            frame.y + char.y,
            char.width,
            char.height,
            x,
            0,
            char.width,
            char.height,
          );
        }
        x += char.width;
      }

      this.rendered = true;
    }

    ctx.drawImage(
      this.canvas,
      Math.floor(position.x - this.canvas.width / 2),
      Math.floor(position.y - this.canvas.height - 4),
    );
  }
}
