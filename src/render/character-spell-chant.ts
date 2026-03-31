import { CanvasSource, Sprite, Texture } from 'pixi.js';
import { TICKS_PER_CAST_TIME } from '../consts';
import { type Font, TextAlign } from '../fonts/base';
import type { Vector2 } from '../vector';
import { Animation } from './animation';

export class CharacterSpellChantAnimation extends Animation {
  spellId: number;
  chant: string;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private font: Font;

  private source: CanvasSource | null = null;
  private texture: Texture | null = null;

  constructor(font: Font, spellId: number, chant: string, castTime: number) {
    super();
    this.font = font;
    this.spellId = spellId;
    this.chant = chant;
    this.ticks = castTime * TICKS_PER_CAST_TIME - 1;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;

    console.log('New Chant', this);
  }

  tick(): void {
    console.log('Chant tick', this);
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

      this.renderedFirstFrame = true;
    }
  }

  getSprite(position: Vector2): Sprite | null {
    if (!this.renderedFirstFrame) {
      this.render();
    }
    if (!this.source) {
      this.source = new CanvasSource({ resource: this.canvas });
      this.texture = new Texture({ source: this.source });
    }
    const sprite = new Sprite(this.texture!);
    sprite.x = Math.floor(position.x - (this.canvas.width >> 1));
    sprite.y = Math.floor(position.y - this.canvas.height - 4);
    return sprite;
  }
}
