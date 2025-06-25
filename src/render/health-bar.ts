import { getBitmapById, GfxType } from '../gfx';
import type { Vector2 } from '../vector';

const BLACK_BACKGROUND_START = 56;
const GREEN_BAR_START = 35;

export class HealthBar {
  percentage: number;
  damage: number;
  ticks: number = 24;
  width: number = 40;
  height: number = 7;

  constructor(percentage: number, damage: number) {
    this.percentage = percentage;
    this.damage = damage;
  }

  tick() {
    this.ticks = Math.max(this.ticks - 1, 0);
  }

  render(position: Vector2, ctx: CanvasRenderingContext2D) {
    const x = position.x - this.width / 2;
    const y = position.y - this.height;
    const bmp = getBitmapById(GfxType.PostLoginUI, 58);
    if (!bmp) {
      return;
    }

    const hpWidth = Math.floor(this.width * (this.percentage / 100));

    ctx.drawImage(bmp, 0, BLACK_BACKGROUND_START, this.width, this.height, x, y, this.width, this.height);
    ctx.drawImage(bmp, 0, GREEN_BAR_START, hpWidth, this.height, x, y, hpWidth, this.height);
  }
}

