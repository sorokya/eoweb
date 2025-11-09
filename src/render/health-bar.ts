export class HealthBar {
  percentage: number;
  damage: number;
  heal: number;
  ticks = 4;

  constructor(percentage: number, damage: number, heal = 0) {
    this.percentage = percentage;
    this.damage = damage;
    this.heal = heal;
  }

  tick() {
    this.ticks = Math.max(this.ticks - 1, 0);
  }
}
