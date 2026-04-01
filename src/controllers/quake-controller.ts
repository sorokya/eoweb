import { randomRange } from '@/utils';

export class QuakeController {
  quakeTicks = 0;
  quakePower = 0;
  quakeOffset = 0;

  tick(): void {
    if (!this.quakeTicks) {
      return;
    }

    this.quakeTicks = Math.max(this.quakeTicks - 1, 0);
    if (this.quakePower) {
      this.quakeOffset = randomRange(0, this.quakePower);
    } else {
      this.quakeOffset = 0;
    }

    if (Math.random() < 0.5) {
      this.quakeOffset = -this.quakeOffset;
    }

    if (!this.quakeTicks) {
      this.quakeOffset = 0;
    }
  }
}
