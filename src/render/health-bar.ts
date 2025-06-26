import { getBitmapById, GfxType } from '../gfx';
import type { Vector2 } from '../vector';

const EMPTY_BACKGROUND_START = 28;
const BLACK_BACKGROUND_START = 56;
const GREEN_BAR_START = 35;
const NUMBER_WIDTH = 9;
const NUMBER_HEIGHT = 12;
const HEALTH_BAR_WIDTH = 40;
const HEALTH_BAR_HEIGHT = 7;

export class HealthBar {
  percentage: number;
  damage: number;
  ticks: number = 24;

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

    ctx.drawImage(bmp, 0, BLACK_BACKGROUND_START, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, x, y, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);
    ctx.drawImage(bmp, 0, GREEN_BAR_START, hpWidth, HEALTH_BAR_HEIGHT, x, y, hpWidth, HEALTH_BAR_HEIGHT);

    const damageAsText = this.damage.toString();
    for (let i = 0; i < damageAsText.length; i++) {
      const numberBmp = getBitmapById(GfxType.PostLoginUI, 58);
      const parsedNumber = parseInt(damageAsText[i], 10);
      ctx.drawImage(numberBmp, HEALTH_BAR_WIDTH + (parsedNumber * NUMBER_WIDTH), EMPTY_BACKGROUND_START, NUMBER_WIDTH, NUMBER_HEIGHT, x + HEALTH_BAR_WIDTH - (damageAsText.length - i) * NUMBER_WIDTH, y - 12, NUMBER_WIDTH, NUMBER_HEIGHT);
    }
  }
}

