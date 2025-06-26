import { GfxType, getBitmapById } from '../gfx';
import type { Vector2 } from '../vector';

const EMPTY_BACKGROUND_START = 28;
const BLACK_BACKGROUND_START = 56;
const GREEN_BAR_START = 35;
const NUMBER_WIDTH = 9;
const NUMBER_HEIGHT = 12;
const HEALTH_BAR_WIDTH = 40;
const HEALTH_BAR_HEIGHT = 7;
const MISS_RECT = { x: 132, y: 28, width: 30, height: 11 };

export class HealthBar {
  percentage: number;
  damage: number;
  ticks = 9;
  textCanvas = document.createElement('canvas');
  textCtx = this.textCanvas.getContext('2d');

  constructor(percentage: number, damage: number) {
    this.percentage = percentage;
    this.damage = damage;
  }

  tick() {
    this.ticks = Math.max(this.ticks - 1, 0);
  }

  render(position: Vector2, ctx: CanvasRenderingContext2D) {
    const x = position.x - HEALTH_BAR_WIDTH / 2;
    const y = position.y - HEALTH_BAR_HEIGHT;
    const bmp = getBitmapById(GfxType.PostLoginUI, 58);
    if (!bmp) {
      return;
    }

    const hpWidth = Math.floor(HEALTH_BAR_WIDTH * (this.percentage / 100));

    ctx.drawImage(
      bmp,
      0,
      BLACK_BACKGROUND_START,
      HEALTH_BAR_WIDTH,
      HEALTH_BAR_HEIGHT,
      x,
      y,
      HEALTH_BAR_WIDTH,
      HEALTH_BAR_HEIGHT,
    );
    ctx.drawImage(
      bmp,
      0,
      GREEN_BAR_START,
      hpWidth,
      HEALTH_BAR_HEIGHT,
      x,
      y,
      hpWidth,
      HEALTH_BAR_HEIGHT,
    );

    if (!this.damage) {
      ctx.drawImage(
        bmp,
        MISS_RECT.x,
        MISS_RECT.y,
        MISS_RECT.width,
        MISS_RECT.height,
        position.x - MISS_RECT.width / 2,
        y - 25 + this.ticks,
        MISS_RECT.width,
        MISS_RECT.height,
      );
      return;
    }

    const damageAsText = this.damage.toString();
    const chars = damageAsText.split('');
    this.textCanvas.width = chars.length * NUMBER_WIDTH;
    this.textCanvas.height = NUMBER_HEIGHT;

    this.textCtx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);

    let index = 0;
    for (const char of chars) {
      const number = Number.parseInt(char, 10);
      this.textCtx.drawImage(
        bmp,
        HEALTH_BAR_WIDTH + number * NUMBER_WIDTH,
        EMPTY_BACKGROUND_START,
        NUMBER_WIDTH,
        NUMBER_HEIGHT,
        index * NUMBER_WIDTH,
        0,
        NUMBER_WIDTH,
        NUMBER_HEIGHT,
      );
      index++;
    }

    ctx.drawImage(
      this.textCanvas,
      position.x - this.textCanvas.width / 2,
      y - 25 + this.ticks,
    );
  }
}
